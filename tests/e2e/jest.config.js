/** @type {import('jest').Config} */
const config = {
	rootDir: '../../',
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/tests/e2e/**/*.test.ts'],
	testTimeout: 120000, // Increased to 2 minutes for login operations
	maxWorkers: 1, // Run tests sequentially to avoid conflicts
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1',
	},
	setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.ts'],
	extensionsToTreatAsEsm: ['.ts'],
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: {
					esModuleInterop: true,
					allowSyntheticDefaultImports: true,
				},
			},
		],
	},
};

module.exports = config;

