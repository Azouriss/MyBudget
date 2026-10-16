/** @type {import('tailwindcss').Config} */
const tokens = require('./src/theme/tokens.json');

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {
    colors: { ...tokens.palette, ...tokens.accessible },
    fontFamily: {
      sans: ['Inter-Regular'], medium: ['Inter-Medium'],
      semibold: ['Inter-SemiBold'], bold: ['Inter-Bold'],
    },
  } },
  plugins: [],
};
