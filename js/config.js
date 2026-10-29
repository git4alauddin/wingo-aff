// Public affiliate destinations carried over from the Aviator reference.
export const config = Object.freeze({
  creatorStudio: { enabled: true, url: './creator-studio.html' },
  registerUrl: 'https://www.dmfirst0.com/#/register?invitationCode=93458117528',
  registrationPage: './registration.html',
  depositUrl: 'https://www.dmfirst0.com/#/wallet/Recharge',
  minimumDeposit: 1000,
  depositCurrency: 'INR',
  popupDelayMs: 1000,
  sequence: { fillMs: 1800, holdMs: 300, unlockMs: 0 },
  guidance: { enabled: true, src: './assets/audio/registration-guide.mp3' },
  copyCodeDemo: {
    heading: 'Already deposited?', caption: 'Visual demo', buttonText: 'Copy Code',
    loadingText: 'Copying…', completeText: 'Complete',
  },
});

// These codes are browser-side UI gates, not secure authentication.
export const predictionConfig = Object.freeze({
  enabled: true, accessCode: 'DMFIRST', revealDurationMs: 1000,
  outcomes: [7, 2, 0, 5, 9, 4, 1, 8, 3, 6],
  adminContact: '@mr_kalam0',
});
