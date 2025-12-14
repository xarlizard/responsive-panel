export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: {
        target: "ES2022",
        module: "ESNext",
      }
    }],
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/__tests__/**/*"],
  moduleFileExtensions: ["ts", "js"],
  testPathIgnorePatterns: ["node_modules", "dist"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  extensionsToTreatAsEsm: [],
};
