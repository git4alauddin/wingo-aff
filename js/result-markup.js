// Code-native medal, ribbon, and receipt art inspired by the supplied result screens.
export const resultMarkup = `
<div class="result-card">
  <svg class="result-trophy" viewBox="0 0 320 180" aria-hidden="true">
    <defs>
      <linearGradient id="ribbonFace" x2="0" y2="1"><stop stop-color="var(--ribbon-light)"/><stop offset=".5" stop-color="var(--ribbon-main)"/><stop offset="1" stop-color="var(--ribbon-dark)"/></linearGradient>
      <linearGradient id="ribbonEdge"><stop stop-color="var(--ribbon-dark)"/><stop offset=".5" stop-color="var(--ribbon-light)"/><stop offset="1" stop-color="var(--ribbon-dark)"/></linearGradient>
      <linearGradient id="feathers" x2=".3" y2="1"><stop stop-color="var(--wing-light)"/><stop offset="1" stop-color="var(--wing-dark)"/></linearGradient>
      <linearGradient id="coinFace" x2=".6" y2="1"><stop stop-color="var(--medal-light)"/><stop offset=".5" stop-color="var(--medal-main)"/><stop offset="1" stop-color="var(--medal-dark)"/></linearGradient>
      <radialGradient id="coinInset"><stop stop-color="var(--medal-main)"/><stop offset="1" stop-color="var(--medal-dark)"/></radialGradient>
    </defs>
    <path d="M111 83Q68 64 20 95L39 112 26 140Q74 123 110 148L130 116Z" fill="url(#ribbonFace)"/>
    <path d="M209 83Q252 64 300 95L281 112 294 140Q246 123 210 148L190 116Z" fill="url(#ribbonFace)"/>
    <path d="M28 140Q52 113 81 124L110 148Q69 132 28 140ZM292 140Q268 113 239 124L210 148Q251 132 292 140Z" fill="var(--ribbon-dark)"/>
    <path d="M47 80Q50 62 77 70L120 88 113 124Q83 103 62 111L72 127Q47 127 47 111Z" fill="url(#ribbonEdge)"/>
    <path d="M273 80Q270 62 243 70L200 88 207 124Q237 103 258 111L248 127Q273 127 273 111Z" fill="url(#ribbonEdge)"/>
    <g fill="url(#feathers)" stroke="var(--wing-light)" stroke-width=".6">
      <path d="M126 56Q111 48 106 21Q94 53 111 73L133 89Z"/><path d="M124 72Q97 68 88 47Q85 78 115 90L137 94Z"/>
      <path d="M120 85Q96 90 78 77Q84 101 117 104L141 101Z"/><path d="M124 98Q105 111 90 105Q103 126 137 110Z"/>
      <path d="M194 56Q209 48 214 21Q226 53 209 73L187 89Z"/><path d="M196 72Q223 68 232 47Q235 78 205 90L183 94Z"/>
      <path d="M200 85Q224 90 242 77Q236 101 203 104L179 101Z"/><path d="M196 98Q215 111 230 105Q217 126 183 110Z"/>
    </g>
    <circle cx="160" cy="71" r="49" fill="var(--medal-dark)"/><circle cx="160" cy="68" r="48" fill="url(#coinFace)" stroke="var(--medal-light)" stroke-width="2"/>
    <circle cx="160" cy="68" r="39" fill="url(#coinInset)" stroke="var(--medal-light)" stroke-width="3"/><circle cx="160" cy="68" r="34" fill="none" stroke="var(--medal-light)" stroke-opacity=".4"/>
    <path d="M160 41Q178 51 177 76L170 88H150L143 76Q142 51 160 41ZM148 67l-7 7-2 16 11-9m22-14 7 7 2 16-11-9M153 91q7 17 14 0Z" fill="var(--wing-light)"/>
    <circle cx="160" cy="64" r="10" fill="var(--medal-main)"/><path d="m161 55-7 11h6l-1 7 8-11h-6Z" fill="var(--wing-light)"/>
    <path d="M120 34q25-18 51-9" fill="none" stroke="var(--medal-light)" stroke-width="2" stroke-linecap="round"/>
  </svg>
  <h2 id="resultTitle">Congratulations</h2>
  <div class="lottery-result"><span>Lottery results</span><div id="resultChips"></div></div>
  <div class="result-receipt"><div class="receipt-slot" aria-hidden="true"></div><div class="receipt-paper">
    <span id="resultBonusLabel">Bonus</span><strong id="resultAmount"></strong><strong id="resultLoss" hidden>Lose</strong>
    <small id="resultRoom"></small><small id="resultPeriod"></small>
  </div></div>
  <p class="result-return" id="resultReturn"></p>
  <label class="result-auto"><input type="checkbox" id="resultAutoClose" checked><span id="resultAutoLabel">3 seconds auto close</span></label>
  <button class="result-close" type="button" data-close aria-label="Close round result"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg></button>
</div>`;
