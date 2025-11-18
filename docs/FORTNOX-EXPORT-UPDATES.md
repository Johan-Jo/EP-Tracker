# Fortnox Export Updates

## Last Updated
2025-11-19

## Recent Changes

### 1. Unit Field for Time Entries
**Date**: 2025-11-19

- **Issue**: Time entries were exported to Fortnox without unit, showing empty unit column in invoices
- **Fix**: Unit 'h' (hours) is now included for time entries in Fortnox export
- **Implementation**: Updated `lib/integrations/fortnox/export-invoice.ts` to include `Unit: 'h'` for all time entries
- **Reference**: `LINE_ITEM_DEFAULTS` in `lib/jobs/invoice-basis-refresh.ts` sets `unit: 'h'` for time entries

### 2. Duplicate Date in Time Entry Descriptions
**Date**: 2025-11-19

- **Issue**: Time entry descriptions showed date twice: "2025-11-17 - Johan Jonsson - Arbete 2025-11-17 - Dagbok: ..."
- **Cause**: Date was added separately in export, but description already contains "Arbete [datum]" format
- **Fix**: Removed duplicate date from time entry descriptions in Fortnox export
- **Result**: Descriptions now show: "Johan Jonsson - Arbete 2025-11-17 - Dagbok: ..."
- **Implementation**: Updated `lib/integrations/fortnox/export-invoice.ts` to not add `line.date` separately for time entries

### 3. Invoice Billed Status and Completed Step
**Date**: 2025-11-19

- **Feature**: Invoice basis now tracks when it has been successfully exported to Fortnox
- **Database**: Added `billed_at` timestamp to `invoice_basis` table
- **UI**: 
  - Step indicator now shows "completed" step when export succeeds
  - Invoice basis shows "Fakturerat [datum]" badge when `billed_at` is set
- **Migration**: `supabase/migrations/20251119000001_add_billed_at_to_invoice_basis.sql`
- **Implementation**: 
  - `app/api/integrations/fortnox/export-invoice/route.ts` sets `billed_at` on successful export
  - `components/invoice-basis/invoice-basis-page-new.tsx` shows billed status and updates step to "completed"

### 4. Account Numbers (Deferred)
**Date**: 2025-11-19

- **Plan**: Separate account numbers for different line item types
  - Material (varor): Account 3001
  - Time/Arbete (tjänster): Account 3002
- **Status**: Deferred for future implementation
- **Reference**: Plan exists but not yet implemented

## Export Format Details

### Time Entry Description Format
```
{person} - Arbete {date} - Dagbok: {diary}
```

Example: `"Johan Jonsson - Arbete 2025-11-17 - Dagbok: Utsättning och kontrollmått..."`

### Material Entry Description Format
```
{date} - Material: {description}
```

Example: `"2025-11-14 - Material: Super duper flintmedel"`

### Unit Values
- Time entries: `"h"` (hours)
- Material entries: `"st"` (pieces) or null
- Expense entries: `"st"` (pieces)
- Mileage entries: `"km"` (kilometers)
- ÄTA entries: null or custom unit

## Technical Notes

### Invoice Basis Refresh
- Time entries description format: `"Arbete [datum]"` with optional task label and phase
- Material entries description format: `"Arbete [datum]"` with material description
- Date format: `YYYY-MM-DD` stored in `line.date` field
- Unit stored in `line.unit` field from `LINE_ITEM_DEFAULTS`

### Fortnox Export Logic
- Time entries: Don't add `line.date` separately (already in description)
- All entries: Include unit when present
- Account numbers: Currently not sent (commented out, deferred for future)

## Related Files
- `lib/integrations/fortnox/export-invoice.ts` - Main export logic
- `lib/jobs/invoice-basis-refresh.ts` - Invoice basis data preparation
- `app/api/integrations/fortnox/export-invoice/route.ts` - Export API endpoint
- `components/invoice-basis/invoice-basis-page-new.tsx` - UI for invoice basis and export
- `components/invoice-basis/invoice-step-indicator.tsx` - Step indicator with completed status

