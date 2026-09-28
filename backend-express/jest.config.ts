import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/src/tests/setup.ts"],

  extensionsToTreatAsEsm: [".ts"],

  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
        },
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },

  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)\\.js$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  moduleFileExtensions: ["ts", "js", "json"],

  testMatch: [
    "**/modules/**/_tests_/**/*.test.ts",
    "**/?(*.)+(spec|test).ts",
  ],

  clearMocks: true,
};

export default config;
