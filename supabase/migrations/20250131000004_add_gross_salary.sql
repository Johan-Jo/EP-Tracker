-- EPIC 33: Add gross_salary_sek column to payroll_basis
-- Calculated gross salary based on hours and rates

-- Add gross_salary_sek column for calculated gross salary
ALTER TABLE public.payroll_basis
ADD COLUMN IF NOT EXISTS gross_salary_sek DECIMAL(12, 2);

-- Add comment to clarify
COMMENT ON COLUMN public.payroll_basis.gross_salary_sek IS 'Beräknad bruttolön baserad på timmar och timlön (faktisk lön för löneberäkning)';

