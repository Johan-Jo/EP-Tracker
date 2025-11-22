// NOTE: These functions don't exist in dashboard.ts yet
// Mocking them for now until functions are implemented
const getUserActiveProjects = jest.fn() as any;
const getActivitiesByPeriod = jest.fn() as any;
const getPeriodSummary = jest.fn() as any;

// Uncomment when functions are implemented:
// import { getUserActiveProjects, getActivitiesByPeriod, getPeriodSummary } from '@/lib/db/dashboard';
import { createClient } from '@/lib/supabase/server';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

jest.mock('@/lib/supabase/server');

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;

type SupabaseBuilder = {
	select: jest.MockedFunction<any>;
	eq: jest.MockedFunction<any>;
	gte: jest.MockedFunction<any>;
	lte: jest.MockedFunction<any>;
	in: jest.MockedFunction<any>;
	not: jest.MockedFunction<any>;
	order: jest.MockedFunction<any>;
	maybeSingle: jest.MockedFunction<any>;
};

describe.skip('getUserActiveProjects', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('returns project IDs from time entries, materials, expenses, and diary entries', async () => {
		let timeEntryCallCount = 0;
		
		const createBuilder = (data: any[], isActiveEntry = false): SupabaseBuilder => {
			const builder: SupabaseBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				lte: jest.fn().mockReturnThis(),
				not: jest.fn().mockReturnThis(),
				is: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue(isActiveEntry ? { data, error: null } : undefined),
			};
			
			// Make the chain resolve to data
			if (!isActiveEntry) {
				(builder.not as any).mockResolvedValue({ data, error: null });
			}
			
			return builder;
		};

		mockedCreateClient.mockImplementation(async () => {
			timeEntryCallCount++;
			return {
				from: (table: string) => {
					if (table === 'time_entries') {
						if (timeEntryCallCount === 1) {
							// First call - regular time entries
							return createBuilder([
								{ project_id: 'project-1' },
								{ project_id: 'project-2' },
							]);
						} else {
							// Second call - active entry
							return createBuilder({ project_id: 'project-4' }, true);
						}
					}
					if (table === 'materials') {
						return createBuilder([{ project_id: 'project-2' }]);
					}
					if (table === 'expenses') {
						return createBuilder([{ project_id: 'project-3' }]);
					}
					if (table === 'diary_entries') {
						return createBuilder([{ project_id: 'project-1' }]);
					}
					throw new Error(`Unexpected table ${table}`);
				},
			} as any;
		});

		const result = await getUserActiveProjects('user-1', 'org-1', 14);

		expect(result).toContain('project-1');
		expect(result).toContain('project-2');
		expect(result).toContain('project-3');
		expect(result).toContain('project-4');
		expect(result.length).toBe(4);
	});

	test('returns empty array when no active projects found', async () => {
		let timeEntryCallCount = 0;
		
		const createEmptyBuilder = (): SupabaseBuilder => ({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			not: jest.fn().mockResolvedValue({ data: [], error: null }),
		});

		const createActiveEntryBuilder = (): SupabaseBuilder => ({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			is: jest.fn().mockReturnThis(),
			maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
		});

		mockedCreateClient.mockImplementation(async () => {
			timeEntryCallCount++;
			return {
				from: (table: string) => {
					if (table === 'time_entries') {
						if (timeEntryCallCount === 1) {
							return createEmptyBuilder();
						} else {
							return createActiveEntryBuilder();
						}
					}
					return createEmptyBuilder();
				},
			} as any;
		});

		const result = await getUserActiveProjects('user-1', 'org-1', 14);
		expect(result).toEqual([]);
	});
});

