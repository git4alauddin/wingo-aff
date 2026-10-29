// Reused reference regressions for the shared reel animation lifecycle.
import test from "node:test";
import assert from "node:assert/strict";
import {chooseSettlement, mountPredictionReels} from "../js/prediction-reels.js";
import {predictionConfig} from "../js/prediction-config.js";

const flush = () => new Promise(resolve => setImmediate(resolve));
const expected = [
    {numbers: [1, 3], size: "Small", color: "Green"},
    {numbers: [2, 4], size: "Small", color: "Red"},
    {numbers: [6, 8], size: "Big", color: "Red"},
    {numbers: [7, 9], size: "Big", color: "Green"},
];

function fixture({reduced = false, random = () => 0, settings = {}} = {}) {
    class Element extends EventTarget {
        constructor() {super(); this.attributes = new Map(); this.dataset = {}; this.children = []; this.classList = {add() {}};}
        setAttribute(key, value) {this.attributes.set(key, value);}
        getAttribute(key) {return this.attributes.get(key);}
        append(child) {this.children.push(child);}
        replaceChildren(...children) {this.children = children;}
    }
    const motion = new EventTarget();
    motion.matches = reduced;
    const page = {defaultView: {matchMedia: () => motion}, createElement: () => new Element(), createElementNS: () => new Element()};
    const predict = new Element();
    const results = new Element();
    const status = new Element();
    const banner = new Element();
    const bannerText = new Element();
    const animations = [];
    const tracks = Array.from({length: 4}, () => {
        const track = new Element();
        track.animate = (frames, options) => {
            let done, reject;
            const finished = new Promise((resolve, fail) => {done = resolve; reject = fail;});
            const animation = {frames, options, finished, done, cancelled: false,
                cancel() {this.cancelled = true; reject(new Error("cancelled"));}};
            animations.push(animation);
            return animation;
        };
        return track;
    });
    const reels = tracks.map(track => {
        const reel = new Element();
        reel.querySelector = () => track;
        return reel;
    });
    const dialog = {ownerDocument: page, open: true,
        querySelector: selector => ({"[data-predict]": predict, "[data-prediction-content]": results, "[data-prediction-spin-status]": status,
            "[data-prediction-ready-banner]": banner, "[data-prediction-ready-text]": bannerText})[selector],
        querySelectorAll: () => reels};
    const controller = mountPredictionReels(dialog, {...predictionConfig, ...settings}, random);
    return {controller, predict, results, status, tracks, reels, animations, motion, dialog, banner, bannerText};
}

test("selection can only return one of the four complete configured combinations", () => {
    assert.deepEqual(predictionConfig.settlements, expected);
    for (let index = 0; index < expected.length; index++) {
        assert.deepEqual(chooseSettlement(() => index / 4), expected[index]);
        assert.deepEqual(chooseSettlement(() => (index + .99999) / 4), expected[index]);
    }
});

test("locked controls stay inactive, then all four reels settle on one linked combination", async () => {
    const state = fixture({random: () => .6});
    state.predict.dispatchEvent(new Event("click"));
    assert.equal(state.animations.length, 0);
    assert.equal(state.banner.hidden, true);
    state.controller.enable();
    state.predict.dispatchEvent(new Event("click"));
    assert.equal(state.animations.length, 4);
    assert.equal(state.predict.disabled, true);
    assert.equal(state.results.getAttribute("aria-busy"), "true");
    assert.ok(state.animations.every((a, i) => a.options.duration === 2400 + i * 180));
    state.predict.dispatchEvent(new Event("click"));
    assert.equal(state.animations.length, 4, "rapid clicks never start overlapping spins");
    for (const animation of state.animations.slice(0, 3)) animation.done();
    await flush();
    assert.equal(state.predict.disabled, true, "wait for the last reel");
    assert.equal(state.banner.hidden, true, "the banner waits for every reel");
    state.animations[3].done();
    await flush();
    assert.deepEqual(state.reels.map(reel => reel.getAttribute("aria-label")), ["First number: 6", "Second number: 8", "Size: Big", "Color: Red"]);
    assert.equal(state.results.getAttribute("aria-busy"), "false");
    assert.equal(state.predict.disabled, false);
    assert.equal(state.banner.hidden, false);
    assert.equal(state.bannerText.textContent, predictionConfig.resultBanner.text);
    assert.match(state.status.textContent, /6 and 8 · Big · Red/);
    assert.ok(state.tracks.every(track => track.children.length === 1));
    state.controller.destroy();
});

