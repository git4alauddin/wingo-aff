# DM FIRST × WinGo

A separate WinGo project following the Aviator affiliate portal and Creator Studio approach. The emerald and gold game screen is based on the four screenshots in `../ref_image`. The two reference projects are unchanged.

## Run

Node.js 22+; no dependencies to install.

```powershell
cd wingo-aff
npm start
```

- `http://127.0.0.1:4175/` — animated access page, then registration.
- `http://127.0.0.1:4175/?preview=1` — hold the access-page preview.
- `http://127.0.0.1:4175/registration.html` — DmFirst affiliate registration, floating Claim and Predict buttons, and top-right Creator Studio entry.
- `http://127.0.0.1:4175/creator-studio.html` — WinGo gameplay simulation.

Default visitor prediction code: **DMFIRST**. Default Studio password: **@creator**, matching the Aviator Studio. These are public browser-side UI gates, not secure authentication. Run pages through the local server because they use ES modules.

## Visitor flow

The access page hands off to the existing DmFirst affiliate URL. Deposit details appear after the configured delay. Claim changes the registration iframe to DmFirst wallet recharge. Closing the popup restores the draggable Claim button; Predict is separately draggable. A Claim click is not evidence of a deposit or account registration. As in Aviator, reopening Claim after a Claim click offers a visual Copy Code simulation; it does not copy or expose a password.

Visitor prediction has a code gate and cycles through local WinGo presets. It never reads the external iframe, account state, or live game results. The original WinGo registration guidance audio is retained from `dmfirst-affiliation`; playback, replay, stop, and blocked/unavailable feedback are supported. Review that existing recording before publishing if changing the offer or referral details.

External embedding depends on DmFirst's framing policy. The local preview does not proxy or bypass that policy.

## Creator Studio

- Screenshot-based wallet, duration tabs, ticket-style countdown, recent result balls, color controls, number grid, multiplier controls, and Big/Small controls.
- Independent 30-second, 1-minute, 3-minute, and 5-minute rooms. Each room keeps its own period, result sequence, and history.
- Betting closes during the final five seconds. At zero, all bets for that room/period settle once, the same result enters history, and the next round opens.
- Virtual balance starts at ₹29,999. Bet amount, quantity, fee, and payouts use integer paise. Defaults: 2% service fee, 9× exact number, 4.5× violet, 2× normal red/green and size, 1.5× red on 0 or green on 5. Returns include the returned stake and apply after the fee. These are configurable demo rules, not verified operator rules.
- Game history has ten results per page. Chart shows statistics for the latest 100 completed results and connected number trends. My history shows actual local pending/won/lost bets.
- Studio prediction opens directly without a second code gate. Its number/color/size comes from the exact upcoming Studio result. Room changes, round changes, and changed result presets clear stale predictions and cancel reveals in progress.
- Creator controls: apply an upcoming number, pause/resume all room clocks, settle/advance the active room, and reset starting balance. Reset requires pending bets to settle first.
- Deposit/Claim inside Studio adds virtual credits. Withdraw explains the virtual wallet. No real payments are made from Studio.
- Focus view hides creator controls for a compact gameplay recording. Optional synthesized round sound defaults off. Buttons support mouse, keyboard, and touch; floating buttons are draggable; animations respect reduced motion.
- Simulation labels remain visible. All session data resets on reload. Initial history is seeded sample data; new entries come from the simulation.

## Configure

- `js/config.js`: affiliate registration/wallet URLs, deposit amount, offer timing, voice guidance, visitor code and outcome presets.
- `js/studio-config.js`: creator code, initial virtual balance, stakes/limits, room timings, lock window, fee, seeded history, outcome sequence, and simulation label.
- `js/wingo-engine.js`: number/color/size mapping and settlement model.

Client configuration is publicly readable. Do not put secrets in it. This project has no official game-provider API, live outcome feed, or prediction service.

## Verify and build

```powershell
npm run check
npm test
npm run test:ui
npm run build
```

Browser checks require Chrome or Edge on Windows, or `CHROME_PATH` pointing to a compatible executable. They create an isolated headless profile and local test server, block external DmFirst requests, exercise the visitor and Studio flows, and save screenshots in `preview/`. The profile and server are closed after testing. Restricted Windows environments may require permission to launch browser child processes. Real account actions and external embedding are not verified by these checks.

The build copies only public pages, scripts, styles, and assets to `dist/`. Tools, tests, references, screenshots, and repository metadata are excluded. `wrangler.jsonc` prepares a static Cloudflare deployment named `dmfirst-wingo`; building does not publish it or change DNS.

The preview server defaults to port 4175 to keep it separate from the reference demos. Set `PORT` to choose another port.
