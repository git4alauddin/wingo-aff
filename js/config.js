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
  guidance: { enabled: true, src: './assets/audio/wingo_guide.mp3' },
  copyCodeDemo: {
    heading: 'Already deposited?', caption: 'Visual demo', buttonText: 'Copy Code',
    loadingText: 'Copying…', completeText: 'Complete',
  },
});

export { predictionConfig } from './prediction-config.js';
