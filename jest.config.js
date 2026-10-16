module.exports = {
  // These suites exercise pure TypeScript and real node:sqlite, without native UI.
  // Loading the Android runtime here also loads unrelated Expo/native mocks.
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  watchman: false,
  transform: {
    '^.+\\.tsx?$': ['babel-jest', {
      babelrc: false,
      configFile: false,
      presets: ['@babel/preset-typescript'],
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    }],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/lib/**/*.ts', 'src/features/transactions/validation.ts'],
};
