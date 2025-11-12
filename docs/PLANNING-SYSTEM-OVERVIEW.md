# Planning System - Implementation Overview

**Date:** October 23, 2025  
**Approach:** Structured EPIC-based development  
**Status:** ✅ Implementation Complete

---

## What is the Planning System?

The Planning System is a comprehensive week planner and resource management tool for EP Tracker that enables:

- **Visual week planning** with drag-capable grid interface
- **Resource management** with availability tracking
- **Conflict detection** for scheduling overlaps and absences
- **Capacity monitoring** to ensure adequate staffing
- **Mobile check-in/out** for field workers
- **Offline support** for disconnected work environments

---

## Implementation Approach

### ❌ Previous Approach (Rejected)

Initially, the planning system was implemented in a **single unstructured batch**:
- All features built simultaneously
- No clear milestones or acceptance criteria
- Difficult to track progress
- Hard to test incrementally
- Mixed MVP and Phase 2 features

### ✅ Current Approach (Structured EPICs)

The system has been **restructured into 3 focused EPICs** following the project's established methodology:

#### **EPIC 22: Planning Foundation**
- Database schema and migrations
- API routes for data access
- TypeScript types and Zod validation
- Conflict detection utilities
- **Deliverable:** Solid backend foundation

#### **EPIC 23: Planning UI**
- Week grid view components
- Assignment management dialogs
- Conflict handling UI
- Capacity indicators
- **Deliverable:** Complete web interface for planners

#### **EPIC 24: Mobile Today**
- Mobile job cards
- Check-in/out functionality
- Offline queue support
- Google Maps integration
- **Deliverable:** Field worker mobile experience

---

## EPIC Structure

Each EPIC follows this format:

### 1. User Stories with Acceptance Criteria
Clear Gherkin-style acceptance criteria for each feature:

```gherkin
Given [context]
When [action]
Then [expected result]
And [additional expectations]
```

### 2. Detailed Task Lists
Checkbox lists organized by component/feature area:
- Database tasks
- API route tasks
- Component tasks
- Integration tasks

### 3. Testing Requirements
- Unit tests
- Integration tests
- E2E tests (Playwright)
- Manual testing checklists

### 4. Files Delivered
Complete list of files created/modified with line counts

### 5. Success Criteria
Measurable outcomes to verify completion

### 6. Dependencies
What's needed before starting and what this enables

---

## Documentation Structure

```
docs/
├── EPIC-22-PLANNING-FOUNDATION.md    # Backend foundation
├── EPIC-23-PLANNING-UI.md            # Web interface
├── EPIC-24-MOBILE-TODAY.md           # Mobile features
├── PLANNING-SYSTEM-STATUS.md         # Progress tracking
└── PLANNING-SYSTEM-OVERVIEW.md       # This file
```

---

## Why This Structure Matters

### Benefits

1. **Clear Milestones**
   - Each EPIC is a deployable unit
   - Can test and validate incrementally
   - Easy to track progress (EPIC 22 = 33%, EPIC 23 = 67%, EPIC 24 = 100%)

2. **Better Testing**
   - Foundation (EPIC 22) tested before UI built
   - UI (EPIC 23) tested before mobile features
   - Issues caught early in each layer

3. **Flexible Development**
   - Can pause between EPICs
   - Can pivot if requirements change
   - Can assign different EPICs to different developers

4. **Clearer Communication**
   - Stakeholders understand "EPIC 23 is complete"
   - Product owner can prioritize EPICs
   - QA team knows what to test per EPIC

5. **Maintainability**
   - Each EPIC documented independently
   - Future developers understand the progression
   - Easy to reference specific features

---

## Implementation Status

| EPIC | Status | Files | Lines | Notes |
|------|--------|-------|-------|-------|
| EPIC 22 | ✅ Complete | 8 | ~1,440 | Foundation ready |
| EPIC 23 | ✅ Complete | 11 | ~985 | UI functional |
| EPIC 24 | ✅ Complete | 5 | ~420 | Mobile working |
| **Total** | **✅ 100%** | **24** | **~2,845** | **MVP complete** |

*(Does not include migrations, docs, or scripts)*

---

## What Was Built

### EPIC 22 Deliverables ✅

**Database:**
- `assignments` table (work assignments)
- `absences` table (vacation, sick, training)
- `shift_templates` table (reusable shifts)
- `mobile_notes` table (field worker instructions)
- Extended `projects` table (color, capacity)

**API Routes:**
- `/api/planning` - Week data
- `/api/assignments` - CRUD with conflict detection
- `/api/absences` - Absence management
- `/api/mobile/today` - Today's jobs
- `/api/mobile/checkins` - Check-in/out

**Types & Validation:**
- Complete Zod schemas
- TypeScript types with relations
- Swedish error messages

### EPIC 23 Deliverables ✅

**Components:**
- `PersonRow` - Resource list items
- `CapacityIndicator` - Staffing bars
- `AssignmentCard` - Job cards
- `ProjectChips` - Filter chips
- `AddAssignmentDialog` - Create/edit form
- `ConflictBanner` - Conflict warnings
- `WeekScheduleView` - Main grid
- `PlanningPageClient` - Data integration

