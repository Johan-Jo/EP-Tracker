import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

const eslintConfig = [
    {
        ignores: [
            'next-env.d.ts',
            '.next/**',
            'out/**',
            'node_modules/**',
            'docs/**',
            'public/**',
            'scripts/**',
        ],
    },
	...compat.extends('next/core-web-vitals', 'next/typescript'),
	{
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'prefer-const': 'warn',
            // Allow console statements across the repo to avoid CI failures on warnings
            'no-console': 'off',
		},
	},
];

export default eslintConfig;
