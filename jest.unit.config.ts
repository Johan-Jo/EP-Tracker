import type { Config } from 'jest';

const config: Config = {
	preset: 'ts-jest/presets/default-esm',
	testEnvironment: 'node',
	roots: ['<rootDir>/tests/unit'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/$1',
		// Mock email templates (TSX files) for unit tests
		'\\.tsx$': '<rootDir>/tests/__mocks__/tsx-mock.ts',
	},
	extensionsToTreatAsEsm: ['.ts', '.tsx'],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				useESM: true,
				tsconfig: {
					jsx: 'react',
				},
			},
		],
	},
	transformIgnorePatterns: [
		// Don't transform email templates - mock them instead
		'node_modules/(?!@react-email)',
	],
	globals: {
		'ts-jest': {
			useESM: true,
			tsconfig: '<rootDir>/tsconfig.json',
		},
	},
};

export default config;

