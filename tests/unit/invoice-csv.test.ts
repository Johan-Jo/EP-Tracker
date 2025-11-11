import { describe, expect, it } from '@jest/globals';
import { generateInvoiceCSV } from '@/lib/exports/invoice-csv';

describe('generateInvoiceCSV', () => {
	it('includes diary entries as descriptive rows', () => {
		const csv = generateInvoiceCSV(
			[
				{
					id: 'time-1',
					project_id: 'project-1',
					start_at: '2025-03-05T07:00:00Z',
					duration_min: 180,
					task_label: 'Målning',
					project: { name: 'Projekt Alfa', project_number: 'A-100' },
					phase: { name: 'Fas 1' },
				},
			],
			[],
			[],
			[],
			[
				{
					id: 'diary-1',
					project_id: 'project-1',
					date: '2025-03-05',
					weather: 'Mulet',
					temperature_c: 5,
					crew_count: 4,
					work_performed: 'Grundmålning av väggar\nandra lagret klart.',
					obstacles: null,
					deliveries: 'Färgleverans 50L',
					visitors: null,
					signature_name: 'Anna Andersson',
					project: { name: 'Projekt Alfa', project_number: 'A-100' },
				},
			]
		);

		const lines = csv.split('\n');
		const diaryLine = lines.find((line) => line.includes('Dagbok'));

		expect(diaryLine).toBeDefined();
		expect(diaryLine).toContain('Projekt Alfa');
		expect(diaryLine).toContain('Dagbok');
		expect(diaryLine).toContain('Arbete: Grundmålning av väggar andra lagret klart.');
		expect(diaryLine).toContain('Leveranser: Färgleverans 50L');
		expect(diaryLine).toContain('Personal: 4');
		expect(diaryLine).toContain('Väder: Mulet 5°C');
		expect(diaryLine).toContain('Signerad av Anna Andersson');
	});
});




