// Original crest artwork extracted from the supplied win/loss recordings.
export const resultMarkup = `
<div class="result-card">
  <img class="result-trophy result-trophy-won" src="assets/images/result-crest-won.png" width="328" height="143" alt="" aria-hidden="true" draggable="false">
  <img class="result-trophy result-trophy-lost" src="assets/images/result-crest-lost.png" width="328" height="143" alt="" aria-hidden="true" draggable="false">
  <h2 id="resultTitle">Congratulations</h2>
  <div class="lottery-result"><span>Lottery results</span><div id="resultChips"></div></div>
  <div class="result-receipt"><div class="receipt-slot" aria-hidden="true"></div><div class="receipt-feed"><div class="receipt-paper">
    <span id="resultBonusLabel">Bonus</span><strong id="resultAmount"></strong><strong id="resultLoss" hidden>Lose</strong>
    <small id="resultRoom"></small><small id="resultPeriod"></small>
  </div></div></div>
  <p class="sr-only" id="resultReturn"></p>
  <label class="result-auto"><input type="checkbox" id="resultAutoClose" checked><span id="resultAutoLabel">3 seconds auto close</span></label>
  <button class="result-close" type="button" data-close aria-label="Close round result"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg></button>
</div>`;
