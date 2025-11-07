import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, test } from '@jest/globals';
import { exportPayrollFiles } from '@/exporters/csvToPaxml';
import type { CsvRow } from '@/exporters/payrollCsv';

const tempDirs: string[] = [];

afterAll(() => {
	tempDirs.forEach((dir) => {
		if (fs.existsSync(dir)) {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe('Payroll CSV + PAXml export', () => {
	test('sums of amount values matches between CSV and PAXml', () => {
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'payroll-export-'));
		tempDirs.push(tmpDir);

		const rows: CsvRow[] = [
			{
				personnummer: '19800101-9999',
				namn: 'Johan Jonsson',
				period_from: '2025-10-01',
				period_to: '2025-10-31',
				datum: '2025-10-27',
				projekt: 'Projekt Alfa',
				kostnadsstalle: '1001',
				loneartkod: '1202',
				loneart: 'Övertid Kvalificerad',
				antal: 81.66,
				apris: 202.5,
				belopp: 16536.15,
				kommentar: 'Övertid helgjobb',
			},
			{
				personnummer: '19800101-9999',
				namn: 'Johan Jonsson',
				period_from: '2025-10-01',
				period_to: '2025-10-31',
				datum: '2025-10-27',
				projekt: 'Projekt Alfa',
				kostnadsstalle: '1001',
				loneartkod: '1305',
				loneart: 'OB Storhelg',
				antal: 149.7,
				apris: 270,
				belopp: 40419,
				kommentar: 'Storhelg',
			},
		];

		const result = exportPayrollFiles({
			rows,
			meta: { periodFrom: '2025-10-01', periodTo: '2025-10-31' },
			employee: {
				name: 'Johan Jonsson',
				personalNumber: '198001019999',
			},
			directory: tmpDir,
		});

		expect(fs.existsSync(result.csvPath)).toBe(true);
		expect(fs.existsSync(result.xmlPath)).toBe(true);

		const csvContent = fs.readFileSync(result.csvPath, 'utf8');
		const xmlContent = fs.readFileSync(result.xmlPath, 'utf8');

		const expectedCsvTotal = rows.reduce((sum, row) => sum + (row.belopp ?? 0), 0);
		const xmlAmounts = Array.from(xmlContent.matchAll(/<Amount>(.*?)<\/Amount>/g)).map((match) =>
			Number.parseFloat(match[1])
		);
		const xmlTotal = xmlAmounts.reduce((sum, amount) => sum + amount, 0);

		expect(result.totalAmount).toBeCloseTo(expectedCsvTotal, 2);
		expect(xmlTotal).toBeCloseTo(expectedCsvTotal, 2);
		expect(csvContent).toContain('198001019999');
		expect(xmlContent).toContain('<SocialSecurityNumber>198001019999</SocialSecurityNumber>');
	});
});

