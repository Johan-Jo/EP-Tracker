import { describe, expect, it } from '@jest/globals';
import { generateInvoiceCSV } from '@/lib/exports/invoice-csv';

describe('generateInvoiceCSV', () => {
	it('includes diary entries as descriptive rows', () => {
		const csv = generateInvoiceCSV(
			[
				{
					id: 'time-1',
					type: 'time',
					project_id: 'project-1',
					quantity: 3,
					unit: 'h',
					unit_price: 500,
					vat_rate: 25,
					description: 'Målning',
					dimensions: { project: 'Projekt Alfa' },
				},
			],
			[
				{
					date: '2025-03-05',
					raw: 'work_performed: Grundmålning av väggar\nandra lagret klart. deliveries: Färgleverans 50L crew_count: 4 weather: Mulet temperature_c: 5 signature_name: Anna Andersson',
					summary: 'Projekt Alfa - Dagbok\nArbete: Grundmålning av väggar andra lagret klart.\nLeveranser: Färgleverans 50L\nPersonal: 4\nVäder: Mulet 5°C\nSignerad av Anna Andersson',
					line_ref: 'diary-1',
				},
			],
			{
				invoice_number: 'INV-001',
				invoice_date: '2025-03-15',
				due_date: '2025-04-14',
				customer_id: 'customer-1',
				customer_snapshot: null,
				our_ref: null,
				your_ref: null,
				currency: 'SEK',
				project_id: 'project-1',
				period_start: '2025-03-01',
				period_end: '2025-03-31',
			}
		);

		const lines = csv.split('\n');
		const diaryLine = lines.find((line) => line.includes('Dagbok'));

		expect(diaryLine).toBeDefined();
		expect(diaryLine).toContain('Dagbok');
		// Diary summary contains the formatted text
		expect(diaryLine).toMatch(/Grundmålning av väggar andra lagret klart/);
	});
});