test("reset and teardown cancel scrolling without allowing stale results to appear", async () => {
    const state = fixture();
    state.controller.enable();
    state.predict.dispatchEvent(new Event("click"));
    state.controller.reset();
    await flush();
    assert.ok(state.animations.every(animation => animation.cancelled));
    assert.ok(state.reels.every(reel => /Awaiting selection/.test(reel.getAttribute("aria-label"))));
    assert.equal(state.predict.disabled, true);
    assert.equal(state.banner.hidden, true);
    state.controller.enable();
    state.predict.dispatchEvent(new Event("click"));
    state.controller.destroy();
    await flush();
    const count = state.animations.length;
    state.predict.dispatchEvent(new Event("click"));
    assert.equal(state.animations.length, count);
    assert.ok(state.animations.every(animation => animation.cancelled));
});

test("result banner text and visibility are configurable and reset on the next spin", () => {
    const disabled = fixture({reduced: true, settings: {resultBanner: {enabled: false, text: "Simulation Complete"}}});
    disabled.controller.enable();
    disabled.predict.dispatchEvent(new Event("click"));
    assert.equal(disabled.banner.hidden, true);
    disabled.controller.destroy();

    const state = fixture({reduced: true, settings: {resultBanner: {enabled: true, text: "Simulation Complete"}}});
    state.controller.enable();
    state.predict.dispatchEvent(new Event("click"));
    assert.equal(state.banner.hidden, false);
    assert.equal(state.bannerText.textContent, "Simulation Complete");
    state.motion.matches = false;
    state.predict.dispatchEvent(new Event("click"));
    assert.equal(state.banner.hidden, true);
    state.controller.reset();
    assert.equal(state.banner.hidden, true);
    state.controller.destroy();
});

test("reduced motion settles immediately and a preference change finishes an active spin", async () => {
    const state = fixture({reduced: true, random: () => .99});
    state.controller.enable();
    state.predict.dispatchEvent(new Event("click"));
    assert.equal(state.animations.length, 0);
    assert.match(state.status.textContent, /7 and 9 · Big · Green/);
    state.motion.matches = false;
    state.predict.dispatchEvent(new Event("click"));
    assert.equal(state.animations.length, 4);
    state.motion.matches = true;
    state.motion.dispatchEvent(new Event("change"));
    await flush();
    assert.equal(state.predict.disabled, false);
    assert.match(state.status.textContent, /7 and 9 · Big · Green/);
    assert.ok(state.animations.every(animation => animation.cancelled));
    state.controller.destroy();
});

test("configured spin text and timing preserve the linked outcome and its visual styling", async () => {
    const text = {
        predictButton: "Start",
        predictAgainButton: "Repeat",
        spinningButton: "Working",
        idleStatus: "Ready to start",
        spinningStatus: "Choosing a preset",
        resultStatus: "{first}/{second}: {size} + {color}",
        placeholder: "?",
        firstNumberLabel: "Number one",
        awaitingSelection: "Waiting",
        small: "Chhota",
        green: "Hara",
    };
    const state = fixture({settings: {text, spinDurationMs: 1000, reelStaggerMs: 75}});
    assert.equal(state.predict.textContent, text.predictButton);
    assert.equal(state.status.textContent, text.idleStatus);
    assert.equal(state.tracks[0].children[0].textContent, text.placeholder);
    assert.equal(state.reels[0].getAttribute("aria-label"), "Number one: Waiting");
    state.controller.enable();
    state.predict.dispatchEvent(new Event("click"));
    assert.equal(state.predict.textContent, text.spinningButton);
    assert.equal(state.status.textContent, text.spinningStatus);
    assert.deepEqual(state.animations.map(animation => animation.options.duration), [1000, 1075, 1150, 1225]);
    state.animations.forEach(animation => animation.done());
    await flush();
    assert.equal(state.predict.textContent, text.predictAgainButton);
    assert.equal(state.status.textContent, "1/3: Chhota + Hara");
    const size = state.tracks[2].children[0].children[0];
    const color = state.tracks[3].children[0].children[0];
    assert.equal(size.textContent, text.small);
    assert.equal(size.getAttribute("data-size"), "small");
    assert.equal(color.textContent, text.green);
    assert.equal(color.getAttribute("data-color"), "green");
    state.controller.reset();
    assert.equal(state.predict.textContent, text.predictButton);
    state.controller.destroy();
});
