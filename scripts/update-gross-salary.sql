-- Script to update gross_salary_sek for existing payroll_basis entries
-- Run this in Supabase SQL Editor after running migration 20250131000004_add_gross_salary.sql
--
-- This script calculates gross salary for all payroll_basis entries that don't have it set yet
-- Formula: (normaltid × timlön) + (övertid × timlön × övertidsmultiplikator) + (OB-timmar × timlön × OB-tillägg)

DO $$
DECLARE
    payroll_record RECORD;
    salary_per_hour DECIMAL(10, 2);
    gross_salary DECIMAL(12, 2);
    normal_hours_threshold DECIMAL(10, 2);
    overtime_multiplier DECIMAL(10, 2);
    ob_night_rate DECIMAL(10, 2);
    ob_weekend_rate DECIMAL(10, 2);
    ob_holiday_rate DECIMAL(10, 2);
    avg_ob_rate DECIMAL(10, 2);
    ob_rates_count INTEGER;
BEGIN
    -- Loop through all payroll_basis entries that need gross_salary_sek calculated
    FOR payroll_record IN 
        SELECT 
            pb.id,
            pb.org_id,
            pb.person_id,
            pb.period_start,
            pb.period_end,
            pb.hours_norm,
            pb.hours_overtime,
            pb.ob_hours,
            pb.break_hours,
            pb.total_hours,
            pb.gross_salary_sek
        FROM payroll_basis pb
        WHERE pb.gross_salary_sek IS NULL 
           OR pb.gross_salary_sek = 0
        ORDER BY pb.org_id, pb.period_start, pb.person_id
    LOOP
        -- Get salary_per_hour_sek for this person
        SELECT m.salary_per_hour_sek INTO salary_per_hour
        FROM memberships m
        WHERE m.user_id = payroll_record.person_id
          AND m.org_id = payroll_record.org_id
          AND m.is_active = true
        LIMIT 1;
        
        -- Skip if no salary is set
        IF salary_per_hour IS NULL OR salary_per_hour = 0 THEN
            RAISE NOTICE 'Skipping payroll_basis ID %: No salary_per_hour_sek set for person %', 
                payroll_record.id, payroll_record.person_id;
            CONTINUE;
        END IF;
        
        -- Get payroll rules for this organization
        SELECT 
            pr.normal_hours_threshold,
            pr.overtime_multiplier,
            COALESCE((pr.ob_rates->>'night')::DECIMAL(10, 2), 0),
            COALESCE((pr.ob_rates->>'weekend')::DECIMAL(10, 2), 0),
            COALESCE((pr.ob_rates->>'holiday')::DECIMAL(10, 2), 0)
        INTO 
            normal_hours_threshold,
            overtime_multiplier,
            ob_night_rate,
            ob_weekend_rate,
            ob_holiday_rate
        FROM payroll_rules pr
        WHERE pr.org_id = payroll_record.org_id
        LIMIT 1;
        
        -- Use defaults if no rules found
        IF normal_hours_threshold IS NULL THEN
            normal_hours_threshold := 40;
            overtime_multiplier := 1.5;
            ob_night_rate := 0;
            ob_weekend_rate := 0;
            ob_holiday_rate := 0;
        END IF;
        
        -- Calculate average OB rate
        ob_rates_count := 0;
        avg_ob_rate := 0;
        
        IF ob_night_rate > 0 THEN
            avg_ob_rate := avg_ob_rate + ob_night_rate;
            ob_rates_count := ob_rates_count + 1;
        END IF;
        
        IF ob_weekend_rate > 0 THEN
            avg_ob_rate := avg_ob_rate + ob_weekend_rate;
            ob_rates_count := ob_rates_count + 1;
        END IF;
        
        IF ob_holiday_rate > 0 THEN
            avg_ob_rate := avg_ob_rate + ob_holiday_rate;
            ob_rates_count := ob_rates_count + 1;
        END IF;
        
        IF ob_rates_count > 0 THEN
            avg_ob_rate := avg_ob_rate / ob_rates_count;
        ELSE
            avg_ob_rate := 0;
        END IF;
        
        -- Calculate gross salary
        -- Formula: (normaltid × timlön) + (övertid × timlön × övertidsmultiplikator) + (OB-timmar × timlön × OB-tillägg)
        gross_salary := 0;
        
        -- Normal hours: hours_norm × salary_per_hour_sek
        gross_salary := gross_salary + (payroll_record.hours_norm * salary_per_hour);
        
        -- Overtime hours: hours_overtime × salary_per_hour_sek × overtime_multiplier
        gross_salary := gross_salary + (payroll_record.hours_overtime * salary_per_hour * overtime_multiplier);
        
        -- OB hours: ob_hours × salary_per_hour_sek × avgOBRate
        -- OB-timmar kan överlappa med normal tid eller övertid, så vi lägger bara till tillägget
        IF payroll_record.ob_hours > 0 AND avg_ob_rate > 0 THEN
            gross_salary := gross_salary + (payroll_record.ob_hours * salary_per_hour * avg_ob_rate);
        END IF;
        
        -- Update the payroll_basis record
        UPDATE payroll_basis
        SET 
            gross_salary_sek = ROUND(gross_salary, 2),
            updated_at = NOW()
        WHERE id = payroll_record.id;
        
        RAISE NOTICE 'Updated payroll_basis ID %: gross_salary_sek = % SEK (person_id: %, salary_per_hour: %, hours_norm: %, hours_overtime: %, ob_hours: %)', 
            payroll_record.id, 
            ROUND(gross_salary, 2),
            payroll_record.person_id,
            salary_per_hour,
            payroll_record.hours_norm,
            payroll_record.hours_overtime,
            payroll_record.ob_hours;
    END LOOP;
    
    RAISE NOTICE 'Finished updating gross_salary_sek for all payroll_basis entries';
END $$;

