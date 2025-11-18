# Fortnox API v3 Invoice Export Specification

## Overview

This document describes the exact requirements for exporting invoices to Fortnox API v3 based on official documentation and errors encountered during integration.

**API Endpoint:** `POST https://api.fortnox.se/3/invoices`

**Official Documentation:** https://api.fortnox.se/apidocs

---

## Request Structure

### Payload Wrapper

All requests to Fortnox API v3 must wrap the invoice payload:

```json
{
  "Invoice": {
    // Invoice payload here
  }
}
```

### Invoice Payload (`Invoice` object)

#### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `CustomerNumber` | string | Customer number in Fortnox (must exist) | `"6"` |
| `InvoiceDate` | string | Invoice date in YYYY-MM-DD format | `"2025-01-15"` |
| `DueDate` | string | Due date in YYYY-MM-DD format | `"2025-02-14"` |
| `InvoiceRows` | array | Array of invoice rows (at least one required) | See below |

#### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `Currency` | string | Currency code (default: SEK) | `"SEK"` |
| `YourReference` | string | Customer reference | `"Ref-123"` |
| `OurReference` | string | Our reference | `"INT-456"` |
| `VATIncluded` | boolean | Whether prices include VAT | `true` |
| `RotReducedInvoicingType` | string | ROT/RUT type: `'ROT'` \| `'RUT'` \| `'ROTRUT'` \| `''` | `"ROTRUT"` |
| `ReverseChargeOnConstructionServices` | boolean | Reverse charge flag | `false` |
| `Comments` | string | Comments/notes | `"Project notes"` |

#### Fields That MUST NOT Be Included

The following fields **MUST NOT** be included in the payload because Fortnox calculates them automatically:

- `Total` - Calculated from InvoiceRows
- `TotalVAT` - Calculated from InvoiceRows
- `TotalExcludingVAT` - Calculated from InvoiceRows

If these fields are included, Fortnox will return an error: `"Felaktigt fältnamn (TotalExcludingVAT)"`

#### Reference Fields That MUST NOT Be Included (Without Verification)

The following fields **MUST NOT** be included unless they reference existing Fortnox entities:

- `Project` - Must reference an existing Fortnox project (not free text)
  - Error if invalid: `"Värdet måste vara alfanumeriskt (Fast och Löpande)"`
  - Error if not found: `"Kunde inte hämta/hitta projekt"`

---

## Invoice Row Structure (`InvoiceRows` array)

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `Description` | string | Description of the line item | `"Arbete 2025-01-15 - Installation"` |
| `DeliveredQuantity` | number | Quantity delivered | `8` |
| `Price` | number | Unit price per unit | `500` |

**CRITICAL:** Use `DeliveredQuantity`, **NOT** `Quantity`. If `Quantity` is used, Fortnox will return: `"Felaktigt fältnamn (Quantity)"`

### Optional Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `Unit` | string | Unit of measurement | `"tim"`, `"st"`, `"m"` |
| `VAT` | number | VAT rate as percentage (e.g. 25 for 25%) | `25` |
| `Discount` | number | Discount amount or percentage | `10` |
| `DiscountType` | string | Type: `'AMOUNT'` \| `'PERCENT'` | `"PERCENT"` |
| `AccountNumber` | number | Account number | `3000` |
| `CostCenter` | string | Cost center code | `"CC001"` |

**CRITICAL:** Use `AccountNumber`, **NOT** `Account`. If `Account` is used, Fortnox will return: `"Felaktigt fältnamn (Account)"`

### Fields That MUST NOT Be Included in InvoiceRows

The following fields **MUST NOT** be included:

- `Quantity` - Use `DeliveredQuantity` instead
- `Account` - Use `AccountNumber` instead
- `Project` - Must reference existing Fortnox project (not free text)
- `ArticleNumber` - Must reference existing Fortnox article (not free text)
  - Error if not found: `"Kunde inte hitta artikel. (TID-ARB)"`
- `Total`, `TotalVAT`, `TotalExcludingVAT` - Calculated automatically

---

## Example Payload

### Minimal Valid Payload

```json
{
  "Invoice": {
    "CustomerNumber": "6",
    "InvoiceDate": "2025-01-15",
    "DueDate": "2025-02-14",
    "InvoiceRows": [
      {
        "Description": "Arbete 2025-01-15 - Installation",
        "DeliveredQuantity": 8,
        "Price": 500,
        "VAT": 25
      }
    ]
  }
}
```

### Full Payload with Optional Fields

