// Shared visitor/Studio markup adapted from dmfirst-affiliation/registration.html.
export const predictionMarkup = `
    <div class="deposit-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <header class="deposit-header">
        <span><i></i> <span data-prediction-text="brand">DM FIRST</span> <span class="deposit-header-slash">/</span> <span id="prediction-preview-note" data-prediction-text="modeLabel">SIMULATION</span></span>
        <button class="deposit-close" type="button" aria-label="Close predictions" data-dismiss-prediction data-close>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>
        </button>
    </header>
    <section class="prediction-access" id="predictAccess" data-prediction-access>
        <div class="prediction-access-art" aria-hidden="true">
            <svg viewBox="0 0 80 80">
                <circle class="prediction-access-orbit" cx="40" cy="40" r="35"/>
                <circle class="prediction-access-dot" cx="40" cy="5" r="2.5"/>
                <path class="prediction-access-shackle" d="M28 34v-9a12 12 0 0 1 24 0v9"/>
                <rect x="22" y="33" width="36" height="29" rx="5"/>
                <path d="M40 44v8"/>
            </svg>
        </div>
        <h2 class="prediction-title" id="predictAccessTitle" tabindex="-1" data-prediction-access-title>Enter access code</h2>
        <p class="prediction-access-help" id="predictAccessHelp" role="status" data-prediction-access-help>Enter your code to open the prediction preview.</p>
        <form class="prediction-code-form" id="predictCodeForm" data-prediction-code-form novalidate>
            <label for="predictCode" data-prediction-text="codeLabel">Access code</label>
            <input id="predictCode" name="access-code" type="password" required maxlength="128" autocomplete="off"
                   autocapitalize="characters" spellcheck="false" aria-describedby="predictCodeError"
                   aria-invalid="false" data-prediction-code/>
            <p class="prediction-code-error" id="predictCodeError" role="alert" data-prediction-code-error hidden></p>
            <aside class="prediction-admin-contact" id="predictAdmin" data-prediction-admin-contact aria-labelledby="prediction-admin-title" hidden>
                <h3 id="prediction-admin-title" data-prediction-text="adminTitle">Contact Admin</h3>
                <div class="prediction-admin-row">
                    <span class="prediction-admin-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="m20 4-3 16-5-4-3 3v-6L20 4 4 11l5 2"/></svg>
                    </span>
                    <div class="prediction-admin-details">
                        <span class="prediction-admin-caption" data-prediction-text="adminChannel">Telegram DM</span>
                        <span data-prediction-admin-text>Telegram contact coming soon.</span>
                        <a data-prediction-admin-link target="_blank" rel="noopener noreferrer" hidden>Message admin</a>
                    </div>
                </div>
            </aside>
            <button class="prediction-trigger prediction-unlock" type="submit" id="predictUnlock" data-prediction-unlock>
                <span class="prediction-unlock-icon" data-prediction-unlock-icon aria-hidden="true">
                    <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0M12 14v3"/></svg>
                </span>
                <span class="prediction-unlock-icon" data-prediction-lock-icon aria-hidden="true">
                    <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></svg>
                </span>
                <span data-prediction-unlock-label>Unlock</span>
            </button>
        </form>
        <div class="prediction-unlock-progress" data-prediction-unlock-progress hidden>
            <p><span data-prediction-progress-label>Opening preview</span><strong data-prediction-percent>0%</strong></p>
            <div class="prediction-progressbar" role="progressbar" aria-label="Opening prediction preview"
                 aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-prediction-progressbar><span></span></div>
        </div>
    </section>
    <div id="predictPreview" data-prediction-preview hidden>
    <h2 class="prediction-title" id="predictionTitle" tabindex="-1" data-prediction-heading>Number game</h2>
    <p class="prediction-period" id="predictPeriod"></p>
    <button class="prediction-trigger" type="button" id="predictRun" data-predict disabled>Predict</button>
    <div class="prediction-content" id="predictResult" data-prediction-content aria-busy="false">
        <section class="prediction-result prediction-result-numbers" aria-labelledby="prediction-numbers-label">
            <h3 id="prediction-numbers-label" data-prediction-text="numbersLabel">Numbers</h3>
            <div class="prediction-number-slots">
                <div class="prediction-number-slot">
                    <div class="prediction-reel prediction-reel-number" data-prediction-reel="number-a" data-prediction-number role="img" aria-label="Awaiting selection">
                        <div class="prediction-reel-track" data-reel-track><div class="prediction-reel-cell prediction-reel-placeholder">—</div></div>
                    </div>
                </div>
                <div class="prediction-number-slot">
                    <div class="prediction-reel prediction-reel-number" data-prediction-reel="number-b" data-prediction-number role="img" aria-label="Awaiting selection">
                        <div class="prediction-reel-track" data-reel-track><div class="prediction-reel-cell prediction-reel-placeholder">—</div></div>
                    </div>
                </div>
            </div>
        </section>
        <section class="prediction-result" aria-labelledby="prediction-size-label">
            <h3 id="prediction-size-label" data-prediction-text="sizeLabel">Big / Small</h3>
            <div class="prediction-reel" data-prediction-reel="size" role="img" aria-label="Awaiting selection">
                <div class="prediction-reel-track" data-reel-track><div class="prediction-reel-cell prediction-reel-placeholder">—</div></div>
            </div>
        </section>
        <section class="prediction-result" aria-labelledby="prediction-color-label">
            <h3 id="prediction-color-label" data-prediction-text="colorLabel">Color</h3>
            <div class="prediction-reel" data-prediction-reel="color" role="img" aria-label="Awaiting selection">
                <div class="prediction-reel-track" data-reel-track><div class="prediction-reel-cell prediction-reel-placeholder">—</div></div>
            </div>
        </section>
    </div>
    <div class="prediction-ready-banner" data-prediction-ready-banner hidden>
        <span class="prediction-ready-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-8"/></svg>
        </span>
        <strong data-prediction-ready-text>Selection Ready</strong>
    </div>
    <p class="prediction-spin-status" role="status" id="predictStatus" data-prediction-spin-status>Select Predict to spin a preset combination.</p>
    <p class="prediction-disclosure" data-prediction-text="disclosure">Preset simulation · No live game data</p>
    </div>
`;
