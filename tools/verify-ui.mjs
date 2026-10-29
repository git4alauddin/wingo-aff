// Zero-dependency integration checks using an isolated headless Chrome/Edge profile.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { startServer } from './serve.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const executable = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(value => value && fs.existsSync(value));
if (!executable) throw new Error('Set CHROME_PATH or install Chrome/Edge to run browser checks.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wingo-ui-'));
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--mute-audio', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let diagnostics = '';
browser.stderr.on('data', chunk => { diagnostics += chunk; });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, server, requestId = 0;
const pending = new Map(), errors = [];
try {
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port;
  for (let i = 0; i < 100; i++) {
    try { const value = fs.readFileSync(portFile, 'utf8').split('\n')[0]; if (/^\d+$/.test(value)) { port = value; break; } } catch {}
    await delay(100);
  }
  if (!port) throw new Error(`Browser debug port unavailable. ${diagnostics}`);
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl.replace('localhost', '127.0.0.1'));
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (!message.id) return;
    const callback = pending.get(message.id); if (!callback) return;
    pending.delete(message.id);
    if (message.error) callback.reject(new Error(message.error.message)); else callback.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++requestId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}\n${diagnostics.slice(-3000)}`)); }, 10000);
    pending.set(id, { resolve(value) { clearTimeout(timeout); resolve(value); }, reject(error) { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await delay(50); }
    throw new Error(`Condition not reached: ${expression}\nState: ${await evaluate("JSON.stringify({url:location.href,ready:document.readyState,hidden:document.hidden,progress:document.querySelector('[data-progress-value]')?.textContent})")}\n${errors.join('\n')}`);
  };
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const fill = (selector, value) => evaluate(`document.querySelector(${JSON.stringify(selector)}).value=${JSON.stringify(value)}`);
  const center = selector => evaluate(`(() => {const rect=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};})()`);
  const touch = (type, point) => send('Input.dispatchTouchEvent', {type,touchPoints:type==='touchEnd'?[]:[{...point,radiusX:2,radiusY:2,force:1,id:1}]});
  const screenshot = async (name, fullPage = false) => {
    await delay(/prediction|result-win|result-loss/.test(name) && !name.includes('spinning') ? 750 : 100);
    const clip = fullPage ? await evaluate('({x:0,y:0,width:innerWidth,height:document.documentElement.scrollHeight,scale:1})') : undefined;
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: fullPage, ...(clip ? {clip} : {}) });
    fs.mkdirSync(path.join(root, 'preview'), { recursive: true });
    fs.writeFileSync(path.join(root, 'preview', `${name}.png`), Buffer.from(result.data, 'base64'));
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Page.bringToFront');
  await send('Network.setBlockedURLs', { urls: ['*dmfirst0.com*'] });
  // Keep the simulation clock deterministic without adding controls to the app.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__domReady=false;document.addEventListener('DOMContentLoaded',()=>{window.__domReady=true},{once:true});window.__offset=0;Object.defineProperty(performance,'now',{value:()=>window.__offset});` });
  const advance = async milliseconds => { await evaluate(`window.__offset+=${milliseconds}`); await delay(200); };
  const revealedPrediction = () => evaluate("({period:document.querySelector('#predictPeriod').textContent.replace(/^Period /,''),numbers:document.querySelector('#predictResult').dataset.numbers.split(',').map(Number),size:document.querySelector('#predictResult').dataset.size,color:document.querySelector('#predictResult').dataset.color})");
  const settledResult = () => evaluate("(()=>{const row=document.querySelector('#historyRows tr');return {period:row.cells[0].textContent,number:Number(row.cells[1].textContent),size:row.cells[2].textContent,colors:row.cells[3].querySelector('[aria-label]').getAttribute('aria-label')}})()");
  const assertMatches = (prediction, result) => {
    assert.equal(result.period, prediction.period, 'Settlement belongs to the predicted period');
    assert.ok(prediction.numbers.includes(result.number), 'The upcoming result belongs to the revealed number pair');
    assert.equal(result.size, prediction.size);
    assert.ok(result.colors.includes(prediction.color), 'The upcoming result carries the predicted color');
  };
  server = await startServer(0); const base = `http://127.0.0.1:${server.address().port}`;
  const open = async (route, ready) => { await send('Page.navigate', { url: base + route }); await waitFor(`window.__domReady && (${ready})`); };
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await open('/?preview=1', "Number(document.querySelector('[data-progress-value]')?.textContent)>0");
  await screenshot('landing-initializing');
  await waitFor("document.documentElement.dataset.finished==='true'");
  assert.equal(await evaluate('location.pathname'), '/'); await screenshot('landing-desktop');
  assert.equal(await evaluate("document.querySelectorAll('[data-console-step].is-done').length"), 6);
  assert.equal(await evaluate("document.querySelectorAll('[data-status-tile].is-complete').length"), 4);
  assert.equal(await evaluate("document.querySelector('[role=progressbar]').getAttribute('aria-valuenow')"), '100');
  assert.equal(await evaluate("document.querySelector('[data-scene-digit]').textContent"), '7');
  assert.equal(await evaluate("!!document.querySelector('canvas#code-rain') && !!document.querySelector('.terminal-operator')"), true);
  for (const width of [393, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
    await evaluate('scrollTo(0,0)');
    await screenshot(`landing-mobile-${width}`, true);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, `${width}px terminal overflow`);
    assert.equal(await evaluate("document.querySelector('.game-title').scrollWidth<=document.querySelector('.game-title').clientWidth"), true, `${width}px title stays within the frame`);
  }
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await waitFor("document.documentElement.dataset.motion==='reduced'");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#code-rain')).display"), 'none');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.reticle-outer')).animationName"), 'none');
  await screenshot('landing-reduced-motion', true);
  await click('[data-wrapper-link]');
  await waitFor("location.pathname==='/registration.html' && window.__domReady");
  await send('Emulation.setEmulatedMedia', {features:[]});
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await open('/', "location.pathname==='/registration.html' && !!document.querySelector('#predictLauncher')");
  await waitFor("document.querySelector('#deposit-dialog')?.open");
  await screenshot('deposit-desktop');
  assert.equal(await evaluate("document.querySelector('[data-deposit-amount]').textContent"), '₹1,000');
  await click('[data-deposit-claim]');
  assert.match(await evaluate("document.querySelector('#dmfirst-frame').src"), /wallet\/Recharge/);
  await waitFor("!document.querySelector('[data-deposit-widget]').hidden");
  await click('[data-deposit-widget]');
  assert.equal(await evaluate("document.querySelector('[data-copy-code-section]').hidden"), false);
  await click('[data-copy-code-demo]'); await waitFor("document.querySelector('[data-copy-code-label]').textContent==='Complete'");
  await click('[data-dismiss-deposit]');
  await click('#predictLauncher');
  await screenshot('prediction-access-desktop');
  const accessTheme = (card, input, button) => evaluate(`[
    [${JSON.stringify(card)},['width','paddingTop','paddingLeft','backgroundImage','borderColor','borderRadius','boxShadow','fontFamily','color']],
    [${JSON.stringify(input)},['height','padding','backgroundColor','borderColor','borderRadius','fontFamily','fontSize','letterSpacing']],
    [${JSON.stringify(button)},['height','padding','backgroundImage','borderColor','borderRadius','fontFamily','fontSize','fontWeight']]
  ].map(([selector,properties])=>{const style=getComputedStyle(document.querySelector(selector));return properties.map(property=>style[property])})`);
  const visitorGateTheme = await accessTheme('#predictionDialog', '#predictCode', '#predictUnlock');
  assert.equal(await evaluate("document.querySelector('#predictionDialog').classList.contains('gate-card')"), true);
  for (const width of [393, 320]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:true});
    await screenshot(`prediction-access-mobile-${width}`);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, `${width}px access card overflow`);
    assert.equal(await evaluate("document.querySelector('#predictCode').getBoundingClientRect().width <= document.querySelector('#predictionDialog').clientWidth"), true);
  }
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await fill('#predictCode', 'wrong');
  await evaluate("document.querySelector('#predictCodeForm').requestSubmit()");
  assert.equal(await evaluate("document.querySelector('#predictionDialog').dataset.accessState"), 'opening');
  await waitFor("!document.querySelector('#predictCodeError').hidden");
  assert.equal(await evaluate("document.querySelector('#predictionDialog').dataset.accessState"), 'failed');
  await screenshot('prediction-access-error');
  await fill('#predictCode', 'DMFIRST'); await evaluate("document.querySelector('#predictCodeForm').requestSubmit()");
  await waitFor("!document.querySelector('#predictPreview').hidden");
  assert.equal(await evaluate("document.querySelector('#predictionDialog').classList.contains('gate-card')"), false, 'Access-card theme is scoped to the code gate');
  await click('#predictRun');
  assert.equal(await evaluate("document.querySelector('#predictResult').getAttribute('aria-busy')"), 'true');
  assert.equal(await evaluate("document.querySelectorAll('[data-reel-track]').length"), 4);
  await delay(400); await screenshot('prediction-spinning-desktop');
  await waitFor("document.querySelector('#predictResult').dataset.numbers==='1,3'");
  assert.equal(await evaluate("document.querySelector('#predictResult').dataset.size"), 'Small');
  assert.equal(await evaluate("document.querySelector('#predictResult').dataset.color"), 'Green');
  assert.equal(await evaluate("document.querySelector('[data-prediction-ready-banner]').hidden"), false);
  assert.equal(await evaluate("document.querySelectorAll('[data-reel-track] .prediction-reel-cell').length"), 4);
  await click('#predictRun'); await waitFor("document.querySelector('#predictResult').dataset.numbers==='2,4'");
  await screenshot('visitor-prediction');
  const predictionStyle = () => evaluate("[...document.querySelectorAll('#predictionDialog .prediction-result, #predictionDialog .prediction-trigger, #predictionDialog .deposit-header')].map(el=>{const s=getComputedStyle(el);return [s.width,s.height,s.color,s.backgroundColor,s.fontFamily,s.fontSize]})");
  const visitorStyle = await predictionStyle();
  assert.deepEqual(await evaluate("new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);image.onerror=reject;image.src='/assets/images/prediction-reference.png'})"), [1080,816]);
  await open('/creator-studio.html', "!!document.querySelector('#studioGateForm')");
  await screenshot('studio-access-desktop');
  assert.deepEqual(await accessTheme('#studioGate .gate-card', '#studioPassword', '#studioGateForm .primary'), visitorGateTheme, 'Visitor access and Studio password cards share the same theme');
  await fill('#studioPassword', 'bad'); await evaluate("document.querySelector('#studioGateForm').requestSubmit()");
  assert.equal(await evaluate("document.querySelector('#studioGateError').hidden"), false);
  await fill('#studioPassword', '@creator'); await evaluate("document.querySelector('#studioGateForm').requestSubmit()");
  await waitFor("!document.querySelector('#studioApp').hidden");
  assert.equal(await evaluate("!!document.querySelector('.creator-panel,.studio-toolbar,.studio-margin,#claimLauncher,#pause,#next,#nextOutcome')"), false, 'Studio contains only the game and prediction interface');
  assert.equal(await evaluate("document.querySelectorAll('.studio-float').length"), 1);
  assert.equal(await evaluate("document.querySelectorAll('#numberGrid button').length"), 10);
  await screenshot('studio-desktop');
  const noticeText = "document.querySelector('#announcementText .announcement-track>span').textContent";
  const welcomeNotice = 'Welcome to the DmFirst Games! Greetings and enjoy WinGo.';
  const officialNotice = 'Please be sure to always use our official website to play.';
  assert.equal(await evaluate(noticeText), welcomeNotice);
  await waitFor(`${noticeText}===${JSON.stringify(officialNotice)}`);
  await screenshot('announcement-official-desktop');
  await send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await waitFor(`${noticeText}===${JSON.stringify(welcomeNotice)}`);
  assert.equal(await evaluate("document.querySelector('.announcement-track').getAnimations().length"),0,'Reduced motion switches messages without sliding');
  await send('Emulation.setEmulatedMedia', {features:[]});
  for (const width of [393,320]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:true});
    await evaluate('scrollTo(0,0)');
    await screenshot(`game-controls-mobile-${width}`);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${width}px refined controls fit viewport`);
  }
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  // Selection sheets keep every choice on theme and preserve the stake calculation.
  for (const [choice, theme] of [['size:Small','small'],['number:9','green'],['color:Green','green'],['number:2','red'],['color:Red','red'],['color:Violet','violet'],['number:0','red'],['number:5','green'],['size:Big','big']]) {
    await click(`[data-selection="${choice}"]`);
    assert.equal(await evaluate("document.querySelector('#betDialog').dataset.theme"), theme);
    assert.equal(await evaluate("document.querySelector('#betTitle').textContent"), `Select ${choice.split(':')[1]}`);
    if (choice === 'size:Small') await screenshot('selection-small-desktop');
    await click('#betDialog [data-close]');
  }
  for (const width of [393,320]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:true});
    for (const [choice,name] of [['size:Small','small'],['number:9','number-green'],['color:Green','green'],['number:2','red'],['color:Violet','violet'],['size:Big','big']]) {
      await click(`[data-selection="${choice}"]`);
      assert.equal(await evaluate("(() => {const r=document.querySelector('#betDialog').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && Math.abs(r.bottom-innerHeight)<2 && r.top>=0;})()"),true,`${width}px selection sheet fits viewport`);
      await screenshot(`selection-${name}-mobile-${width}`);
      await click('#betDialog [data-close]');
    }
  }
  await click('[data-selection="color:Green"]');
  await click('[data-stake="100"]'); await click('[data-bet-quantity="5"]');
  assert.equal(await evaluate("document.querySelector('#betTotal').textContent"), '₹500.00');
  await click('#betIncrease');
  assert.equal(await evaluate("document.querySelector('#betTotal').textContent"), '₹600.00');
  await click('#betDecrease');
  assert.equal(await evaluate("document.querySelector('#betMultiplier').value"), '5');
  await fill('#betMultiplier','2'); await evaluate("document.querySelector('#betMultiplier').dispatchEvent(new Event('input'))");
  assert.equal(await evaluate("document.querySelector('#betTotal').textContent"), '₹200.00');
  await fill('#betMultiplier','0'); await evaluate("document.querySelector('#betForm').requestSubmit()");
  assert.equal(await evaluate("document.querySelector('#betError').hidden"),false);
  await click('[data-bet-quantity="1"]'); await click('#betAgree');
  await evaluate("document.querySelector('#betForm').requestSubmit()");
  assert.match(await evaluate("document.querySelector('#betError').textContent"),/Agree/);
  assert.equal(await evaluate("document.querySelector('#wallet').textContent"),'₹29,999.00','Invalid quantity and missing agreement leave balance unchanged');
  await click('#betRules');
  assert.equal(await evaluate("document.querySelector('#rulesDialog').open && !document.querySelector('#betDialog').open"),true);
  await click('#rulesDialog [data-close]');
  await click('[data-selection="color:Red"]');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
  await waitFor("!document.querySelector('#betDialog').open");
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await click('#predictLauncher'); await click('#predictRun');
  await waitFor("document.querySelector('#predictResult').dataset.numbers==='7,9'");
  assert.equal(await evaluate("document.querySelector('#predictAccess').hidden"), true);
  assert.deepEqual(await predictionStyle(), visitorStyle, 'Visitor and Studio use the same prediction styles');
  await click('#predictRun'); await waitFor("document.querySelector('#predictResult').dataset.numbers==='7,9' && document.querySelector('#predictResult').getAttribute('aria-busy')==='false'");
  const firstPrediction = await revealedPrediction();
  await screenshot('studio-prediction'); await click('#predictionDialog [data-close]');
  await click('[data-selection="number:7"]'); await evaluate("document.querySelector('#betForm').requestSubmit()");
  assert.equal(await evaluate("document.querySelector('#betDialog').open"), false);
  assert.equal(await evaluate("!document.querySelector('#toast').hidden && document.querySelector('#toast').textContent==='Bet Successful'"), true);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#toast')).backgroundColor"), 'rgba(0, 0, 0, 0.8)');
  await screenshot('bet-success-desktop');
  await send('Emulation.setDeviceMetricsOverride', {width:393,height:900,deviceScaleFactor:1,mobile:true});
  await screenshot('bet-success-mobile');
  assert.equal(await evaluate("(() => {const r=document.querySelector('#toast').getBoundingClientRect();return Math.abs(r.left+r.width/2-innerWidth/2)<1 && Math.abs(r.top+r.height/2-innerHeight/2)<1;})()"),true,'Success confirmation is centered');
  await waitFor("document.querySelector('#toast').hidden");
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  assert.equal(await evaluate("document.querySelector('#wallet').textContent"), '₹29,989.00');
  await advance(60000); await waitFor("document.querySelector('#resultDialog').open");
  assert.equal(await evaluate("document.querySelector('#resultDialog').dataset.outcome"), 'won');
  assert.equal(await evaluate("document.querySelector('#resultAmount').textContent"), '₹88.20');
  assert.equal(await evaluate("document.querySelector('#resultAutoClose').checked"), true);
  await click('#resultAutoClose');
  await screenshot('result-win-desktop');
  assert.equal(await evaluate("document.querySelector('#wallet').textContent"), '₹30,077.20');
  assert.equal(await evaluate("document.querySelector('#historyRows tr td:nth-child(2)').textContent"), '7');
  assertMatches(firstPrediction, await settledResult());
  await click('#resultDialog [data-close]'); await click('#tabMy');
  assert.equal(await evaluate("!!document.querySelector('.bet-outcome.won')"), true);
  assert.equal(await evaluate("!!document.querySelector('.bet-meta time[datetime]') && !!document.querySelector('.bet-badge')"), true);
  await click('[data-history-detail]');
  assert.equal(await evaluate("document.querySelector('.my-history-row').open"), true);
  await click('[data-history-detail]');
  await evaluate("document.querySelector('#myPanel').scrollIntoView({block:'start'})");
  await screenshot('my-history-desktop');
  // Place a losing bet in the next 1-minute period to exercise the blue receipt.
  await click('[data-selection="number:9"]'); await evaluate("document.querySelector('#betForm').requestSubmit()");
  await click('#tabChart'); assert.equal(await evaluate("document.querySelectorAll('.chart-row').length"), 10);
  await waitFor("!!document.querySelector('.chart-lines')"); await screenshot('chart-desktop');
  await click('#tabHistory'); const oldPeriod = await evaluate("document.querySelector('#historyRows tr td').textContent");
  await click('#nextPage'); assert.notEqual(await evaluate("document.querySelector('#historyRows tr td').textContent"), oldPeriod);
  await click('#previousPage');
  await click('#room30');
  await advance(25000);
  await waitFor("!document.querySelector('#bettingLock').hidden");
  assert.equal(await evaluate("document.querySelector('[data-selection]').disabled"), true);
  assert.equal(await evaluate("document.querySelector('#lockCountdown').textContent"), '05');
  assert.equal(await evaluate("document.querySelector('#countdown').textContent"), '00:05');
  await waitFor("document.querySelector('#toast').hidden");
  await screenshot('studio-locked');
  await advance(2000);
  assert.equal(await evaluate("document.querySelector('#lockCountdown').textContent"), '03');
  for (const width of [393,320]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:900,deviceScaleFactor:1,mobile:true});
    await evaluate("document.querySelector('.betting-card').scrollIntoView({block:'center'})");
    await screenshot(`countdown-03-mobile-${width}`);
    assert.equal(await evaluate("(() => {const digits=[...document.querySelectorAll('.lock-digit')].map(el=>el.getBoundingClientRect()), card=document.querySelector('.betting-card').getBoundingClientRect();return digits.length===2 && digits.every(r=>r.left>=card.left && r.right<=card.right && r.top>=card.top && r.bottom<=card.bottom);})()"),true,`${width}px countdown digits fit card`);
  }
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await evaluate('scrollTo(0,0)');
  await advance(3000);
  await waitFor("document.querySelector('#bettingLock').hidden");
  await click('#room60');
  await click('#predictLauncher'); await click('#predictRun');
  await waitFor("document.querySelector('#predictResult').dataset.numbers==='2,4'");
  const secondPrediction = await revealedPrediction();
  await click('#predictionDialog [data-close]');
  await advance(30000); assertMatches(secondPrediction, await settledResult());
  await waitFor("document.querySelector('#resultDialog').open");
  assert.equal(await evaluate("document.querySelector('#resultDialog').dataset.outcome"), 'lost');
  assert.equal(await evaluate("document.querySelector('#resultLoss').hidden"), false);
  assert.equal(await evaluate("document.querySelector('#resultAmount').hidden"), true);
  for (const width of [393,320]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});
    await screenshot(`result-loss-mobile-${width}`);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await click('#resultAutoClose');
  await waitFor("!document.querySelector('#resultDialog').open");
  assert.equal(await evaluate("document.querySelector('#wallet').textContent"), '₹30,067.20');
  await click('[data-selection="size:Small"]'); await evaluate("document.querySelector('#betForm').requestSubmit()");
  await click('#predictLauncher'); assert.equal(await evaluate("document.querySelector('#predictResult').dataset.numbers"), undefined);
  await click('#predictRun'); await waitFor("document.querySelector('#predictResult').dataset.numbers==='0,2'");
  assert.equal(await evaluate("document.querySelector('#predictResult').dataset.color"), 'Red');
  const dualPrediction = await revealedPrediction();
  await advance(60000); assertMatches(dualPrediction, await settledResult());
  assert.equal(await evaluate("document.querySelector('#resultDialog').open"), false, 'A receipt waits for the open prediction dialog');
  await click('#predictionDialog [data-close]');
  await waitFor("document.querySelector('#resultDialog').open");
  assert.equal(await evaluate("document.querySelector('#resultDialog').dataset.payout"), '1960');
  assert.equal(await evaluate("document.querySelector('#resultChips').textContent"), 'RedViolet0Small');
  await click('#resultAutoClose');
  await send('Emulation.setDeviceMetricsOverride',{width:393,height:900,deviceScaleFactor:1,mobile:true});
  await screenshot('result-win-mobile-393');
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});
  await screenshot('result-win-mobile-320');
  await click('#resultDialog [data-close]');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await click('#predictLauncher'); await click('#predictRun'); await advance(60000);
  await delay(3100);
  assert.equal(await evaluate("document.querySelector('#predictResult').dataset.numbers"), undefined, 'A round change cancels an in-progress reveal');
  assert.equal(await evaluate("document.querySelector('[data-prediction-ready-banner]').hidden"), true);
  await click('#predictionDialog [data-close]');
  await click('#room180'); await click('#predictLauncher');
  assert.equal(await evaluate("document.querySelector('#room60').getAttribute('aria-selected')"), 'true', 'Prediction selects the supported 1-minute room');
  await click('#predictionDialog [data-close]');
  for (const width of [393, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
    await evaluate('scrollTo(0,0)');
    await waitFor("document.querySelector('#toast').hidden");
    await screenshot(`studio-mobile-${width}`);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, `${width}px page overflow`);
    await click('#predictLauncher'); await click('#predictRun');
    await waitFor("!!document.querySelector('#predictResult').dataset.numbers");
    await screenshot(`prediction-mobile-${width}`);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, `${width}px prediction overflow`);
    await click('#predictionDialog [data-close]');
    await click('#tabChart'); await evaluate("document.querySelector('#chartPanel').scrollIntoView({block:'start'})");
    await screenshot(`chart-mobile-${width}`);
    assert.equal(await evaluate("Math.abs(document.querySelector('.game-header').getBoundingClientRect().top)<2"), true, 'The DmFirst game header stays visible while scrolling');
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, `${width}px chart overflow`);
    await click('#tabMy'); await evaluate("document.querySelector('#myPanel').scrollIntoView({block:'start'})");
    assert.equal(await evaluate("document.querySelectorAll('.bet-outcome.won').length"),2);
    assert.equal(await evaluate("document.querySelectorAll('.bet-outcome.lost').length"),1);
    await screenshot(`my-history-mobile-${width}`);
    await click('#tabHistory');
  }
  await evaluate('scrollTo(0,0)');
  const origin = await center('#predictLauncher'), destination = {x:45,y:330};
  await touch('touchStart',origin);
  await touch('touchMove',{x:(origin.x+destination.x)/2,y:(origin.y+destination.y)/2});
  await touch('touchMove',destination); await touch('touchEnd');
  assert.equal(await evaluate("document.querySelector('#predictionDialog').open"), false, 'Dragging must not activate Predict');
  const moved = await center('#predictLauncher'); assert.ok(Math.abs(moved.x-origin.x)>100, 'Floating Predict moves with touch');
  await touch('touchStart',moved); await touch('touchEnd');
  await waitFor("document.querySelector('#predictionDialog').open");
  assert.equal(await evaluate("document.querySelector('#predictAccess').hidden"), true);
  await click('#predictionDialog [data-close]');
  await click('#deposit'); await click('#addCredits');
  assert.equal(await evaluate("document.querySelector('#wallet').textContent"), '₹31,076.80');
  await open('/registration.html', "!!document.querySelector('#predictLauncher')");
  await waitFor("document.querySelector('#deposit-dialog').open"); await screenshot('deposit-mobile');
  await click('[data-dismiss-deposit]'); await click('#predictLauncher');
  await fill('#predictCode', 'DMFIRST'); await evaluate("document.querySelector('#predictCodeForm').requestSubmit()");
  await waitFor("!document.querySelector('#predictPreview').hidden");
  await click('#predictRun'); await waitFor("document.querySelector('#predictResult').dataset.numbers==='1,3'"); await screenshot('visitor-prediction-mobile');
  await click('#predictionDialog [data-close]'); await click('#predictLauncher');
  assert.equal(await evaluate("document.querySelector('#predictAccess').hidden"), false, 'Visitor reopens with a fresh code gate');
  await fill('#predictCode', 'DMFIRST'); await evaluate("document.querySelector('#predictCodeForm').requestSubmit()");
  await click('#predictionDialog [data-close]'); await delay(2200);
  await click('#predictLauncher');
  assert.equal(await evaluate("document.querySelector('#predictionDialog').dataset.accessState"), 'entry', 'Closing cancels an in-progress access check');
  await click('#predictionDialog [data-close]');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  assert.deepEqual(errors, [], 'Browser runtime exceptions');
  console.log('Browser checks passed: terminal landing, complete preview, manual/automatic handoff, reduced motion, game-only Studio, Predict-only floating control, prediction matches three automatic settlements, stale reveal cancellation, visitor Claim, code gates, betting, lock, rooms, chart, pagination, virtual wallet, touch dragging, 393px and 320px layouts. Screenshots: preview/. External account requests were blocked.');
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  browser.kill();
  if (server) await new Promise(resolve => server.close(resolve));
  // Delete only this tool-created temporary browser profile.
  if (path.dirname(path.resolve(profile)) === path.resolve(os.tmpdir()) && path.basename(profile).startsWith('wingo-ui-')) {
    for (let attempt = 0; attempt < 10; attempt++) {
      try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await delay(200); }
    }
  }
}
