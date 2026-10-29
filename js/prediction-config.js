// Public UI settings. Set enabled to false to hide the prediction button.
export const predictionConfig = Object.freeze({
    enabled: true,
    gameName: "WinGo[1 Min]",
    // Browser-side UI gate only: this code is public, not secure authentication.
    accessCode: "DMFIRST",
    unlockDurationMs: 1800,
    unlockHoldMs: 300,
    adminContact: Object.freeze({
        telegramUsername: "", // Enter the admin's Telegram username, with or without @.
        text: "@mr_kalam0",
        url: "", // Optional HTTPS, mailto:, or tel: contact link.
    }),
    spinDurationMs: 2400,
    reelStaggerMs: 180,
    // Text for the floating button, access screen, and prediction screen.
    text: Object.freeze({
        widgetLabel: "PREDICT",
        widgetAriaLabel: "Open predictions",
        brand: "DM FIRST",
        modeLabel: "SIMULATION",
        closeLabel: "Close predictions",
        codeLabel: "Access code",
        entryTitle: "Enter access code",
        entryHelp: "Enter your code to open the prediction preview.",
        unlockButton: "Unlock",
        openingProgress: "Opening preview",
        progressAriaLabel: "Opening prediction preview",
        unavailableError: "Access is unavailable right now.",
        requiredCodeError: "Enter your access code.",
        checkingTitle: "Checking code",
        checkingHelp: "Please wait while we check your code.",
        checkingProgress: "Checking access",
        deniedTitle: "Access denied",
        deniedHelp: "Check your code and try again.",
        invalidCodeError: "That code doesn't match. Try again.",
        retryButton: "Try again",
        adminTitle: "Contact Admin",
        adminChannel: "Telegram DM",
        numbersLabel: "Numbers",
        sizeLabel: "Big / Small",
        colorLabel: "Color",
        predictButton: "Predict",
        predictAgainButton: "Predict again",
        spinningButton: "Spinning…",
        idleStatus: "Select Predict to spin a preset combination.",
        spinningStatus: "Spinning preset combinations…",
        // Available placeholders: {first}, {second}, {size}, {color}.
        resultStatus: "{first} and {second} · {size} · {color}.",
        disclosure: "Preset simulation · No live game data",
        firstNumberLabel: "First number",
        secondNumberLabel: "Second number",
        sizeAriaLabel: "Size",
        colorAriaLabel: "Color",
        awaitingSelection: "Awaiting selection",
        placeholder: "—",
        small: "Small",
        big: "Big",
        green: "Green",
        violet: "Violet",
        red: "Red",
    }),
    resultBanner: Object.freeze({
        enabled: true,
        text: "SURE SHOT",
    }),
    // Preset simulation outcomes, not verified predictions of a live game.
    settlements: Object.freeze([
        Object.freeze({numbers: Object.freeze([1, 3]), size: "Small", color: "Green"}),
        Object.freeze({numbers: Object.freeze([2, 4]), size: "Small", color: "Red"}),
        Object.freeze({numbers: Object.freeze([6, 8]), size: "Big", color: "Red"}),
        Object.freeze({numbers: Object.freeze([7, 9]), size: "Big", color: "Green"}),
    ]),
});

/** Allow partial text overrides while retaining defaults for omitted fields. */
export function getPredictionText(settings = predictionConfig) {
    return Object.fromEntries(Object.entries(predictionConfig.text).map(([key, fallback]) => [
        key, typeof settings.text?.[key] === "string" ? settings.text[key] : fallback,
    ]));
}
