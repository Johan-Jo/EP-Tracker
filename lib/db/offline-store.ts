// Only import Dexie on client-side
let Dexie: any;
let EntityTable: any;

if (typeof window !== 'undefined') {
  const dexieModule = require('dexie');
  Dexie = dexieModule.default;
  EntityTable = dexieModule.EntityTable;
}

interface TimeEntry {
	id: string;
	org_id: string;
	project_id: string;
	phase_id?: string;
	work_order_id?: string;
	user_id: string;
	task_label?: string;
	start_at: string;
	stop_at?: string;
	notes?: string;
	status: 'draft' | 'submitted' | 'approved';
	synced: boolean;
	created_at: string;
	updated_at: string;
}

interface Material {
	id: string;
	org_id: string;
	project_id: string;
	phase_id?: string;
	user_id: string;
	description: string;
	qty: number;
	unit: string;
	unit_price_sek: number;
	photo_url?: string;
	synced: boolean;
	created_at: string;
}

interface Expense {
	id: string;
	org_id: string;
	project_id: string;
	user_id: string;
	category?: string;
	amount_sek: number;
	vat: boolean;
	photo_url?: string;
	synced: boolean;
	created_at: string;
}

interface Project {
	id: string;
	org_id: string;
	name: string;
	client_name?: string;
	site_lat?: number;
	site_lon?: number;
	radius_m?: number;
	budget_mode: string;
	created_at: string;
}

interface SyncQueue {
	id?: number;
	action: 'create' | 'update' | 'delete';
	entity: string;
	entity_id: string;
	payload: unknown;
	created_at: string;
	retry_count: number;
	last_error?: string;
}

interface MobileCheckin {
	id?: number;
	assignment_id: string;
	event: 'check_in' | 'check_out';
	ts: string;
	synced: boolean;
	created_at: string;
}

interface PlanningToday {
	id: string;
	assignment_data: unknown;
	cached_at: string;
}

// Initialize database only on client-side
let db: any = null;

function getDB() {
	if (typeof window === 'undefined') {
		// Return a mock object on server-side
		return null;
	}
	
	if (!db && Dexie) {
		db = new Dexie('EPTrackerDB') as Dexie & {
			time_entries: EntityTable<TimeEntry, 'id'>;
			materials: EntityTable<Material, 'id'>;
			expenses: EntityTable<Expense, 'id'>;
			projects: EntityTable<Project, 'id'>;
			sync_queue: EntityTable<SyncQueue, 'id'>;
			mobile_checkins: EntityTable<MobileCheckin, 'id'>;
			planning_today: EntityTable<PlanningToday, 'id'>;
		};

		// Schema declaration
		// Version 1: Original tables (time_entries, materials, expenses, projects, sync_queue)
		db.version(1).stores({
			time_entries: 'id, org_id, project_id, user_id, status, synced, created_at',
			materials: 'id, org_id, project_id, user_id, synced, created_at',
			expenses: 'id, org_id, project_id, user_id, synced, created_at',
			projects: 'id, org_id, created_at',
			sync_queue: '++id, action, entity, entity_id, created_at, retry_count',
		});

		// Version 2: Added planning system tables
		db.version(2).stores({
			time_entries: 'id, org_id, project_id, user_id, status, synced, created_at',
			materials: 'id, org_id, project_id, user_id, synced, created_at',
			expenses: 'id, org_id, project_id, user_id, synced, created_at',
			projects: 'id, org_id, created_at',
			sync_queue: '++id, action, entity, entity_id, created_at, retry_count',
			mobile_checkins: '++id, assignment_id, synced, created_at',
			planning_today: 'id, cached_at',
		});
	}
	
	return db;
}

export { getDB as db };
export type { TimeEntry, Material, Expense, Project, SyncQueue, MobileCheckin, PlanningToday };

