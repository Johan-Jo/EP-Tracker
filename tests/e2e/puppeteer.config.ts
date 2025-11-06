import type { LaunchOptions } from 'puppeteer';

const config: LaunchOptions = {
	headless: process.env.HEADLESS !== 'false',
	slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
	defaultViewport: {
		width: 1280,
		height: 720,
	},
	args: [
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--disable-dev-shm-usage',
		'--disable-accelerated-2d-canvas',
		'--disable-gpu',
	],
	timeout: 60000,
};

export default config;
