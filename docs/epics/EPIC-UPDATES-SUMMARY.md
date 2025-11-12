# EPIC Updates Summary

**Date:** 2025-11-02  
**Status:** In-progress documentation updates for EPICs 31-36

## Overview
Added missing details (UI, testing, jobs) to EPICs 31-36 based on the PRD analysis. Split M3 and M4 into phased implementations (Option C).

---

## Changes Made

### ✅ EPIC 31 - COMPLETED
**Added:**
- Detailed UI components section with file paths
- Full API routes documentation
- Testing scenarios (unit, integration, E2E, performance)
- Implementation status (completed / in-progress / remaining)
- Performance monitoring specs

**Status:** ~90% complete (PDF export still TODO)

### ✅ EPIC 32 - COMPLETED
**Added:**
- Attendance builder job logic
- Auto-close cross-day sessions
- Detailed API routes
- Correction dialog UI specs
- Test scenarios and data requirements
- Implementation plan

**Status:** Not started, fully planned

### ⏳ EPIC 33 - PARTIAL
**Added:**
- Split into phases: M3a, M3b, M3c
- Payroll rules configuration
- Basis refresh job logic
- **Missing:** Full API routes, UI specs, testing

**Status:** Needs completion

### ⏳ EPIC 34 - PARTIAL
**Added:**
- Split into phases: M4a, M4b, M4c
- Invoice line types
- Basis refresh job
- Full API routes documentation
- **NEW:** Detaljerad UI-specifikation (navigation, redigering, lås/export)
- **Missing:** Testplan & scenarier

**Status:** Dokumentation klar, väntar teststrategi

### ❌ EPIC 35 - NOT UPDATED
**Still missing:**
- API routes
- UI components
- Testing scenarios
- Implementation plan

### ❌ EPIC 36 - NOT UPDATED
**Still missing:**
- Detailed implementation
- Monitoring setup
- Testing scenarios

---

## Recommendation

**Option 1: Complete remaining EPIC updates**
- Finish EPIC 33 (UI + testing)
- Finish EPIC 34 (UI + testing)
- Update EPIC 35
- Update EPIC 36

**Option 2: Start implementation**
- Begin with EPIC 32 (sessions builder) since it blocks M3/M4
- Complete EPIC 31 PDF export first

**Option 3: Create missing EPICs**
- EPIC 37: Admin/Settings & Rules Engine (missing from PRD)
- EPIC 38: ID06 Scanner
- EPIC 39: Background Jobs & Queue Architecture
- EPIC 40: UAT & Test Plan

---

## Next Steps
1. User decision on approach
2. Continue with chosen path

