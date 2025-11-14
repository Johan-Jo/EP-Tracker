const digitsOnly = (value: string | null | undefined): string =>
	typeof value === 'string' ? value.replace(/\D/g, '') : '';

const luhnCheck = (input: string): boolean => {
	let sum = 0;
	let shouldDouble = false;

	for (let i = input.length - 1; i >= 0; i -= 1) {
		let digit = Number.parseInt(input[i] ?? '', 10);

		if (Number.isNaN(digit)) {
			return false;
		}

		if (shouldDouble) {
			digit *= 2;
			if (digit > 9) {
				digit -= 9;
			}
		}

		sum += digit;
		shouldDouble = !shouldDouble;
	}

	return sum % 10 === 0;
};

const isValidDate = (yy: number, mm: number, dd: number): boolean => {
	if (mm < 1 || mm > 12) {
		return false;
	}

	const day = dd > 60 ? dd - 60 : dd;
	if (day < 1) {
		return false;
	}

	const date = new Date(1900 + yy, mm - 1, day);
	return date.getMonth() === mm - 1 && date.getDate() === day;
};

export const normalizeSwedishOrganizationNumber = (
	value: string | null | undefined
): string | null => {
	let digits = digitsOnly(value);

	if (digits.length === 12) {
		digits = digits.slice(2);
	}

	if (digits.length !== 10) {
		return null;
	}

	if (!luhnCheck(digits)) {
		return null;
	}

	return digits;
};

export const normalizeSwedishPersonalIdentityNumber = (
	value: string | null | undefined
): string | null => {
	let digits = digitsOnly(value);

	if (digits.length === 12) {
		digits = digits.slice(2);
	}

	if (digits.length !== 10) {
		return null;
	}

	const yy = Number.parseInt(digits.slice(0, 2), 10);
	const mm = Number.parseInt(digits.slice(2, 4), 10);
	const dd = Number.parseInt(digits.slice(4, 6), 10);

	if (!isValidDate(yy, mm, dd)) {
		return null;
	}

	if (!luhnCheck(digits)) {
		return null;
	}

	return digits;
};

export const isValidSwedishOrganizationNumber = (value: string): boolean =>
	normalizeSwedishOrganizationNumber(value) !== null;

export const isValidSwedishPersonalIdentityNumber = (value: string): boolean =>
	normalizeSwedishPersonalIdentityNumber(value) !== null;

export const formatSwedishOrganizationNumber = (
	value: string | null | undefined
): string | null => {
	const normalized = normalizeSwedishOrganizationNumber(value);
	if (!normalized) {
		return null;
	}

	return `${normalized.slice(0, 6)}-${normalized.slice(6)}`;
};

export const formatSwedishPersonalIdentityNumber = (
	value: string | null | undefined
): string | null => {
	const normalized = normalizeSwedishPersonalIdentityNumber(value);
	if (!normalized) {
		return null;
	}

	return `${normalized.slice(0, 6)}-${normalized.slice(6)}`;
};

export const maskSwedishPersonalIdentityNumber = (
	value: string | null | undefined,
	visibleDigits = 2
): string | null => {
	const normalized = normalizeSwedishPersonalIdentityNumber(value);
	if (!normalized) {
		return null;
	}

	const prefix = normalized.slice(0, 6);
	const suffix = normalized.slice(6);
	const visibleSection = suffix.slice(-visibleDigits);
	const maskedSection = suffix
		.slice(0, Math.max(0, suffix.length - visibleDigits))
		.replace(/\d/g, '•');

	return `${prefix}-${maskedSection}${visibleSection}`;
};


