# DM FIRST × WinGo

A separate WinGo project following the Aviator affiliate portal and Creator Studio approach. The emerald and gold game screen is based on the four screenshots in `../ref_image`. The two reference projects are unchanged.

The landing page adapts the references' hacking theme with emerald/gold code rain, a hooded operator, a scanning number reticle, typed console steps, a segmented progress bar, and four preparation status cards. Its decorative number/color/size preview is separate from gameplay and prediction. The sequence reaches 100%, holds, and hands off to registration after approximately 2.1 seconds of visible time. `?preview=1` holds the completed terminal and keeps the manual Continue link available. Reduced motion disables the rain, scanning, rotation, glitch, and typing effects. Layout rules are isolated in `css/landing.css`.

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

Visitor prediction uses the same emerald/gold access card as the Studio password screen: DmFirst logo, number-ball artwork, rounded card, matching input and button, and styled code-check progress and error feedback. Shared styles live in `css/access-gate.css`. After unlocking, it opens the `dmfirst-affiliation` **WinGo[1 Min]** interface with two number-ball reels, Big/Small and color reels, and the animated result banner. All four reels use the reference's 2,400ms spin with 180ms stagger. The original number artwork is bundled locally. The four linked presets cycle through 1/3 Small Green, 2/4 Small Red, 6/8 Big Red, and 7/9 Big Green. Reopening the visitor popup requires the code again, as in the reference. Closing during access checking or spinning cancels that activity.

It never reads the external iframe, account state, or live game results. Registration voice guidance uses the supplied `assets/audio/wingo_guide.mp3`, enabled in `js/config.js`. Guidance starts from the deposit popup's Close or Claim click; the voice toolbar supports play, replay, stop, and blocked/unavailable feedback. Browsers require a user interaction before audible playback.

External embedding depends on DmFirst's framing policy. The local preview does not proxy or bypass that policy.

## Creator Studio

- Screenshot-based wallet, duration tabs, ticket-style countdown, recent result balls, color controls, number grid, multiplier controls, and Big/Small controls.
- Independent 30-second, 1-minute, 3-minute, and 5-minute rooms. Each room keeps its own period, result sequence, and history.
- Betting closes during the final five seconds. At zero, all bets for that room/period settle once, the same result enters history, and the next round opens.
- Virtual balance starts at ₹29,999. Bet amount, quantity, fee, and payouts use integer paise. Defaults: 2% service fee, 9× exact number, 4.5× violet, 2× normal red/green and size, 1.5× red on 0 or green on 5. Returns include the returned stake and apply after the fee. These are configurable demo rules, not verified operator rules.
- Game history has ten results per page. Chart shows statistics for the latest 100 completed results and connected number trends. The DmFirst game header stays visible while scrolling. My History follows the supplied references with selection badges, period IDs, placement timestamps, outlined Win/Lose/Pending labels, and actual stake/return amounts. Each row expands to show selection, amount, fee, return, and result; Detail expands/collapses the visible rows.
- Settled bets show the reference-inspired orange/gold Congratulations receipt or blue Sorry/Lose receipt, with native SVG medal/ribbon artwork, the actual result number/colors/size, period, and room. Bonus is the total settled return including stake after fees; the popup also states total returned and staked. A mixed round uses the winning receipt if any bet returned credits. These screens display settled data and never change the wallet.
- Receipts close after three visible seconds by default. The checkbox can disable auto-close or restart the countdown. Close, backdrop click, and Escape also dismiss the receipt. Results wait behind open prediction, betting, or other dialogs and then appear in order, including bets settled in a different room.
- Studio prediction uses the exact same reel interface and opens directly without a second code gate. Prediction currently targets **WinGo 1 Min**; opening it from another room selects the 1-minute room. Its two-number pair includes the upcoming Studio result, and both digits share the displayed size and color. Results 0 and 5 use the compatible pairs 0/2 Small Red and 5/7 Big Green (0 and 5 also carry violet in gameplay). Repeat spins keep the same pair for that period. Room changes, round changes, and changed result presets clear stale predictions and cancel reveals in progress.
- After the access gate, Studio opens directly into the centered game simulation. Rounds run automatically. The only floating control is **Predict**; the creator sidebar, extra Studio toolbar, and floating Claim button are removed.
- The game's wallet Deposit button adds virtual credits. Withdraw explains the virtual wallet. No real payments are made from Studio. The visitor registration page retains its separate Claim/deposit flow.
- Optional synthesized round sound defaults off. Buttons support mouse, keyboard, and touch; floating Predict is draggable; animations respect reduced motion.
- Simulation labels remain visible. All session data resets on reload. Initial history is seeded sample data; new entries come from the simulation.

## Configure

- `js/config.js`: affiliate registration/wallet URLs, deposit amount, offer timing, and voice guidance.
- `js/prediction-config.js`: shared prediction text, visitor code, unlock timing, spin timing/stagger, number pairs, admin contact, and result banner. `prediction-model.js` maps the Studio digit to its consistent pair; `prediction-reels.js` handles the shared animation.
- `js/studio-config.js`: creator code, initial virtual balance, stakes/limits, room timings, lock window, fee, seeded history, outcome sequence, simulation label, and `resultPopup.autoClose/autoCloseSeconds` (default three seconds).
- `js/round-results.js` and `js/result-markup.js`: settled result queue, receipt display, and SVG illustration. `css/round-results.css` contains the win/loss palettes. `js/bet-history.js` and `css/history-panels.css` contain the reference-style personal history, results table, and chart styling. `css/game-refinements.css` contains the shared game layout and sticky header.
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
