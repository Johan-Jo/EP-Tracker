import type { Config } from 'tailwindcss';

const config: Config = {
	darkMode: 'class',
	content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
	theme: {
		extend: {
			colors: {
				gray: {
					50: '#FAFAF9',
					100: '#F5F5F4',
					200: '#E7E5E4',
					300: '#D6D3D1',
					400: '#A8A29E',
					500: '#78716C',
					600: '#57534E',
					700: '#44403C',
					800: '#292524',
					900: '#1C1917',
					950: '#0C0A09',
				},
				orange: {
					50: '#FFF7ED',
					100: '#FFEDD5',
					200: '#FED7AA',
					300: '#FDBA74',
					400: '#FB923C',
					500: '#F97316',
					600: '#EA580C',
					700: '#C2410C',
					800: '#9A3412',
					900: '#7C2D12',
					950: '#431407',
				},
				blue: {
					50: '#EFF6FF',
					100: '#DBEAFE',
					200: '#BFDBFE',
					300: '#93C5FD',
					400: '#60A5FA',
					500: '#3B82F6',
					600: '#2563EB',
					700: '#1D4ED8',
					800: '#1E3A8A',
					900: '#1E40AF',
					950: '#172554',
				},
				lime: {
					50: '#F7FFE5',
					100: '#EAFFCC',
					200: '#D6FF99',
					300: '#C0FF66',
					400: '#C7FF5E',
					500: '#B8FF3B',
					600: '#9FE02D',
					700: '#7AB81F',
					800: '#5C8F17',
					900: '#3F6510',
				},
			},
		},
	},
};

export default config;

