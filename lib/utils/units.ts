const normalize = (unit?: string | null): string => {
	if (!unit) return 'st';
	const trimmed = unit.trim();
	if (trimmed === '') return 'st';

	const lower = trimmed.toLowerCase();
	if (lower === 'm2' || trimmed === 'm²') return 'm2';

	return trimmed;
};

export const normalizeUnitValue = (unit?: string | null): string => normalize(unit);

export const formatUnitLabel = (unit?: string | null): string => {
	if (!unit) return 'st';
	const trimmed = unit.trim();
	if (trimmed === '') return 'st';

	const lower = trimmed.toLowerCase();
	if (lower === 'm2' || trimmed === 'm²') return 'm²';

	return trimmed;
};