```json
{
  "Invoice": {
    "CustomerNumber": "6",
    "InvoiceDate": "2025-01-15",
    "DueDate": "2025-02-14",
    "Currency": "SEK",
    "YourReference": "Ref-123",
    "OurReference": "INT-456",
    "VATIncluded": true,
    "RotReducedInvoicingType": "ROTRUT",
    "ReverseChargeOnConstructionServices": false,
    "Comments": "Project installation work",
    "InvoiceRows": [
      {
        "Description": "2025-01-15 - Johan Andersson - Arbete - Dagbok: Installed system",
        "DeliveredQuantity": 8,
        "Price": 500,
        "VAT": 25,
        "AccountNumber": 3000,
        "CostCenter": "CC001"
      },
      {
        "Description": "2025-01-15 - Material: Electrical components",
        "DeliveredQuantity": 2,
        "Unit": "st",
        "Price": 1000,
        "VAT": 25,
        "AccountNumber": 4000
      }
    ]
  }
}
```

---

## Error Response Structure

Fortnox API v3 returns errors in the following format:

```json
{
  "ErrorInformation": {
    "error": 1001,
    "code": "INVALID_FIELD",
    "message": "Felaktigt fältnamn (Quantity)"
  }
}
```

Or:

```json
{
  "error": "invalid_request",
  "error_description": "Värdet måste vara alfanumeriskt (Fast och Löpande)"
}
```

Or:

```json
{
  "message": "Kunde inte hitta artikel. (TID-ARB)"
}
```

### Common Error Messages

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `"Felaktigt fältnamn (Quantity)"` | Using `Quantity` instead of `DeliveredQuantity` | Use `DeliveredQuantity` |
| `"Felaktigt fältnamn (Account)"` | Using `Account` instead of `AccountNumber` | Use `AccountNumber` |
| `"Felaktigt fältnamn (TotalExcludingVAT)"` | Including total fields | Remove `Total`, `TotalVAT`, `TotalExcludingVAT` |
| `"Kunde inte hitta konto 3041"` | AccountNumber references non-existent account | Create the account in Fortnox, or remove `AccountNumber` field to use default account |
| `"Värdet måste vara alfanumeriskt (Fast och Löpande)"` | Project field contains invalid characters | Remove `Project` field or use existing Fortnox project reference |
| `"Kunde inte hitta artikel. (TID-ARB)"` | ArticleNumber references non-existent article | Remove `ArticleNumber` field or use existing Fortnox article reference |

---

## Implementation Notes

### Field Name Mapping

When building the payload, ensure the following mappings:

- Internal `quantity` → Fortnox `DeliveredQuantity`
- Internal `account` → Fortnox `AccountNumber`
- Internal `unit_price` → Fortnox `Price`

### Validation Before Sending

Before sending to Fortnox API, validate that:

1. ✅ Required fields are present (`CustomerNumber`, `InvoiceDate`, `DueDate`, `InvoiceRows`)
2. ✅ At least one `InvoiceRow` exists
3. ✅ Each `InvoiceRow` has required fields (`Description`, `DeliveredQuantity`, `Price`)
4. ✅ No forbidden fields are included (`Total*`, `Quantity`, `Account`, `Project`, `ArticleNumber`)
5. ✅ Field names match exactly (case-sensitive)

### Description Format

For time entries, include person, description (which already contains "Arbete [datum]"), and diary:

```
"{person} - Arbete {date} - Dagbok: {diary}"
```

**Note**: Do NOT add `line.date` separately - it's already included in the description as "Arbete [datum]" format.

Example: `"Johan Andersson - Arbete 2025-01-15 - Dagbok: Installed system"`

For other entries, include date and type:

```
"{date} - {type}: {description}"
```

Example: `"2025-01-15 - Material: Electrical components"`

### Unit Field

All line items should include the `Unit` field when available:

- Time entries: `"h"` (hours)
- Material entries: `"st"` (pieces) or null
- Expense entries: `"st"` (pieces)
- Mileage entries: `"km"` (kilometers)
- ÄTA entries: null or custom unit

Example for time entry:
```json
{
  "Description": "Johan Andersson - Arbete 2025-01-15 - Dagbok: Installed system",
  "DeliveredQuantity": 8,
  "Price": 500,
  "Unit": "h",
  "VAT": 25
}
```

---

## Testing Checklist

- [ ] Minimal payload (only required fields) succeeds
- [ ] Payload with optional fields succeeds
- [ ] Payload without `Total*` fields succeeds
- [ ] Payload without `Project` field succeeds
- [ ] Payload without `ArticleNumber` field succeeds
- [ ] Payload with `DeliveredQuantity` (not `Quantity`) succeeds
- [ ] Payload with `AccountNumber` (not `Account`) succeeds
- [ ] Error handling for invalid customer number works
- [ ] Error handling for missing required fields works
- [ ] Error messages are displayed clearly to user

---

## References

- [Fortnox API Documentation](https://api.fortnox.se/apidocs)
- [Fortnox Developer Portal](https://developer.fortnox.se/)
- Integration code: `lib/integrations/fortnox/export-invoice.ts`
- Validation code: `lib/integrations/fortnox/validate-payload.ts`
- Types: `lib/integrations/fortnox/types.ts`

---

## Last Updated

2025-11-19 - Added unit field for time entries, fixed duplicate date in descriptions

