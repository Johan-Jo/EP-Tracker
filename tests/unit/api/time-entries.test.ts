import { NextRequest } from 'next/server';
import { GET as getTimeEntries } from '@/app/api/time/entries/route';
import { GET as getTimeEntriesStats } from '@/app/api/time/entries/stats/route';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/auth/get-session');
jest.mock('@/lib/supabase/server');

type SupabaseBuilder = {
	select: jest.MockedFunction<any>;
	eq: jest.MockedFunction<any>;
	order?: jest.MockedFunction<any>;
	gte: jest.MockedFunction<any>;
	lte?: jest.MockedFunction<any>;
	lt?: jest.MockedFunction<any>;
	in?: jest.MockedFunction<any>;
	range?: jest.MockedFunction<any>;
	then?: jest.MockedFunction<any>;
	catch?: jest.MockedFunction<any>;
	finally?: jest.MockedFunction<any>;
};

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('/api/time/entries', () => {
	beforeEach(() => {
		mockedGetSession.mockResolvedValue({
			user: { id: 'user-1' },
			membership: { org_id: 'org-1', role: 'admin' },
		} as any);
		mockedCreateClient.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('paginates results and returns diary data with hasMore indicator', async () => {
		const timeEntriesData = [
			{
				id: 'entry-1',
				org_id: 'org-1',
				user_id: 'user-1',
				project_id: 'project-1',
				start_at: '2025-11-12T07:00:00.000Z',
				stop_at: '2025-11-12T15:00:00.000Z',
				duration_min: 480,
				status: 'draft',
				billing_type: 'LOPANDE',
				task_label: 'Arbete',
				fixed_block_id: null,
				ata_id: null,
				project: { id: 'project-1', name: 'Projekt A' },
				user: { id: 'user-1', full_name: 'Admin User' },
			},
			{
				id: 'entry-2',
				org_id: 'org-1',
				user_id: 'user-1',
				project_id: 'project-2',
				start_at: '2025-11-11T07:00:00.000Z',
				stop_at: '2025-11-11T12:00:00.000Z',
				duration_min: 300,
				status: 'draft',
				billing_type: 'FAST',
				task_label: 'Förarbete',
				fixed_block_id: null,
				ata_id: null,
				project: { id: 'project-2', name: 'Projekt B' },
				user: { id: 'user-1', full_name: 'Admin User' },
			},
			{
				id: 'entry-3',
				org_id: 'org-1',
				user_id: 'user-1',
				project_id: 'project-2',
				start_at: '2025-11-10T07:00:00.000Z',
				stop_at: '2025-11-10T12:00:00.000Z',
				duration_min: 300,
				status: 'draft',
				billing_type: 'LOPANDE',
				task_label: 'Extra',
				fixed_block_id: null,
				ata_id: null,
				project: { id: 'project-2', name: 'Projekt B' },
				user: { id: 'user-1', full_name: 'Admin User' },
			},
		];

		const diaryEntriesData = [
			{
				id: 'diary-1',
				project_id: 'project-1',
				created_by: 'user-1',
				date: '2025-11-12',
				work_performed: 'Föreberedelser',
			},
		];

		const timeEntriesBuilder: SupabaseBuilder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			order: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockReturnThis(),
			in: jest.fn().mockReturnThis(),
			range: jest.fn().mockResolvedValue({ data: timeEntriesData, error: null }),
		};

		const diaryEntriesBuilder: SupabaseBuilder = {
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			in: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockResolvedValue({ data: diaryEntriesData, error: null }),
		};

		mockedCreateClient.mockResolvedValue({
			from: (table: string) => {
				if (table === 'time_entries') return timeEntriesBuilder;
				if (table === 'diary_entries') return diaryEntriesBuilder;
				throw new Error(`Unexpected table ${table}`);
			},
		} as any);

		const request = new NextRequest('http://localhost/api/time/entries?limit=2&page=0');
		const response = await getTimeEntries(request);
		const payload = await response.json();

		expect(payload.entries).toHaveLength(2);
		expect(payload.hasMore).toBe(true);
		expect(payload.page).toBe(0);
		expect(payload.entries[0].diary_entry?.id).toBe('diary-1');

		expect(timeEntriesBuilder.select).toHaveBeenCalledWith(expect.stringContaining('project:projects'));
		expect(timeEntriesBuilder.range).toHaveBeenCalledWith(0, 2);
	});
});

describe('/api/time/entries/stats', () => {
	beforeEach(() => {
		mockedGetSession.mockResolvedValue({
			user: { id: 'user-2' },
			membership: { org_id: 'org-1', role: 'admin' },
		} as any);
		mockedCreateClient.mockReset();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('returns aggregated duration buckets', async () => {
		const sums = [480, 240, 1800, 3600];

		const buildDurationBuilder = (minutes: number[]): SupabaseBuilder => {
			const data = minutes.map((value) => ({ duration_min: value }));
			const builder: SupabaseBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				lt: jest.fn().mockReturnThis(),
				lte: jest.fn().mockReturnThis(),
				then: jest.fn((resolve) => {
					resolve({ data, error: null });
					return Promise.resolve({ data, error: null });
				}),
				catch: jest.fn(() => builder),
				finally: jest.fn(() => builder),
			};
			return builder;
		};

		const fromMock = jest.fn(() => buildDurationBuilder([(sums.shift() ?? 0)]));

		mockedCreateClient.mockResolvedValue({
			from: fromMock,
		} as any);

		const request = new NextRequest('http://localhost/api/time/entries/stats');
		const response = await getTimeEntriesStats(request);
		const payload = await response.json();

		expect(payload).toEqual({
			today: 480,
			yesterday: 240,
			thisWeek: 1800,
			thisMonth: 3600,
		});
		expect(fromMock).toHaveBeenCalledTimes(4);
		fromMock.mock.results.forEach((result) => {
			const builder = result.value as SupabaseBuilder;
			expect(builder.select).toHaveBeenCalledWith('duration_min');
		});
	});
});