**Features:**
- Week grid (Mon-Sun columns)
- Resource status tracking
- Project filtering
- Conflict detection with override
- Capacity monitoring

### EPIC 24 Deliverables ✅

**Components:**
- `MobileJobCard` - Mobile job display
- `MobileTodayScreen` - Today list

**Features:**
- Today's assignments list
- Check-in/out buttons
- Status updates
- Google Maps navigation
- Offline queue support

---

## Known Limitations (Out of Scope)

These were **intentionally excluded from MVP** to ship faster:

1. ❌ **Drag-and-drop** - @dnd-kit installed but not integrated
   - Currently: Click cell to create assignment
   - Future: Drag projects or assignments to new slots

2. ❌ **Absence visual overlay** - No red overlay on grid
   - Currently: Absences block via API only
   - Future: Visual red cells for absent users

3. ❌ **Absence management UI** - No create absence dialog
   - Currently: Absences created via API/SQL
   - Future: Dialog to create/edit absences

4. ❌ **Multi-select users** - Single-select dropdown only
   - Currently: Create one user at a time (or code multi-assign)
   - Future: Checkbox multi-select component

5. ❌ **Grid virtualization** - No virtualization
   - Currently: Handles <100 users fine
   - Future: Needed for 200+ user organizations

All of these are **documented as Phase 2 enhancements** in each EPIC doc.

---

## How to Use the Documentation

### For Developers

1. **Starting work on Planning:**
   - Read `PLANNING-SYSTEM-OVERVIEW.md` (this file) first
   - Then read `EPIC-22-PLANNING-FOUNDATION.md` to understand the data model

2. **Building new features:**
   - Reference the relevant EPIC document
   - Follow the task checklist
   - Run the tests specified

3. **Debugging issues:**
   - Check which EPIC the feature belongs to
   - Review acceptance criteria
   - Verify test cases pass

### For Product Owners

1. **Understanding what's built:**
   - Read `PLANNING-SYSTEM-STATUS.md` for high-level progress
   - Each EPIC doc has "User Stories" section for feature descriptions

2. **Planning Phase 2:**
   - Check "Out of Scope" sections in each EPIC
   - Prioritize enhancements based on user feedback

3. **Testing the system:**
   - Each EPIC has "Success Criteria" section
   - Use those as acceptance testing checklist

### For QA/Testers

1. **Test planning:**
   - Each EPIC has a "Testing" section
   - Follow the test cases listed
   - Verify success criteria

2. **Bug reporting:**
   - Reference the EPIC number (e.g., "Bug in EPIC 23 - Week grid")
   - Cite specific acceptance criteria that failed

---

## Quick Start Guide

### 1. Run Database Migration

```bash
# In Supabase SQL Editor, run:
supabase/migrations/20241023000001_planning_system.sql
```

### 2. Seed Test Data

```bash
npx tsx scripts/seed-planning.ts
```

### 3. Access Planning

**As Admin/Foreman:**
- Navigate to "Planering" in sidebar
- Click cells to create assignments

**As Worker:**
- Navigate to `/planning/today`
- Check in/out on assignments

---

## Next Steps

### Immediate (Pre-Launch)

1. ✅ Database migration run
2. ✅ Seed data generated
3. ⏳ Manual testing with real users
4. ⏳ Performance testing (100+ assignments)
5. ⏳ Mobile device testing

### Phase 2 (Enhancements)

After MVP is validated:

1. **EPIC 25: Drag-and-Drop** (2-3 days)
   - Integrate @dnd-kit
   - Drag assignments between cells
   - Drag projects onto users

2. **EPIC 26: Absence Management** (2 days)
   - Absence creation dialog
   - Visual overlay on grid
   - Edit/delete absences

3. **EPIC 27: Advanced Features** (3-4 days)
   - Week duplication
   - Shift templates UI
   - Multi-select users
   - Keyboard navigation

---

## Conclusion

The Planning System has been successfully restructured from an unstructured implementation into **3 focused EPICs** following the project's established methodology.

**Benefits of this approach:**
- ✅ Clear milestones and acceptance criteria
- ✅ Testable at each stage
- ✅ Easy to understand and maintain
- ✅ Aligns with project's EPIC 1-21 structure
- ✅ Flexible for future enhancements

**Current Status:** ✅ **All 3 EPICs complete - Ready for pilot testing**

---

## References

- **EPIC Documentation:** `/docs/epics/EPIC-022-*.md`, `/docs/epics/EPIC-023-*.md`, `/docs/epics/EPIC-024-*.md`
- **Progress Tracking:** `/docs/PLANNING-SYSTEM-STATUS.md`
- **Project Status:** `/docs/PROJECT-STATUS.md`
- **Phase 1 Plan:** `/docs/phase-1-implementation-plan.md`

---

**Questions?** Review the individual EPIC documents for detailed implementation notes.

