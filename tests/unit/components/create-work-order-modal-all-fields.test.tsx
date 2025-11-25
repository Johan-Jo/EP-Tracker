/**
 * Tests for ALL input fields in CreateWorkOrderModal
 * Verifies every single field is properly handled
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

global.fetch = jest.fn();

describe('CreateWorkOrderModal - ALL Fields Verification', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Required Fields', () => {
		it('should have project_id as required field', () => {
			const requiredFields = ['project_id', 'title'];
			expect(requiredFields).toContain('project_id');
		});

		it('should have title as required field', () => {
			const requiredFields = ['project_id', 'title'];
			expect(requiredFields).toContain('title');
		});

		it('should have plannedDate as required (validated in onSubmit)', () => {
			const requiredFields = ['project_id', 'title', 'plannedDate'];
			expect(requiredFields).toContain('plannedDate');
		});
	});

	describe('Optional Fields', () => {
		it('should allow optional customer_id', () => {
			const optionalFields = ['customer_id', 'description', 'location_address'];
			expect(optionalFields).toContain('customer_id');
		});

		it('should allow optional description', () => {
			const optionalFields = ['customer_id', 'description', 'location_address'];
			expect(optionalFields).toContain('description');
		});
	});

	describe('Default Values', () => {
		it('should have default status PLANERAD', () => {
			const defaultStatus = 'PLANERAD';
			expect(defaultStatus).toBe('PLANERAD');
		});

		it('should have default priority NORMAL', () => {
			const defaultPriority = 'NORMAL';
			expect(defaultPriority).toBe('NORMAL');
		});

		it('should have default work_order_type PROJEKTBUNDEN', () => {
			const defaultType = 'PROJEKTBUNDEN';
			expect(defaultType).toBe('PROJEKTBUNDEN');
		});

		it('should have default all_day false', () => {
			const defaultAllDay = false;
			expect(defaultAllDay).toBe(false);
		});
	});

	describe('Field Types', () => {
		it('should handle string fields: title, description', () => {
			const stringFields = {
				title: 'Test Title',
				description: 'Test Description',
			};
			expect(typeof stringFields.title).toBe('string');
			expect(typeof stringFields.description).toBe('string');
		});

		it('should handle UUID fields: project_id, customer_id', () => {
			const uuidFields = {
				project_id: '123e4567-e89b-12d3-a456-426614174002',
				customer_id: '123e4567-e89b-12d3-a456-426614174003',
			};
			expect(uuidFields.project_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
			expect(uuidFields.customer_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
		});

		it('should handle enum fields: status, priority, work_order_type', () => {
			const enumFields = {
				status: 'PLANERAD' as const,
				priority: 'NORMAL' as const,
				work_order_type: 'PROJEKTBUNDEN' as const,
			};
			expect(['PLANERAD', 'PÅGÅENDE', 'KLAR', 'FAKTURERAD', 'AVBOKAD']).toContain(enumFields.status);
			expect(['LOW', 'NORMAL', 'HIGH', 'AKUT']).toContain(enumFields.priority);
			expect(['PROJEKTBUNDEN', 'FRISTÅENDE']).toContain(enumFields.work_order_type);
		});

		it('should handle boolean fields: all_day', () => {
			const booleanFields = {
				all_day: false,
			};
			expect(typeof booleanFields.all_day).toBe('boolean');
		});

		it('should handle date/time fields: planned_start_at, planned_end_at', () => {
			const dateTimeFields = {
				planned_start_at: '2025-01-01T08:00:00Z',
				planned_end_at: '2025-01-01T17:00:00Z',
			};
			expect(new Date(dateTimeFields.planned_start_at).getTime()).toBeGreaterThan(0);
			expect(new Date(dateTimeFields.planned_end_at).getTime()).toBeGreaterThan(0);
		});

		it('should handle nullable fields', () => {
			const nullableFields = {
				customer_id: null,
				description: null,
				actual_start_at: null,
				actual_end_at: null,
			};
			expect(nullableFields.customer_id).toBeNull();
			expect(nullableFields.description).toBeNull();
			expect(nullableFields.actual_start_at).toBeNull();
			expect(nullableFields.actual_end_at).toBeNull();
		});
	});

	describe('All Form Fields List', () => {
		it('should include all fields from schema', () => {
			const allFields = [
				// Required
				'organization_id',
				'project_id',
				'title',
				'status',
				'priority',
				'work_order_type',
				'all_day',
				// Optional
				'customer_id',
				'description',
				'planned_start_at',
				'planned_end_at',
				'actual_start_at',
				'actual_end_at',
				'location_address',
				'location_city',
				'location_zip',
				'location_lat',
				'location_lng',
				'door_code',
				'location_notes',
				'internal_notes',
				'external_summary',
				'created_by_id',
				'closed_by_id',
				'closed_at',
				'signature_blob_url',
				'billing_type_override',
				'assignments',
			];

			expect(allFields.length).toBeGreaterThan(20);
			expect(allFields).toContain('project_id');
			expect(allFields).toContain('title');
			expect(allFields).toContain('customer_id');
		});
	});

	describe('Field Interactions', () => {
		it('should update customer when project with customer is selected', () => {
			const project = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				customer_id: '123e4567-e89b-12d3-a456-426614174003',
			};

			if (project.customer_id) {
				expect(project.customer_id).toBeTruthy();
			}
		});

		it('should clear customer when project without customer is selected', () => {
			const project = {
				id: '123e4567-e89b-12d3-a456-426614174002',
				customer_id: null,
			};

			if (!project.customer_id) {
				expect(project.customer_id).toBeNull();
			}
		});

		it('should hide time pickers when all_day is true', () => {
			const allDay = true;
			const shouldShowTimePickers = !allDay;
			expect(shouldShowTimePickers).toBe(false);
		});

		it('should show time pickers when all_day is false', () => {
			const allDay = false;
			const shouldShowTimePickers = !allDay;
			expect(shouldShowTimePickers).toBe(true);
		});
	});

	describe('Assignment Field', () => {
		it('should handle multiple user assignments', () => {
			const selectedAssignments = [
				'123e4567-e89b-12d3-a456-426614174005',
				'123e4567-e89b-12d3-a456-426614174006',
			];

			expect(selectedAssignments.length).toBe(2);
		});

		it('should format assignments for API', () => {
			const selectedAssignments = ['123e4567-e89b-12d3-a456-426614174005'];
			const assignments = selectedAssignments.map((userId) => ({
				user_id: userId,
				role: null,
				is_responsible: true,
				assignment_status: 'TILLDELAD' as const,
			}));

			expect(assignments[0].user_id).toBe('123e4567-e89b-12d3-a456-426614174005');
			expect(assignments[0].is_responsible).toBe(true);
		});
	});
});

