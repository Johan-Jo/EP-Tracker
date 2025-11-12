export const normalizeUnitValue = (unit?: string | null): string => {
	if (!unit || unit.trim() === '') return 'st';
	if (unit === 'm²') return 'm2';
	return unit;
};

export const formatUnitLabel = (unit?: string | null): string => {
	if (!unit || unit.trim() === '') return 'st';
	if (unit === 'm2' || unit === 'm²') return 'm²';
	return unit;
};

