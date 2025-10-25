/**
 * Query Keys Structure for React Query
 * 
 * PERFORMANCE OPTIMIZATION (Story 26.1):
 * Centralized query keys for consistent caching and invalidation
 * 
 * Usage:
 * - Use these keys for all useQuery and useMutation hooks
 * - Keys are hierarchical for easy invalidation
 * - Type-safe with TypeScript
 */

export const queryKeys = {
	// User & Auth
	session: ['session'] as const,
	profile: (userId: string) => ['profile', userId] as const,
	
	// Projects
	projects: {
		all: ['projects'] as const,
		list: (filters?: Record<string, any>) => ['projects', 'list', filters] as const,
		detail: (id: string) => ['projects', 'detail', id] as const,
		members: (id: string) => ['projects', 'members', id] as const,
		phases: (projectId: string) => ['projects', 'phases', projectId] as const,
		workOrders: (projectId: string) => ['projects', 'work-orders', projectId] as const,
	},
	
	// Time Entries
	timeEntries: {
		all: ['time-entries'] as const,
		list: (filters?: Record<string, any>) => ['time-entries', 'list', filters] as const,
		detail: (id: string) => ['time-entries', 'detail', id] as const,
		active: (userId: string) => ['time-entries', 'active', userId] as const,
		byProject: (projectId: string) => ['time-entries', 'by-project', projectId] as const,
		byUser: (userId: string) => ['time-entries', 'by-user', userId] as const,
	},
	
	// Materials
	materials: {
		all: ['materials'] as const,
		list: (filters?: Record<string, any>) => ['materials', 'list', filters] as const,
		detail: (id: string) => ['materials', 'detail', id] as const,
		byProject: (projectId: string) => ['materials', 'by-project', projectId] as const,
	},
	
	// Expenses
	expenses: {
		all: ['expenses'] as const,
		list: (filters?: Record<string, any>) => ['expenses', 'list', filters] as const,
		detail: (id: string) => ['expenses', 'detail', id] as const,
		byProject: (projectId: string) => ['expenses', 'by-project', projectId] as const,
	},
	
	// Mileage
	mileage: {
		all: ['mileage'] as const,
		list: (filters?: Record<string, any>) => ['mileage', 'list', filters] as const,
		detail: (id: string) => ['mileage', 'detail', id] as const,
	},
	
	// Dashboard
	dashboard: {
		stats: (userId: string, orgId: string) => ['dashboard', 'stats', userId, orgId] as const,
		activities: (orgId: string) => ['dashboard', 'activities', orgId] as const,
	},
	
	// ATA (Ändrings- och Tilläggsarbeten)
	ata: {
		all: ['ata'] as const,
		list: (filters?: Record<string, any>) => ['ata', 'list', filters] as const,
		detail: (id: string) => ['ata', 'detail', id] as const,
		byProject: (projectId: string) => ['ata', 'by-project', projectId] as const,
	},
	
	// Diary Entries
	diary: {
		all: ['diary'] as const,
		list: (filters?: Record<string, any>) => ['diary', 'list', filters] as const,
		detail: (id: string) => ['diary', 'detail', id] as const,
		byProject: (projectId: string) => ['diary', 'by-project', projectId] as const,
	},
	
	// Checklists
	checklists: {
		all: ['checklists'] as const,
		list: (filters?: Record<string, any>) => ['checklists', 'list', filters] as const,
		detail: (id: string) => ['checklists', 'detail', id] as const,
		templates: ['checklists', 'templates'] as const,
	},
	
	// Approvals
	approvals: {
		timeEntries: (filters?: Record<string, any>) => ['approvals', 'time-entries', filters] as const,
		materials: (filters?: Record<string, any>) => ['approvals', 'materials', filters] as const,
		expenses: (filters?: Record<string, any>) => ['approvals', 'expenses', filters] as const,
		history: (filters?: Record<string, any>) => ['approvals', 'history', filters] as const,
	},
	
	// Planning
	planning: {
		assignments: (filters?: Record<string, any>) => ['planning', 'assignments', filters] as const,
		today: (userId: string) => ['planning', 'today', userId] as const,
		week: (weekStart: string) => ['planning', 'week', weekStart] as const,
	},
	
	// Organization & Users
	organization: {
		details: (orgId: string) => ['organization', orgId] as const,
		members: (orgId: string) => ['organization', 'members', orgId] as const,
		settings: (orgId: string) => ['organization', 'settings', orgId] as const,
	},
	
	users: {
		all: ['users'] as const,
		list: (orgId: string) => ['users', 'list', orgId] as const,
		detail: (userId: string) => ['users', 'detail', userId] as const,
	},
} as const;

/**
 * Helper function to invalidate related queries after mutations
 * 
 * Example usage in a mutation:
 * ```typescript
 * const mutation = useMutation({
 *   mutationFn: createProject,
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
 *   },
 * });
 * ```
 */
export type QueryKeys = typeof queryKeys;

