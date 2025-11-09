/**
 * Generate a numeric OCR reference using Mod 10 with recursive weighting.
 * Accepts only digits in source string; other characters are stripped.
 */
export function generateOcrMod10(source: string): string {
	const digits = (source.match(/\d+/g) || []).join('');
	if (!digits) {
		throw new Error('Cannot generate OCR: source must contain digits');
	}

	let sum = 0;
	let weight = 2;

	for (let i = digits.length - 1; i >= 0; i -= 1) {
		const product = Number(digits[i]) * weight;
		sum += Math.floor(product / 10) + (product % 10);
		weight = weight === 2 ? 1 : 2;
	}

	const checksum = (10 - (sum % 10)) % 10;
	return `${digits}${checksum}`;
}



