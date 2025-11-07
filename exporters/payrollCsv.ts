import fs from 'node:fs';
import path from 'node:path';
import { stringify } from 'csv-stringify/sync';

export type CsvRow = {
	personnummer: string;
	namn?: string;
	period_from: string;
	period_to: string;
	datum: string;
	projekt?: string;
	kostnadsstalle?: string;
	loneart: string;
	loneartkod: string;
	antal: number;
	apris?: number;
	belopp?: number;
	avvikelse?: boolean;
	kommentar?: string;
};

export interface PayrollCsvMeta {
	periodFrom: string;
	periodTo: string;
	exportedAt?: string;
}

export interface PayrollCsvEmployee {
	name?: string;
	personalNumber: string;
}

export interface WritePayrollCsvParams {
	rows: CsvRow[];
	meta: PayrollCsvMeta;
	employee: PayrollCsvEmployee;
	/**
	 * Optional custom filename (without extension)
	 * When omitted, a default `loneunderlag_<period>_<name>` will be used
	 */
	fileBasename?: string;
	/**
	 * Directory where the CSV should be written. Defaults to `<cwd>/exports`.
	 */
	directory?: string;
}

const CSV_COLUMNS: Array<{ key: keyof CsvRow | 'avvikelse'; header: string }> = [
	{ key: 'datum', header: 'Datum' },
	{ key: 'projekt', header: 'Projekt' },
	{ key: 'loneart', header: 'Löneart' },
	{ key: 'antal', header: 'Antal tim' },
	{ key: 'apris', header: 'À-pris (SEK)' },
	{ key: 'belopp', header: 'Belopp (SEK)' },
	{ key: 'avvikelse', header: '⚠︎' },
	{ key: 'loneartkod', header: 'Löneartkod' },
	{ key: 'personnummer', header: 'Personnummer' },
	{ key: 'namn', header: 'Namn' },
	{ key: 'period_from', header: 'Period från' },
	{ key: 'period_to', header: 'Period till' },
	{ key: 'kostnadsstalle', header: 'Kostnadsställe' },
	{ key: 'kommentar', header: 'Kommentar/Källa' },
];

const DEFAULT_ROW: CsvRow = {
	personnummer: '',
	namn: '',
	period_from: '',
	period_to: '',
	datum: '',
	projekt: '',
	kostnadsstalle: '',
	loneart: '',
	loneartkod: '',
	antal: 0,
	apris: 0,
	belopp: 0,
	avvikelse: false,
	kommentar: '',
};

function ensureDirectory(directory: string) {
	if (!fs.existsSync(directory)) {
		fs.mkdirSync(directory, { recursive: true });
	}
}

function toTwoDecimals(value: number | undefined | null): string {
	if (value === undefined || value === null || Number.isNaN(value)) {
		return '';
	}

	return value.toFixed(2);
}

function sanitizePersonalNumber(value: string | undefined, fallback?: string): string {
	const personalNumber = value ?? fallback ?? '';
	return personalNumber.replace(/[^0-9]/g, '');
}

function formatRow(
	row: CsvRow,
	index: number,
	meta: PayrollCsvMeta,
	employee: PayrollCsvEmployee
): Record<string, string> {
	const merged: CsvRow = {
		...DEFAULT_ROW,
		...row,
		period_from: row.period_from || meta.periodFrom,
		period_to: row.period_to || meta.periodTo,
	};

	merged.personnummer = sanitizePersonalNumber(merged.personnummer, employee.personalNumber);
	merged.namn = merged.namn ?? employee.name ?? DEFAULT_ROW.namn;
	merged.loneartkod = merged.loneartkod || DEFAULT_ROW.loneartkod;
	merged.loneart = merged.loneart || DEFAULT_ROW.loneart;
	merged.projekt = merged.projekt ?? DEFAULT_ROW.projekt;
	merged.kostnadsstalle = merged.kostnadsstalle ?? DEFAULT_ROW.kostnadsstalle;
	merged.avvikelse = merged.avvikelse ?? false;

	if (!merged.personnummer) {
		throw new Error(`Rad ${index + 1}: saknar personnummer`);
	}

	if (!merged.loneartkod || merged.loneartkod.trim().length === 0) {
		throw new Error(`Rad ${index + 1}: saknar löneartsnummer`);
	}

	if (typeof merged.antal !== 'number' || Number.isNaN(merged.antal)) {
		throw new Error(`Rad ${index + 1}: antal måste vara number`);
	}

	const record: Record<string, string> = {};

	for (const column of CSV_COLUMNS) {
		let value: unknown;
		if (column.key === 'avvikelse') {
			value = merged.avvikelse ? '⚠︎' : '';
		} else {
			value = merged[column.key as keyof CsvRow];
		}

		if (column.key === 'personnummer') {
			record[column.header] = sanitizePersonalNumber(String(value), employee.personalNumber);
			continue;
		}

		if (column.key === 'antal') {
			record[column.header] = toTwoDecimals(merged.antal);
			continue;
		}

		if (column.key === 'apris') {
			record[column.header] = toTwoDecimals(merged.apris);
			continue;
		}

		if (column.key === 'belopp') {
			record[column.header] = toTwoDecimals(merged.belopp);
			continue;
		}

		if (column.key === 'avvikelse') {
			record[column.header] = value as string;
			continue;
		}

		const stringValue =
			value === undefined || value === null ? '' : typeof value === 'string' ? value : String(value);
		record[column.header] = stringValue;
	}

	return record;
}

export function writePayrollCsv(params: WritePayrollCsvParams): string {
	const { rows, meta, employee, directory, fileBasename } = params;

	if (!rows || rows.length === 0) {
		throw new Error('Minst en rad krävs för att generera CSV');
	}

	const targetDir = directory ?? path.join(process.cwd(), 'exports');
	ensureDirectory(targetDir);

	const safeName = employee.name ? employee.name.replace(/\s+/g, '_') : 'medarbetare';
	const base = fileBasename ?? `loneunderlag_${meta.periodFrom}_${meta.periodTo}_${safeName}`;
	const filePath = path.join(targetDir, `${base}.csv`);

	const formattedRows = rows.map((row, index) => formatRow(row, index, meta, employee));
	const csv = stringify(formattedRows, {
		header: true,
		columns: CSV_COLUMNS.map((c) => ({ key: c.header, header: c.header })),
		delimiter: ',',
		record_delimiter: '\n',
		quoted_match: /\n|,|"/,
	});

	const csvWithBom = '\uFEFF' + csv;

	fs.writeFileSync(filePath, csvWithBom, 'utf8');
	return filePath;
}

