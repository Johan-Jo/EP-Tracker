import type { Browser } from 'playwright-core';

type LambdaChromium = {
	args: string[];
	headless: boolean;
	executablePath: () => Promise<string>;
};

/**
 * Launch a Chromium instance that works both locally (Playwright bundled browser)
 * and in serverless environments (Vercel/AWS Lambda) where we rely on
 * `@sparticuz/chromium`.
 */
export async function launchChromium(): Promise<Browser> {
	const isServerless =
		!!process.env.AWS_REGION ||
		!!process.env.AWS_EXECUTION_ENV ||
		!!process.env.AWS_LAMBDA_FUNCTION_VERSION ||
		!!process.env.VERCEL;

	if (isServerless) {
		const [{ chromium }, chromiumLambdaModule] = await Promise.all([
			import('playwright-core'),
			import('@sparticuz/chromium'),
		]);
		const lambdaChromium = chromiumLambdaModule as unknown as LambdaChromium;

		const executablePath = await lambdaChromium.executablePath();

		return chromium.launch({
			args: lambdaChromium.args,
			executablePath,
			headless: lambdaChromium.headless,
			timeout: 15000,
		});
	}

	// Local/dev environment – rely on the full Playwright package with bundled browsers
	const { chromium } = await import('playwright');
	return chromium.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		timeout: 15000,
	});
}