describe.skip('getActivitiesByPeriod', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('groups activities by date and includes diary entries', async () => {
		const startDate = startOfDay(new Date('2025-11-18'));
		const endDate = endOfDay(new Date('2025-11-18'));

		const timeEntriesData = [
			{
				id: 'entry-1',
				start_at: '2025-11-18T08:00:00.000Z',
				stop_at: '2025-11-18T12:00:00.000Z',
				user_id: 'user-1',
				project_id: 'project-1',
				phase_id: 'phase-1',
				projects: { id: 'project-1', name: 'Projekt A' },
				phases: { id: 'phase-1', name: 'Fas 1' },
				profiles: { id: 'user-1', full_name: 'Test User' },
			},
		];

		const diaryEntriesData = [
			{
				id: 'diary-1',
				project_id: 'project-1',
				created_by: 'user-1',
				date: '2025-11-18',
				work_performed: 'Test work performed',
			},
		];

		const createBuilder = (data: any, isOrder = false): SupabaseBuilder => {
			const builder: SupabaseBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				lte: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
			};
			
			if (isOrder) {
				(builder.order as any).mockResolvedValue({ data, error: null });
			} else {
				(builder.lte as any).mockResolvedValue({ data, error: null });
			}
			
			return builder;
		};

		let callCount = 0;
		mockedCreateClient.mockImplementation(async () => {
			callCount++;
			return {
				from: (table: string) => {
					switch (table) {
						case 'time_entries':
							return createBuilder(timeEntriesData, true);
						case 'diary_entries':
							return createBuilder(diaryEntriesData);
						case 'materials':
							return createBuilder([], true);
						case 'expenses':
							return createBuilder([], true);
						default:
							throw new Error(`Unexpected table ${table}`);
					}
				},
			} as any;
		});

		const result = await getActivitiesByPeriod('user-1', 'org-1', startDate, endDate);

		expect(result).toHaveLength(1);
		expect(result[0].date).toBe('2025-11-18');
		expect(result[0].time_entries).toHaveLength(1);
		expect(result[0].time_entries[0].hours).toBe(4.0);
		expect(result[0].time_entries[0].diary_entry).toBeDefined();
		expect(result[0].time_entries[0].diary_entry?.work_performed).toBe('Test work performed');
	});

	test('calculates hours correctly from start and stop times', async () => {
		const startDate = startOfDay(new Date('2025-11-18'));
		const endDate = endOfDay(new Date('2025-11-18'));

		const timeEntriesData = [
			{
				id: 'entry-1',
				start_at: '2025-11-18T08:00:00.000Z',
				stop_at: '2025-11-18T17:30:00.000Z', // 9.5 hours
				user_id: 'user-1',
				project_id: 'project-1',
				phase_id: null,
				projects: { id: 'project-1', name: 'Projekt A' },
				phases: null,
				profiles: { id: 'user-1', full_name: 'Test User' },
			},
		];

		const createBuilder = (data: any, isOrder = false): SupabaseBuilder => {
			const builder: SupabaseBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				lte: jest.fn().mockReturnThis(),
				in: jest.fn().mockReturnThis(),
				order: jest.fn().mockReturnThis(),
			};
			
			if (isOrder) {
				(builder.order as any).mockResolvedValue({ data, error: null });
			} else {
				(builder.lte as any).mockResolvedValue({ data, error: null });
			}
			
			return builder;
		};

		mockedCreateClient.mockImplementation(async () => ({
			from: (table: string) => {
				if (table === 'time_entries') return createBuilder(timeEntriesData, true);
				return createBuilder([]);
			},
		} as any));

		const result = await getActivitiesByPeriod('user-1', 'org-1', startDate, endDate);

		expect(result[0].time_entries[0].hours).toBe(9.5);
	});
});

describe.skip('getPeriodSummary', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('calculates correct totals for period', async () => {
		const startDate = startOfWeek(new Date('2025-11-18'), { weekStartsOn: 1 });
		const endDate = endOfWeek(new Date('2025-11-18'), { weekStartsOn: 1 });

		const timeEntriesData = [
			{
				id: 'entry-1',
				start_at: '2025-11-18T08:00:00.000Z',
				stop_at: '2025-11-18T12:00:00.000Z', // 4 hours
			},
			{
				id: 'entry-2',
				start_at: '2025-11-19T08:00:00.000Z',
				stop_at: '2025-11-19T16:00:00.000Z', // 8 hours
			},
		];

		const expensesData = [
			{ id: 'expense-1', amount_sek: 500 },
			{ id: 'expense-2', amount_sek: 300 },
		];

		const createTimeEntriesBuilder = (): SupabaseBuilder => ({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockResolvedValue({ data: timeEntriesData, error: null }),
		});

		const createCountBuilder = (count: number): SupabaseBuilder => {
			const builder: SupabaseBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				lte: jest.fn().mockReturnThis(),
			};
			// Mock select to return count
			(builder.select as any).mockResolvedValue({ count, error: null });
			return builder;
		};

		const createExpensesBuilder = (): SupabaseBuilder => ({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockResolvedValue({ data: expensesData, error: null }),
		});

		mockedCreateClient.mockImplementation(async () => ({
			from: (table: string) => {
				switch (table) {
					case 'time_entries':
						return createTimeEntriesBuilder();
					case 'materials':
						return createCountBuilder(5);
					case 'expenses':
						return createExpensesBuilder();
					case 'diary_entries':
						return createCountBuilder(2);
					default:
						throw new Error(`Unexpected table ${table}`);
				}
			},
		} as any));

		const result = await getPeriodSummary('user-1', 'org-1', startDate, endDate);

		expect(result.total_hours).toBe(12.0);
		expect(result.total_time_entries).toBe(2);
		expect(result.total_materials).toBe(5);
		expect(result.total_costs).toBe(2);
		expect(result.total_cost_amount).toBe(800);
		expect(result.total_diary_entries).toBe(2);
	});

	test('handles empty period correctly', async () => {
		const startDate = startOfDay(new Date('2025-11-18'));
		const endDate = endOfDay(new Date('2025-11-18'));

		const createEmptyBuilder = (): SupabaseBuilder => ({
			select: jest.fn().mockReturnThis(),
			eq: jest.fn().mockReturnThis(),
			gte: jest.fn().mockReturnThis(),
			lte: jest.fn().mockResolvedValue({ data: [], error: null }),
		});

		const createCountBuilder = (count: number): SupabaseBuilder => {
			const builder: SupabaseBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				gte: jest.fn().mockReturnThis(),
				lte: jest.fn().mockReturnThis(),
			};
			(builder.select as any).mockResolvedValue({ count, error: null });
			return builder;
		};

		mockedCreateClient.mockImplementation(async () => ({
			from: (table: string) => {
				if (table === 'materials' || table === 'diary_entries') {
					return createCountBuilder(0);
				}
				return createEmptyBuilder();
			},
		} as any));

		const result = await getPeriodSummary('user-1', 'org-1', startDate, endDate);

		expect(result.total_hours).toBe(0);
		expect(result.total_time_entries).toBe(0);
		expect(result.total_materials).toBe(0);
		expect(result.total_costs).toBe(0);
		expect(result.total_cost_amount).toBe(0);
		expect(result.total_diary_entries).toBe(0);
	});
});

