import Dexie, { type EntityTable } from 'dexie';

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

const db = new Dexie('EPTrackerDB') as Dexie & {
	time_entries: EntityTable<TimeEntry, 'id'>;
	materials: EntityTable<Material, 'id'>;
	expenses: EntityTable<Expense, 'id'>;
	projects: EntityTable<Project, 'id'>;
	sync_queue: EntityTable<SyncQueue, 'id'>;
};

// Schema declaration
db.version(1).stores({
	time_entries: 'id, org_id, project_id, user_id, status, synced, created_at',
	materials: 'id, org_id, project_id, user_id, synced, created_at',
	expenses: 'id, org_id, project_id, user_id, synced, created_at',
	projects: 'id, org_id, created_at',
	sync_queue: '++id, action, entity, entity_id, created_at, retry_count',
});

export { db };
export type { TimeEntry, Material, Expense, Project, SyncQueue };

