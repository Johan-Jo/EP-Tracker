/**
 * Unit tests for Fortnox payroll export functions
 * Tests data mapping, validation, and transaction building
 */

import {
	validatePayrollBasisForExport,
	buildFortnoxAttendanceTransactions,
	buildFortnoxSalaryTransactions,
	type BuildFortnoxPayrollPayloadOptions,
	type PayrollBasisRow,
} from '@/lib/integrations/fortnox/export-payroll';

describe('Fortnox Payroll Export', () => {
	const mockOptions: BuildFortnoxPayrollPayloadOptions = {
		employeeMappings: [
			{ person_id: 'person-1', fortnox_employee_id: '101' },
			{ person_id: 'person-2', fortnox_employee_id: '102' },
		],
		wageCodeMappings: [
			{ ep_wage_type: 'normal', fortnox_salary_code: '100' },
			{ ep_wage_type: 'overtime', fortnox_salary_code: '200' },
			{ ep_wage_type: 'ob', fortnox_salary_code: '300' },
		],
		costCenter: 'CC001',
		project: 'PROJ001',
	};

	const mockPayrollBasis: PayrollBasisRow = {
		id: 'basis-1',
		org_id: 'org-1',
		person_id: 'person-1',
		period_start: '2025-01-01',
		period_end: '2025-01-31',
		hours_norm: 160,
		hours_overtime: 10,
		ob_hours: 5,
		ob_hours_actual: 5,
		ob_hours_multiplier: null,
		break_hours: 8,
		total_hours: 167,
		gross_salary_sek: 50000,
		locked: true,
		locked_by: 'user-1',
		locked_at: '2025-01-31T10:00:00Z',
		person: {
			id: 'person-1',
			full_name: 'Anna Andersson',
			email: 'anna@example.com',
		},
	};

	describe('validatePayrollBasisForExport', () => {
		it('should return no errors for valid locked payroll basis', () => {
			const errors = validatePayrollBasisForExport([mockPayrollBasis], mockOptions);

			expect(errors).toHaveLength(0);
		});

		it('should return error if payroll basis is not locked', () => {
			const unlockedBasis = {
				...mockPayrollBasis,
				locked: false,
			};

			const errors = validatePayrollBasisForExport([unlockedBasis], mockOptions);

			expect(errors).toHaveLength(1);
			expect(errors[0]?.field).toContain('locked');
			expect(errors[0]?.message).toContain('låst');
		});

		it('should return error if employee mapping is missing', () => {
			const basisWithoutMapping = {
				...mockPayrollBasis,
				person_id: 'person-unknown',
			};

			const errors = validatePayrollBasisForExport([basisWithoutMapping], mockOptions);

			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.message.includes('EmployeeId-mappning'))).toBe(true);
		});

		it('should return error if wage code mapping is missing for normal hours', () => {
			const optionsWithoutNormal = {
				...mockOptions,
				wageCodeMappings: mockOptions.wageCodeMappings.filter((m) => m.ep_wage_type !== 'normal'),
			};

			const errors = validatePayrollBasisForExport([mockPayrollBasis], optionsWithoutNormal);

			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.message.includes('normala timmar'))).toBe(true);
		});

		it('should return error if wage code mapping is missing for overtime', () => {
			const optionsWithoutOvertime = {
				...mockOptions,
				wageCodeMappings: mockOptions.wageCodeMappings.filter((m) => m.ep_wage_type !== 'overtime'),
			};

			const basisWithOvertime = {
				...mockPayrollBasis,
				hours_overtime: 10,
			};

			const errors = validatePayrollBasisForExport([basisWithOvertime], optionsWithoutOvertime);

			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.message.includes('övertid'))).toBe(true);
		});

		it('should return error if wage code mapping is missing for OB hours', () => {
			const optionsWithoutOB = {
				...mockOptions,
				wageCodeMappings: mockOptions.wageCodeMappings.filter((m) => m.ep_wage_type !== 'ob'),
			};

			const basisWithOB = {
				...mockPayrollBasis,
				ob_hours: 5,
			};

			const errors = validatePayrollBasisForExport([basisWithOB], optionsWithoutOB);

			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.message.includes('OB-timmar'))).toBe(true);
		});

		it('should return error if no hours or salary to export', () => {
			const emptyBasis = {
				...mockPayrollBasis,
				total_hours: 0,
				gross_salary_sek: null,
			};

			const errors = validatePayrollBasisForExport([emptyBasis], mockOptions);

			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.message.includes('inga timmar eller belopp'))).toBe(true);
		});

		it('should validate multiple payroll basis entries', () => {
			const basis1 = { ...mockPayrollBasis, id: 'basis-1' };
			const basis2 = {
				...mockPayrollBasis,
				id: 'basis-2',
				person_id: 'person-2',
				locked: false, // Invalid
			};

			const errors = validatePayrollBasisForExport([basis1, basis2], mockOptions);

			expect(errors.length).toBeGreaterThan(0);
			expect(errors.some((e) => e.message.includes('låst'))).toBe(true);
		});
	});

	describe('buildFortnoxAttendanceTransactions', () => {
		it('should build attendance transactions for normal hours', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 40,
				hours_overtime: 0,
				ob_hours: 0,
				period_start: '2025-01-01',
				period_end: '2025-01-07', // 7 days
			};

			const transactions = buildFortnoxAttendanceTransactions(basis, mockOptions);

			expect(transactions.length).toBeGreaterThan(0);
			expect(transactions[0]?.EmployeeId).toBe('101');
			expect(transactions[0]?.CauseCode).toBe('ARB');
			expect(transactions[0]?.Hours).toMatch(/^\d+\.\d+$/); // Decimal format
		});

		it('should build attendance transactions for overtime hours', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 40,
				hours_overtime: 10,
				ob_hours: 0,
				period_start: '2025-01-01',
				period_end: '2025-01-07',
			};

			const transactions = buildFortnoxAttendanceTransactions(basis, mockOptions);

			const overtimeTransactions = transactions.filter((t) => t.CauseCode === 'OB1');
			expect(overtimeTransactions.length).toBeGreaterThan(0);
			expect(overtimeTransactions[0]?.Hours).toMatch(/^\d+\.\d+$/);
		});

		it('should build attendance transactions for OB hours', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 40,
				hours_overtime: 0,
				ob_hours: 5,
				ob_hours_actual: 5,
				period_start: '2025-01-01',
				period_end: '2025-01-07',
			};

			const transactions = buildFortnoxAttendanceTransactions(basis, mockOptions);

			const obTransactions = transactions.filter((t) => t.CauseCode === 'OB2');
			expect(obTransactions.length).toBeGreaterThan(0);
			expect(obTransactions[0]?.Hours).toMatch(/^\d+\.\d+$/);
		});

		it('should use ob_hours_actual if available', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 40,
				hours_overtime: 0,
				ob_hours: 3,
				ob_hours_actual: 5, // Should use this instead
				period_start: '2025-01-01',
				period_end: '2025-01-07',
			};

			const transactions = buildFortnoxAttendanceTransactions(basis, mockOptions);

			const obTransactions = transactions.filter((t) => t.CauseCode === 'OB2');
			const totalOBHours = obTransactions.reduce((sum, t) => sum + parseFloat(t.Hours), 0);
			// Should be close to 5 (ob_hours_actual), not 3 (ob_hours)
			// Allow some rounding error due to distribution across days
			expect(totalOBHours).toBeGreaterThan(4.5);
			expect(totalOBHours).toBeLessThan(5.5);
			expect(totalOBHours).not.toBeCloseTo(3, 0.5); // Should not be 3
		});

		it('should include cost center and project if provided', () => {
			const transactions = buildFortnoxAttendanceTransactions(mockPayrollBasis, mockOptions);

			expect(transactions.length).toBeGreaterThan(0);
			expect(transactions[0]?.CostCenter).toBe('CC001');
			expect(transactions[0]?.Project).toBe('PROJ001');
		});

		it('should format dates correctly (YYYY-MM-DD)', () => {
			const transactions = buildFortnoxAttendanceTransactions(mockPayrollBasis, mockOptions);

			expect(transactions.length).toBeGreaterThan(0);
			transactions.forEach((t) => {
				expect(t.Date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
				expect(new Date(t.Date).toString()).not.toBe('Invalid Date');
			});
		});

		it('should return empty array if employee mapping is missing', () => {
			const basisWithoutMapping = {
				...mockPayrollBasis,
				person_id: 'person-unknown',
			};

			const transactions = buildFortnoxAttendanceTransactions(basisWithoutMapping, mockOptions);

			expect(transactions).toHaveLength(0);
		});

		it('should distribute hours across period days correctly', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 40,
				hours_overtime: 0,
				ob_hours: 0,
				period_start: '2025-01-01',
				period_end: '2025-01-05', // 5 days
			};

			const transactions = buildFortnoxAttendanceTransactions(basis, mockOptions);

			const normalTransactions = transactions.filter((t) => t.CauseCode === 'ARB');
			const totalHours = normalTransactions.reduce((sum, t) => sum + parseFloat(t.Hours), 0);

			// Should distribute 40 hours across 5 days = 8 hours per day
			expect(totalHours).toBeCloseTo(40, 1);
			expect(normalTransactions.length).toBe(5); // One per day
		});
	});

	describe('buildFortnoxSalaryTransactions', () => {
		it('should build salary transaction for normal hours', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 160,
				hours_overtime: 0,
				ob_hours: 0,
			};

			const transactions = buildFortnoxSalaryTransactions(basis, mockOptions);

			expect(transactions.length).toBeGreaterThan(0);
			const normalTransaction = transactions.find((t) => t.SalaryCode === '100');
			expect(normalTransaction).toBeDefined();
			expect(normalTransaction?.EmployeeId).toBe('101');
			expect(normalTransaction?.Date).toBe('2025-01-31'); // period_end
		});

		it('should build salary transaction for overtime', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 160,
				hours_overtime: 10,
				ob_hours: 0,
			};

			const transactions = buildFortnoxSalaryTransactions(basis, mockOptions);

			const overtimeTransaction = transactions.find((t) => t.SalaryCode === '200');
			expect(overtimeTransaction).toBeDefined();
			expect(overtimeTransaction?.TextRow).toContain('Övertid');
		});

		it('should build salary transaction for OB hours', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 160,
				hours_overtime: 0,
				ob_hours: 5,
			};

			const transactions = buildFortnoxSalaryTransactions(basis, mockOptions);

			const obTransaction = transactions.find((t) => t.SalaryCode === '300');
			expect(obTransaction).toBeDefined();
			expect(obTransaction?.TextRow).toContain('OB-timmar');
		});

		it('should use ob_hours_actual if available for OB transaction', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 160,
				hours_overtime: 0,
				ob_hours: 3,
				ob_hours_actual: 5, // Should trigger OB transaction
			};

			const transactions = buildFortnoxSalaryTransactions(basis, mockOptions);

			const obTransaction = transactions.find((t) => t.SalaryCode === '300');
			expect(obTransaction).toBeDefined();
		});

		it('should include gross salary in Amount if available', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 160,
				gross_salary_sek: 50000,
			};

			const transactions = buildFortnoxSalaryTransactions(basis, mockOptions);

			const normalTransaction = transactions.find((t) => t.SalaryCode === '100');
			expect(normalTransaction?.Amount).toBe('50000.00');
		});

		it('should not include Amount if gross_salary_sek is null', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 160,
				gross_salary_sek: null,
			};

			const transactions = buildFortnoxSalaryTransactions(basis, mockOptions);

			const normalTransaction = transactions.find((t) => t.SalaryCode === '100');
			expect(normalTransaction?.Amount).toBeUndefined();
		});

		it('should include cost center and project if provided', () => {
			const transactions = buildFortnoxSalaryTransactions(mockPayrollBasis, mockOptions);

			expect(transactions.length).toBeGreaterThan(0);
			transactions.forEach((t) => {
				expect(t.CostCenter).toBe('CC001');
				expect(t.Project).toBe('PROJ001');
			});
		});

		it('should format dates correctly (YYYY-MM-DD)', () => {
			const transactions = buildFortnoxSalaryTransactions(mockPayrollBasis, mockOptions);

			expect(transactions.length).toBeGreaterThan(0);
			transactions.forEach((t) => {
				expect(t.Date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			});
		});

		it('should include period in TextRow', () => {
			const transactions = buildFortnoxSalaryTransactions(mockPayrollBasis, mockOptions);

			expect(transactions.length).toBeGreaterThan(0);
			const normalTransaction = transactions.find((t) => t.SalaryCode === '100');
			expect(normalTransaction?.TextRow).toContain('2025-01-01');
			expect(normalTransaction?.TextRow).toContain('2025-01-31');
		});

		it('should return empty array if employee mapping is missing', () => {
			const basisWithoutMapping = {
				...mockPayrollBasis,
				person_id: 'person-unknown',
			};

			const transactions = buildFortnoxSalaryTransactions(basisWithoutMapping, mockOptions);

			expect(transactions).toHaveLength(0);
		});

		it('should not create transaction if hours are zero', () => {
			const basis = {
				...mockPayrollBasis,
				hours_norm: 0,
				hours_overtime: 0,
				ob_hours: 0,
				ob_hours_actual: null,
			};

			const transactions = buildFortnoxSalaryTransactions(basis, mockOptions);

			expect(transactions).toHaveLength(0);
		});

		it('should not create transaction if wage code mapping is missing', () => {
			const optionsWithoutNormal = {
				...mockOptions,
				wageCodeMappings: mockOptions.wageCodeMappings.filter((m) => m.ep_wage_type !== 'normal'),
			};

			const transactions = buildFortnoxSalaryTransactions(mockPayrollBasis, optionsWithoutNormal);

			// Should not create normal transaction, but may create overtime/OB if they have mappings
			const normalTransaction = transactions.find((t) => t.SalaryCode === '100');
			expect(normalTransaction).toBeUndefined();
		});
	});

	describe('Date and format helpers', () => {
		it('should handle single day periods correctly', () => {
			const basis = {
				...mockPayrollBasis,
				period_start: '2025-01-15',
				period_end: '2025-01-15',
				hours_norm: 8,
			};

			const attendanceTransactions = buildFortnoxAttendanceTransactions(basis, mockOptions);
			const salaryTransactions = buildFortnoxSalaryTransactions(basis, mockOptions);

			// Should create transactions for the single day
			expect(attendanceTransactions.length).toBeGreaterThan(0);
			expect(salaryTransactions.length).toBeGreaterThan(0);
			expect(attendanceTransactions[0]?.Date).toBe('2025-01-15');
		});

		it('should handle multi-week periods correctly', () => {
			const basis = {
				...mockPayrollBasis,
				period_start: '2025-01-01',
				period_end: '2025-01-31', // 31 days
				hours_norm: 160,
			};

			const attendanceTransactions = buildFortnoxAttendanceTransactions(basis, mockOptions);

			// Should create transactions for all days
			expect(attendanceTransactions.length).toBeGreaterThan(0);
			const uniqueDates = new Set(attendanceTransactions.map((t) => t.Date));
			expect(uniqueDates.size).toBeGreaterThan(1);
		});
	});
});
