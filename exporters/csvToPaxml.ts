import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { writePayrollCsv, WritePayrollCsvParams } from './payrollCsv';

type CsvRecord = Record<string, string>;

const COLUMN = {
	PERSONNUMMER: 'Personnummer',
	NAMN: 'Namn',
	PERIOD_FROM: 'Period från',
	PERIOD_TO: 'Period till',
	DATUM: 'Datum',
	PROJEKT: 'Projekt',
	LONEART: 'Löneart',
	LONEARTKOD: 'Löneartkod',
	ANTAL: 'Antal tim',
	APRIS: 'À-pris (SEK)',
	BELOPP: 'Belopp (SEK)',
	AVVIKELSE: '⚠︎',
	KOSTNADSSTALLE: 'Kostnadsställe',
	KOMMENTAR: 'Kommentar/Källa',
} as const;

export interface CsvToPaxmlOptions {
	csvPath: string;
	xmlPath?: string;
}

export interface CsvToPaxmlResult {
	xmlPath: string;
	payrollCount: number;
	salaryRowCount: number;
	totalAmount: number;
}

export interface PayrollExportResult extends CsvToPaxmlResult {
	csvPath: string;
}

function ensureDirectory(directory: string) {
	if (!fs.existsSync(directory)) {
		fs.mkdirSync(directory, { recursive: true });
	}
}

function formatDecimal(value: string | number): string {
	if (typeof value === 'number') {
		return value.toFixed(2);
	}

	const normalized = value.replace(',', '.').trim();
	const numeric = Number.parseFloat(normalized);

	if (Number.isNaN(numeric)) {
		throw new Error(`Ogiltigt numeriskt värde: ${value}`);
	}

	return numeric.toFixed(2);
}

function sanitizePersonalNumber(value: string): string {
	return value.replace(/[^0-9]/g, '');
}

function escapeXml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseCsv(csvPath: string): CsvRecord[] {
	if (!fs.existsSync(csvPath)) {
		throw new Error(`CSV-fil saknas: ${csvPath}`);
	}

	const content = fs.readFileSync(csvPath, 'utf8');

	return parse(content, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
		bom: true,
	}) as CsvRecord[];
}

export function csvToPaxml(options: CsvToPaxmlOptions): CsvToPaxmlResult {
	const { csvPath } = options;
	const records = parseCsv(csvPath);

	if (records.length === 0) {
		throw new Error('CSV saknar rader att konvertera');
	}

	const xmlPath =
		options.xmlPath ??
		(() => {
			const directory = path.dirname(csvPath);
			const basename = path.basename(csvPath, path.extname(csvPath));
			return path.join(directory, `${basename}.xml`);
		})();

	ensureDirectory(path.dirname(xmlPath));

	const grouped = new Map<
		string,
		{
			personnummer: string;
			periodFrom: string;
			periodTo: string;
			namn?: string;
			rows: CsvRecord[];
		}
	>();

	let totalAmount = 0;
	let salaryRowCount = 0;

	records.forEach((record, index) => {
		const personnummer = sanitizePersonalNumber(record[COLUMN.PERSONNUMMER] ?? '');
		const lonenr = record[COLUMN.LONEARTKOD];
		const antalRaw = record[COLUMN.ANTAL];
		const periodFrom = record[COLUMN.PERIOD_FROM];
		const periodTo = record[COLUMN.PERIOD_TO];

		if (!personnummer) {
			throw new Error(`CSV rad ${index + 1} saknar personnummer`);
		}
		if (!lonenr) {
			throw new Error(`CSV rad ${index + 1} saknar löneartsnummer`);
		}
		if (antalRaw === undefined || antalRaw === null || String(antalRaw).trim() === '') {
			throw new Error(`CSV rad ${index + 1} saknar antal`);
		}
		if (!periodFrom || !periodTo) {
			throw new Error(`CSV rad ${index + 1} saknar period (period_from/period_to)`);
		}

		const quantity = Number.parseFloat(String(antalRaw).replace(',', '.'));
		if (Number.isNaN(quantity)) {
			throw new Error(`CSV rad ${index + 1} har ogiltigt antal: ${antalRaw}`);
		}

		const amountValue = record[COLUMN.BELOPP]
			? Number.parseFloat(String(record[COLUMN.BELOPP]).replace(',', '.'))
			: null;
		if (record[COLUMN.BELOPP] && Number.isNaN(amountValue)) {
			throw new Error(`CSV rad ${index + 1} har ogiltigt belopp: ${record[COLUMN.BELOPP]}`);
		}

		if (amountValue !== null) {
			totalAmount += amountValue;
		}

		salaryRowCount += 1;

		const key = `${personnummer}|${periodFrom}|${periodTo}`;
		if (!grouped.has(key)) {
			grouped.set(key, {
				personnummer,
				periodFrom,
				periodTo,
				namn: record[COLUMN.NAMN],
				rows: [],
			});
		}

		grouped.get(key)!.rows.push({
			...record,
			antal: formatDecimal(antalRaw),
			belopp: record[COLUMN.BELOPP] ? formatDecimal(record[COLUMN.BELOPP]) : '',
			personnummer,
		});
	});

	let xml = '<?xml version="1.0" encoding="utf-8"?>\n<PAXml>\n  <Payrolls>\n';

	for (const group of grouped.values()) {
		xml += '    <Payroll>\n';
		xml += '      <Employee>\n';
		xml += `        <SocialSecurityNumber>${group.personnummer}</SocialSecurityNumber>\n`;
		if (group.namn) {
			xml += `        <Name>${escapeXml(group.namn)}</Name>\n`;
		}
		xml += '      </Employee>\n';
		xml += '      <Period>\n';
		xml += `        <From>${group.periodFrom}</From>\n`;
		xml += `        <To>${group.periodTo}</To>\n`;
		xml += '      </Period>\n';
		xml += '      <SalaryRows>\n';

		group.rows.forEach((row) => {
			xml += '        <SalaryRow>\n';
			xml += `          <WageTypeNumber>${escapeXml(row[COLUMN.LONEARTKOD])}</WageTypeNumber>\n`;
			xml += `          <Quantity>${row.antal}</Quantity>\n`;
			if (row.belopp) {
				xml += `          <Amount>${row.belopp}</Amount>\n`;
			}
			if (row[COLUMN.PROJEKT]) {
				xml += `          <Project>${escapeXml(row[COLUMN.PROJEKT])}</Project>\n`;
			}
			if (row[COLUMN.KOSTNADSSTALLE]) {
				xml += `          <CostCenter>${escapeXml(row[COLUMN.KOSTNADSSTALLE])}</CostCenter>\n`;
			}
			if (row[COLUMN.KOMMENTAR]) {
				xml += `          <Comment>${escapeXml(row[COLUMN.KOMMENTAR])}</Comment>\n`;
			}
			xml += '        </SalaryRow>\n';
		});

		xml += '      </SalaryRows>\n';
		xml += '    </Payroll>\n';
	}

	xml += '  </Payrolls>\n</PAXml>\n';

	fs.writeFileSync(xmlPath, xml, 'utf8');

	return {
		xmlPath,
		payrollCount: grouped.size,
		salaryRowCount,
		totalAmount: Number.parseFloat(totalAmount.toFixed(2)),
	};
}

export function exportPayrollFiles(
	params: WritePayrollCsvParams & { directory?: string; fileBasename?: string }
): PayrollExportResult {
	const csvPath = writePayrollCsv(params);
	const xmlResult = csvToPaxml({ csvPath });

	return {
		csvPath,
		...xmlResult,
	};
}

