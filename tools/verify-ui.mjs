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
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await delay(100);
  const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
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
  const screenshot = async name => {
    await delay(100);
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.mkdirSync(path.join(root, 'preview'), { recursive: true });
    fs.writeFileSync(path.join(root, 'preview', `${name}.png`), Buffer.from(result.data, 'base64'));
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Page.bringToFront');
  await send('Network.setBlockedURLs', { urls: ['*dmfirst0.com*'] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__offset=0;const realNow=performance.now.bind(performance);Object.defineProperty(performance,'now',{value:()=>realNow()+window.__offset});` });
  server = await startServer(0); const base = `http://127.0.0.1:${server.address().port}`;
  const open = async (route, ready) => { await send('Page.navigate', { url: base + route }); await waitFor(`document.readyState==='complete' && (${ready})`); };
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await open('/?preview=1', "document.querySelector('[data-progress-value]')?.textContent==='100'");
  assert.equal(await evaluate('location.pathname'), '/'); await screenshot('landing-desktop');
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
  await click('#predictLauncher'); await fill('#predictCode', 'wrong');
  await evaluate("document.querySelector('#predictCodeForm').requestSubmit()");
  assert.equal(await evaluate("document.querySelector('#predictCodeError').hidden"), false);
  await fill('#predictCode', 'DMFIRST'); await evaluate("document.querySelector('#predictCodeForm').requestSubmit()");
  await click('#predictRun'); await waitFor("document.querySelector('#predictNumber').textContent==='7'");
  await click('#predictRun'); await waitFor("document.querySelector('#predictNumber').textContent==='2'");
  await screenshot('visitor-prediction');
  await open('/creator-studio.html', "!!document.querySelector('#studioGateForm')");
  await fill('#studioPassword', 'bad'); await evaluate("document.querySelector('#studioGateForm').requestSubmit()");
  assert.equal(await evaluate("document.querySelector('#studioGateError').hidden"), false);
  await fill('#studioPassword', '@creator'); await evaluate("document.querySelector('#studioGateForm').requestSubmit()");
  await waitFor("!document.querySelector('#studioApp').hidden"); await click('#pause');
  assert.equal(await evaluate("document.querySelectorAll('#numberGrid button').length"), 10);
  await screenshot('studio-desktop');
  await click('#predictLauncher'); await click('#predictRun');
  await waitFor("document.querySelector('#predictNumber').textContent==='7'");
  assert.equal(await evaluate("document.querySelector('#predictAccess').hidden"), true);
  await screenshot('studio-prediction'); await click('#predictionDialog [data-close]');
  await click('[data-selection="number:7"]'); await evaluate("document.querySelector('#betForm').requestSubmit()");
  assert.equal(await evaluate("document.querySelector('#wallet').textContent"), '₹29,989.00');
  await click('#next'); await waitFor("document.querySelector('#resultDialog').open");
  assert.equal(await evaluate("document.querySelector('#wallet').textContent"), '₹30,077.20');
  assert.equal(await evaluate("document.querySelector('#historyRows tr td:nth-child(2)').textContent"), '7');
  await click('#resultDialog [data-close]'); await click('#tabMy');
  assert.equal(await evaluate("!!document.querySelector('.bet-outcome.won')"), true);
  await click('#tabChart'); assert.equal(await evaluate("document.querySelectorAll('.chart-row').length"), 10);
  await waitFor("!!document.querySelector('.chart-lines')"); await screenshot('chart-desktop');
  await click('#tabHistory'); const oldPeriod = await evaluate("document.querySelector('#historyRows tr td').textContent");
  await click('#nextPage'); assert.notEqual(await evaluate("document.querySelector('#historyRows tr td').textContent"), oldPeriod);
  await click('#previousPage');
  await click('#room30');
  await click('#pause'); // resume
  await evaluate('window.__offset+=25000');
  await waitFor("!document.querySelector('#bettingLock').hidden");
  assert.equal(await evaluate("document.querySelector('[data-selection]').disabled"), true);
  await screenshot('studio-locked');
  await evaluate('window.__offset+=5000');
  await waitFor("document.querySelector('#bettingLock').hidden"); await click('#pause');
  await click('#room60'); await fill('#nextOutcome', '0'); await click('#applyOutcome');
  await click('#predictLauncher'); assert.equal(await evaluate("document.querySelector('#predictNumber').textContent"), '—');
  await click('#predictRun'); await waitFor("document.querySelector('#predictNumber').textContent==='0'");
  assert.equal(await evaluate("document.querySelector('#predictColor').textContent"), 'Red + Violet');
  await click('#predictionDialog [data-close]');
  await click('#next');
  await click('#predictLauncher'); await click('#predictRun'); await click('#next');
  await delay(1200);
  assert.equal(await evaluate("document.querySelector('#predictNumber').textContent"), '—', 'A round change cancels an in-progress reveal');
  await click('#predictionDialog [data-close]');
  for (const width of [393, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
    await evaluate("document.querySelector('#creatorControls').open=false;scrollTo(0,0)");
    await waitFor("document.querySelector('#toast').hidden");
    await screenshot(`studio-mobile-${width}`);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, `${width}px page overflow`);
    await click('#tabChart'); await evaluate("document.querySelector('#chartPanel').scrollIntoView({block:'start'})");
    await screenshot(`chart-mobile-${width}`);
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true, `${width}px chart overflow`);
    await click('#tabHistory');
  }
  await evaluate('scrollTo(0,0)'); await click('#focusView');
  assert.equal(await evaluate("document.body.classList.contains('focus-mode')"), true);
  const origin = await center('#claimLauncher'), destination = {x:45,y:330};
  await touch('touchStart',origin);
  await touch('touchMove',{x:(origin.x+destination.x)/2,y:(origin.y+destination.y)/2});
  await touch('touchMove',destination); await touch('touchEnd');
  assert.equal(await evaluate("document.querySelector('#creditsDialog').open"), false, 'Dragging must not activate Claim');
  const moved = await center('#claimLauncher'); assert.ok(Math.abs(moved.x-origin.x)>100, 'Floating Claim moves with touch');
  await touch('touchStart',moved); await touch('touchEnd');
  await waitFor("document.querySelector('#creditsDialog').open"); await click('#addCredits');
  assert.equal(await evaluate("document.querySelector('#wallet').textContent"), '₹31,077.20');
  await open('/registration.html', "!!document.querySelector('#predictLauncher')");
  await waitFor("document.querySelector('#deposit-dialog').open"); await screenshot('deposit-mobile');
  await click('[data-dismiss-deposit]'); await click('#predictLauncher');
  await fill('#predictCode', 'DMFIRST'); await evaluate("document.querySelector('#predictCodeForm').requestSubmit()");
  await click('#predictRun'); await waitFor("document.querySelector('#predictNumber').textContent==='7'"); await screenshot('visitor-prediction-mobile');
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  assert.deepEqual(errors, [], 'Browser runtime exceptions');
  console.log('Browser checks passed: visitor handoff, Claim, code gates, prediction, bets, settlement, lock, rooms, chart, pagination, focus view, virtual wallet, 393px and 320px layouts. Screenshots: preview/. External account requests were blocked.');
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
