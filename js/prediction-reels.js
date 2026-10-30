import {getPredictionText, predictionConfig} from "./prediction-config.js";

export function chooseSettlement(random = Math.random, settlements = predictionConfig.settlements) {
    return settlements[Math.min(settlements.length - 1, Math.floor(random() * settlements.length))];
}

/** Animate a local preset simulation. No live game data or prediction service is used. */
export function mountPredictionReels(dialog, settings = predictionConfig, random = Math.random, hooks = {}) {
    const page = dialog.ownerDocument;
    const text = getPredictionText(settings);
    const predict = dialog.querySelector("[data-predict]");
    const results = dialog.querySelector("[data-prediction-content]");
    const status = dialog.querySelector("[data-prediction-spin-status]");
    const banner = dialog.querySelector("[data-prediction-ready-banner]");
    const bannerText = dialog.querySelector("[data-prediction-ready-text]");
    const bannerSettings = settings.resultBanner ?? predictionConfig.resultBanner;
    bannerText.textContent = typeof bannerSettings.text === "string" && bannerSettings.text.trim()
        ? bannerSettings.text.trim() : predictionConfig.resultBanner.text;
    const motion = page.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)");
    const reels = [...dialog.querySelectorAll("[data-prediction-reel]")];
    const tracks = reels.map(reel => reel.querySelector("[data-reel-track]"));
    const settlements = settings.settlements ?? predictionConfig.settlements;
    const duration = settings.spinDurationMs ?? predictionConfig.spinDurationMs;
    const spinMs = Number.isFinite(duration) && duration > 0 ? duration : predictionConfig.spinDurationMs;
    const configuredStagger = settings.reelStaggerMs ?? predictionConfig.reelStaggerMs;
    const staggerMs = Number.isFinite(configuredStagger) && configuredStagger >= 0 ? configuredStagger : predictionConfig.reelStaggerMs;
    let animations = [];
    let enabled = false;
    let busy = false;
    let destroyed = false;
    let runId = 0;
    let current = null;
    let selected = null;
    const singleNumber = typeof hooks.selectVisibleNumber === "function";
    let visibleIndex = singleNumber ? -1 : null;
    const sequences = [Array.from({length: 10}, (_, n) => n), Array.from({length: 10}, (_, n) => n),
        ["Small", "Big"], ["Green", "Violet", "Red"]];
    const labels = [text.firstNumberLabel, text.secondNumberLabel, text.sizeAriaLabel, text.colorAriaLabel];

    function displayValue(value) {
        return typeof value === "string" ? text[value.toLowerCase()] ?? value : value;
    }

    function values(row) {
        return row ? [...row.numbers, row.size, row.color] : [null, null, null, null];
    }

    function makeCell(index, value) {
        const cell = page.createElement("div");
        cell.className = "prediction-reel-cell";
        if (value === null) {
            cell.classList.add("prediction-reel-placeholder");
            cell.textContent = text.placeholder;
        } else if (index < 2) {
            const svg = page.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("class", "prediction-number");
            const x = 88 + (value % 5) * 185;
            const y = value < 5 ? 175 : 342;
            svg.setAttribute("viewBox", `${x} ${y} 154 154`);
            svg.setAttribute("aria-hidden", "true");
            const image = page.createElementNS("http://www.w3.org/2000/svg", "image");
            image.setAttribute("href", "./assets/images/prediction-reference.png");
            image.setAttribute("width", "1080");
            image.setAttribute("height", "816");
            svg.append(image);
            cell.append(svg);
        } else {
            const label = page.createElement("div");
            label.className = index === 2 ? "prediction-size" : "prediction-color";
            label.setAttribute(index === 2 ? "data-size" : "data-color", value.toLowerCase());
            label.textContent = displayValue(value);
            cell.append(label);
        }
        return cell;
    }

    function reelLabel(index, value) {
        return `${labels[index]}: ${singleNumber && index !== visibleIndex ? "Blurred" : value === null ? text.awaitingSelection : displayValue(value)}`;
    }

    function updateVisibility() {
        reels.forEach((reel, index) => {
            reel.dataset.obscured = String(singleNumber && index !== visibleIndex);
            if (singleNumber && index !== visibleIndex) reel.setAttribute("aria-label", reelLabel(index, null));
        });
    }

    function renderRow(row) {
        values(row).forEach((value, index) => {
            tracks[index].replaceChildren(makeCell(index, value));
            reels[index].setAttribute("aria-label", reelLabel(index, value));
        });
    }

    function cancel() {
        banner.hidden = true;
        runId++;
        animations.forEach(animation => animation.cancel());
        animations = [];
        busy = false;
        results.setAttribute("aria-busy", "false");
        results.setAttribute("data-spinning", "false");
    }

    function settled() {
        cancel();
        current = selected;
        renderRow(current);
        predict.disabled = !enabled;
        predict.textContent = text.predictAgainButton;
        const result = {first: current.numbers[0], second: current.numbers[1], size: displayValue(current.size), color: displayValue(current.color)};
        status.textContent = singleNumber ? `${current.numbers[visibleIndex]}.`
            : text.resultStatus.replace(/\{(first|second|size|color)\}/g, (_, key) => result[key]);
        banner.hidden = bannerSettings.enabled !== true;
        results.dataset.numbers = current.numbers.join(',');
        results.dataset.size = current.size;
        results.dataset.color = current.color;
    }

    async function spin() {
        if (destroyed || !enabled || busy || !dialog.open) return;
        selected = hooks.selectSettlement ? hooks.selectSettlement() : chooseSettlement(random, settlements);
        if (!selected) return;
        visibleIndex = singleNumber ? selected.numbers.indexOf(hooks.selectVisibleNumber(selected)) : null;
        updateVisibility();
        banner.hidden = true;
        busy = true;
        const run = ++runId;
        predict.disabled = true;
        predict.textContent = text.spinningButton;
        results.setAttribute("aria-busy", "true");
        results.setAttribute("data-spinning", "true");
        delete results.dataset.numbers;
        delete results.dataset.size;
        delete results.dataset.color;
        status.textContent = text.spinningStatus;
        if (motion?.matches || typeof tracks[0].animate !== "function") {
            settled();
            return;
        }
        const finalValues = values(selected);
        const previousValues = values(current);
        const finished = tracks.map((track, index) => {
            const sequence = sequences[index];
            const count = 22 + index * 3;
            const cells = [makeCell(index, previousValues[index])];
            for (let step = 0; step < count; step++) cells.push(makeCell(index, sequence[(step + index) % sequence.length]));
            cells.push(makeCell(index, finalValues[index]));
            track.replaceChildren(...cells);
            const distance = (cells.length - 1) / cells.length * 100;
            const animation = track.animate([
                {transform: "translateY(0)"},
                {transform: `translateY(-${distance}%)`},
            ], {duration: spinMs + index * staggerMs, easing: "cubic-bezier(.12,.78,.12,1)", fill: "forwards"});
            animations.push(animation);
            return animation.finished.then(() => {
                if (destroyed || run !== runId) return;
                track.replaceChildren(makeCell(index, finalValues[index]));
                animation.cancel();
                reels[index].setAttribute("aria-label", reelLabel(index, finalValues[index]));
            }).catch(() => {});
        });
        await Promise.all(finished);
        if (!destroyed && run === runId) settled();
    }

    function motionChanged() {
        if (motion.matches && busy) settled();
    }

    function reset() {
        enabled = false;
        cancel();
        current = null;
        selected = null;
        visibleIndex = singleNumber ? -1 : null;
        updateVisibility();
        renderRow(null);
        predict.disabled = true;
        predict.textContent = text.predictButton;
        status.textContent = text.idleStatus;
        delete results.dataset.numbers;
        delete results.dataset.size;
        delete results.dataset.color;
    }

    predict.addEventListener("click", spin);
    motion?.addEventListener("change", motionChanged);
    reset();
    return {
        reset,
        enable() { enabled = true; predict.disabled = false; },
        destroy() {
            destroyed = true;
            cancel();
            predict.removeEventListener("click", spin);
            motion?.removeEventListener("change", motionChanged);
        },
    };
}
