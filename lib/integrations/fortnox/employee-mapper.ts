import type { FortnoxEmployee } from './client';
import type { EmployeePayload } from '@/lib/schemas/employee';
import { normalizeSwedishPersonalIdentityNumber } from '@/lib/utils/swedish';

/**
 * Map Fortnox Employee to EP-Tracker EmployeePayload
 * @param fortnoxEmployee Fortnox employee data
 * @returns EP-Tracker employee payload
 */
export function mapFortnoxEmployeeToEPTracker(
	fortnoxEmployee: FortnoxEmployee
): EmployeePayload {
	// Normalize personal identity number if provided
	let personalIdentityNo: string | undefined = undefined;
	if (fortnoxEmployee.PersonalIdentityNumber) {
		try {
			const normalized = normalizeSwedishPersonalIdentityNumber(fortnoxEmployee.PersonalIdentityNumber);
			personalIdentityNo = normalized ? normalized : undefined;
		} catch {
			// If normalization fails, use original value
			personalIdentityNo = fortnoxEmployee.PersonalIdentityNumber || undefined;
		}
	}

	// Map employee number - use EmployeeId if available, otherwise use empty (will be generated)
	const employeeNo = fortnoxEmployee.EmployeeId || undefined;

	// Map names
	const firstName = fortnoxEmployee.FirstName || '';
	const lastName = fortnoxEmployee.LastName || '';

	// Map email
	const email = fortnoxEmployee.Email || undefined;

	// Map phone numbers - Phone1 as mobile, Phone2 as work
	const phoneMobile = fortnoxEmployee.Phone1 || undefined;
	const phoneWork = fortnoxEmployee.Phone2 || undefined;

	// Map address
	const address1 = fortnoxEmployee.Address1 || '';
	const address2 = fortnoxEmployee.Address2 || '';
	const addressStreet = [address1, address2].filter(Boolean).join(', ') || undefined;
	const addressZip = fortnoxEmployee.PostCode || undefined;
	const addressCity = fortnoxEmployee.City || undefined;
	const addressCountry = fortnoxEmployee.Country || 'Sverige';

	// Map employment dates
	let employmentStartDate: Date | undefined = undefined;
	if (fortnoxEmployee.EmploymentDate) {
		try {
			const date = new Date(fortnoxEmployee.EmploymentDate);
			if (!Number.isNaN(date.getTime())) {
				employmentStartDate = date;
			}
		} catch {
			// Invalid date, skip
		}
	}

	let employmentEndDate: Date | undefined = undefined;
	if (fortnoxEmployee.EmployedTo) {
		try {
			const date = new Date(fortnoxEmployee.EmployedTo);
			if (!Number.isNaN(date.getTime())) {
				employmentEndDate = date;
			}
		} catch {
			// Invalid date, skip
		}
	}

	// Convert salary to hourly rate
	// If HourlyPay is available, use it directly
	// If MonthlySalary is available, calculate approximate hourly rate (monthly salary / 160 hours per month)
	let hourlyRateSek: number | undefined = undefined;
	if (fortnoxEmployee.HourlyPay) {
		try {
			const hourlyPay = parseFloat(fortnoxEmployee.HourlyPay);
			if (!Number.isNaN(hourlyPay) && hourlyPay > 0) {
				hourlyRateSek = hourlyPay;
			}
		} catch {
			// Invalid value, skip
		}
	} else if (fortnoxEmployee.MonthlySalary) {
		try {
			const monthlySalary = parseFloat(fortnoxEmployee.MonthlySalary);
			if (!Number.isNaN(monthlySalary) && monthlySalary > 0) {
				// Approximate: monthly salary / 160 hours per month (standard full-time)
				hourlyRateSek = monthlySalary / 160;
			}
		} catch {
			// Invalid value, skip
		}
	}

	// Map employment type from Fortnox EmploymentForm
	// TV = Tjänstledighet/Vikariat (Contractor/Temporary)
	// TJM = Tillsvidareanställning (Full-time permanent)
	// Deltid = Part-time
	let employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'TEMPORARY' = 'FULL_TIME';
	if (fortnoxEmployee.EmploymentForm) {
		const form = fortnoxEmployee.EmploymentForm.toUpperCase();
		if (form === 'TV' || form.includes('VIKARIAT') || form.includes('CONTRACTOR')) {
			employmentType = 'CONTRACTOR';
		} else if (form === 'TJM' || form.includes('TILLSVIDARE')) {
			employmentType = 'FULL_TIME';
		} else if (form.includes('DELTID') || form.includes('PART_TIME') || form.includes('PARTTIME')) {
			employmentType = 'PART_TIME';
		} else if (form.includes('TEMPORARY') || form.includes('TEMPORAR')) {
			employmentType = 'TEMPORARY';
		}
	}

	// Map inactive flag to is_archived
	const isArchived = fortnoxEmployee.Inactive === true;

	// Build notes from JobTitle and other info if available
	const notesParts: string[] = [];
	if (fortnoxEmployee.JobTitle) {
		notesParts.push(`Titel: ${fortnoxEmployee.JobTitle}`);
	}
	if (fortnoxEmployee.CostCenter) {
		notesParts.push(`Kostnadsställe: ${fortnoxEmployee.CostCenter}`);
	}
	if (fortnoxEmployee.Project) {
		notesParts.push(`Projekt: ${fortnoxEmployee.Project}`);
	}
	const notes = notesParts.length > 0 ? notesParts.join('\n') : undefined;

	return {
		employee_no: employeeNo,
		first_name: firstName,
		last_name: lastName,
		personal_identity_no: personalIdentityNo,
		email,
		phone_mobile: phoneMobile,
		phone_work: phoneWork,
		employment_type: employmentType,
		hourly_rate_sek: hourlyRateSek,
		employment_start_date: employmentStartDate,
		employment_end_date: employmentEndDate,
		address_street: addressStreet,
		address_zip: addressZip,
		address_city: addressCity,
		address_country: addressCountry,
		notes,
		is_archived: isArchived,
	};
}

