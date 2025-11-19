# Fortnox Payroll API v3 Specification

## Overview

This document describes the Fortnox API v3 endpoints for payroll/salary data export, based on official API documentation at https://api.fortnox.se/apidocs.

**Last Updated:** 2025-01-18  
**API Version:** v3  
**Base URL:** `https://api.fortnox.se/3`

---

## Resources

Fortnox Payroll API provides two main resources for exporting payroll data:

1. **Salary Transactions** - For salary/wage transactions (lönetransaktioner)
2. **Attendance Transactions** - For attendance/worked hours (närvarotransaktioner)

---

## 1. Salary Transactions Resource

### Endpoint

**POST** `/3/salarytransactions`

Creates a new salary transaction for an employee.

### Request Structure

All requests must wrap the payload:

```json
{
  "SalaryTransaction": {
    // Transaction payload here
  }
}
```

### SalaryTransaction Payload

#### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `EmployeeId` | string | Yes | Employee identifier in Fortnox | `"123"` |
| `Date` | string (date) | Yes | Transaction date in YYYY-MM-DD format | `"2025-01-15"` |
| `SalaryCode` | string | Yes | Wage type code (lönearter) | `"100"` |
| `Amount` | string | No | Amount (SEK) | `"5000.00"` |
| `CostCenter` | string | No | Cost center code | `"CC001"` |
| `Expense` | string | No | Expense field | `""` |
| `Number` | string | No | Number field | `""` |
| `Project` | string | No | Project identifier | `"PROJ001"` |
| `TextRow` | string | No | Description/comment | `"Arbetstid januari"` |
| `Total` | string | No | Total amount (calculated by Fortnox) | `"5000.00"` |
| `VAT` | string | No | VAT amount | `"0.00"` |
| `SalaryRow` | integer | No | Transaction ID (returned by API, not sent) | `12345` |

#### Notes

- `SalaryRow` is returned by the API after creation and should not be included in POST requests
- `Total` and `VAT` are typically calculated by Fortnox, but can be provided
- `SalaryCode` must reference an existing wage type in Fortnox Payroll
- Employee must exist in Fortnox Payroll and be identified by `EmployeeId`

### Response Structure

#### Success (201 Created)

```json
{
  "SalaryTransaction": {
    "SalaryRow": 12345,
    "EmployeeId": "123",
    "Date": "2025-01-15",
    "SalaryCode": "100",
    "Amount": "5000.00",
    "CostCenter": "CC001",
    "Project": "PROJ001",
    "TextRow": "Arbetstid januari",
    "Total": "5000.00",
    "VAT": "0.00",
    "Expense": "",
    "Number": ""
  }
}
```

#### Error Response

Same error format as other Fortnox API endpoints:

```json
{
  "ErrorInformation": {
    "error": 1001,
    "code": "INVALID_FIELD",
    "message": "Felaktigt fältnamn (FieldName)"
  }
}
```

### Other Endpoints

- **GET** `/3/salarytransactions/{SalaryRow}` - Retrieve a single transaction
- **PUT** `/3/salarytransactions/{SalaryRow}` - Update a transaction
- **DELETE** `/3/salarytransactions/{SalaryRow}` - Delete a transaction
- **GET** `/3/salarytransactions` - List all salary transactions (with filters)

---

## 2. Attendance Transactions Resource

### Endpoint

**POST** `/3/attendancetransactions`

Creates a new attendance transaction (närvarotransaktion) for an employee.

### Request Structure

```json
{
  "AttendanceTransaction": {
    // Transaction payload here
  }
}
```

### AttendanceTransaction Payload

#### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `EmployeeId` | string | Yes | Employee identifier in Fortnox | `"123"` |
| `Date` | string (date) | Yes | Transaction date in YYYY-MM-DD format | `"2025-01-15"` |
| `CauseCode` | string | Yes | Attendance cause code (see enum below) | `"ARB"` |
| `Hours` | string | Yes | Number of hours | `"8.0"` |
| `CostCenter` | string | No | Cost center code | `"CC001"` |
| `Project` | string | No | Project identifier | `"PROJ001"` |

#### CauseCode Enum Values

The `CauseCode` field must be one of the following values:

- `"ARB"` - Work (Arbete)
- `"BE2"` - Sick leave (Sjukdom)
- `"BER"` - Sick leave (alternative)
- `"FLX"` - Flex time
- `"HLG"` - Half day
- `"JO2"` - Public holiday (alternative)
- `"JOR"` - Public holiday (Helgdag)
- `"MER"` - Overtime (Merarbete)
- `"OB1"` - Overtime 1
- `"OB2"` - Overtime 2
- `"OB3"` - Overtime 3
- `"OB4"` - Overtime 4
- `"OB5"` - Overtime 5
- `"OK0"` - Compensatory time 0
- `"OK1"` - Compensatory time 1
- `"OK2"` - Compensatory time 2
- `"OK3"` - Compensatory time 3
- `"OK4"` - Compensatory time 4
- `"OK5"` - Compensatory time 5
- `"OT1"` - Overtime 1 (alternative)
- `"OT2"` - Overtime 2 (alternative)
- `"OT3"` - Overtime 3 (alternative)
- `"OT4"` - Overtime 4 (alternative)
- `"OT5"` - Overtime 5 (alternative)
- `"RES"` - Reserved
- `"TID"` - Time

### Response Structure

#### Success (201 Created)

```json
{
  "AttendanceTransaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "EmployeeId": "123",
    "Date": "2025-01-15",
    "CauseCode": "ARB",
    "Hours": "8.0",
    "CostCenter": "CC001",
    "Project": "PROJ001"
  }
}
```

#### Error Response

Same error format as Salary Transactions.

### Other Endpoints

- **GET** `/3/attendancetransactions/{id}` - Retrieve a single transaction (by UUID)
- **PUT** `/3/attendancetransactions/{id}` - Update a transaction
- **DELETE** `/3/attendancetransactions/{id}` - Delete a transaction
- **GET** `/3/attendancetransactions/{EmployeeId}/{Date}/{Code}` - Retrieve transactions for employee/date/code

---

## Authentication

### OAuth Scopes

The payroll endpoints require OAuth scopes. Based on the API structure, likely scopes include:
- `salary` or `payroll` scope (verify in Fortnox Developer Portal)

**Note:** Verify the exact scope name in Fortnox Developer Portal when setting up OAuth application.

### Headers

Same as other Fortnox API v3 endpoints:

```
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## Field Mapping from EP-Tracker

### Employee Identification

- **EP-Tracker:** `employees.employee_no` or `profiles.personal_number`
- **Fortnox:** `EmployeeId` (string) - Must match employee ID in Fortnox Payroll

**Important:** Employee must exist in Fortnox Payroll before creating transactions.

### Date/Period

- **EP-Tracker:** `payroll_basis.period_start` / `period_end`
- **Fortnox:** `Date` (YYYY-MM-DD) - Individual transaction date

### Hours

- **EP-Tracker:** `payroll_basis.total_hours`, `hours_norm`, `hours_overtime`, `ob_hours`
- **Fortnox Attendance:** `Hours` (string, decimal format like "8.0")
- **Fortnox Salary:** Use `Amount` for salary transactions (hours × rate)

### Wage Types / Salary Codes

- **EP-Tracker:** Internal wage type codes from payroll rules
- **Fortnox:** `SalaryCode` (string) - Must match existing wage type in Fortnox Payroll

**Mapping Required:** Create a mapping table/config to map EP-Tracker wage types to Fortnox `SalaryCode` values.

### Amounts

- **EP-Tracker:** `gross_salary_sek`, calculated amounts
- **Fortnox Salary:** `Amount` (string, SEK with decimals)

### Cause Codes for Attendance

Map EP-Tracker time types to Fortnox `CauseCode`:

- Normal hours → `"ARB"`
- Overtime → `"OB1"`, `"OB2"`, etc. (or `"MER"`)
- Break hours → May not need separate transaction
- Absence → `"BE2"` (sick leave) or other appropriate code

---

## Batch Operations

**Important:** Fortnox API does not appear to support batch creation in a single request. Each transaction must be posted individually.

**Recommendation:** 
- Post transactions sequentially
- Collect success/failure per transaction
- Return summary with success count, failure count, and per-transaction results

---

## Error Handling

### Common Error Scenarios

1. **Invalid EmployeeId**
   - Error: Employee not found in Fortnox Payroll
   - Solution: Ensure employee exists and `EmployeeId` matches

2. **Invalid SalaryCode**
   - Error: Wage type not found
   - Solution: Verify wage type exists in Fortnox Payroll and mapping is correct

3. **Missing Required Fields**
   - Error: Field validation error
   - Solution: Ensure all required fields are present

4. **Duplicate Transactions**
   - Behavior: Check if Fortnox allows duplicates or returns error
   - Solution: Implement idempotency check using `fortnox_payroll_links` table

5. **OAuth Scope Missing**
   - Error: Unauthorized or insufficient permissions
   - Solution: Verify OAuth application has payroll/salary scope enabled

---

## TypeScript Interfaces

```typescript
/**
 * Fortnox Salary Transaction Payload
 */
export interface FortnoxSalaryTransactionPayload {
  EmployeeId: string;
  Date: string; // YYYY-MM-DD
  SalaryCode: string;
  Amount?: string;
  CostCenter?: string;
  Expense?: string;
  Number?: string;
  Project?: string;
  TextRow?: string;
  Total?: string;
  VAT?: string;
}

/**
 * Fortnox Salary Transaction Response
 */
export interface FortnoxSalaryTransactionResponse {
  SalaryTransaction: {
    SalaryRow: number;
    EmployeeId: string;
    Date: string;
    SalaryCode: string;
    Amount: string;
    CostCenter?: string;
    Expense?: string;
    Number?: string;
    Project?: string;
    TextRow?: string;
    Total?: string;
    VAT?: string;
  };
}

/**
 * Fortnox Attendance Transaction Payload
 */
export interface FortnoxAttendanceTransactionPayload {
  EmployeeId: string;
  Date: string; // YYYY-MM-DD
  CauseCode: 'ARB' | 'BE2' | 'BER' | 'FLX' | 'HLG' | 'JO2' | 'JOR' | 'MER' | 
             'OB1' | 'OB2' | 'OB3' | 'OB4' | 'OB5' | 
             'OK0' | 'OK1' | 'OK2' | 'OK3' | 'OK4' | 'OK5' |
             'OT1' | 'OT2' | 'OT3' | 'OT4' | 'OT5' | 'RES' | 'TID';
  Hours: string; // Decimal format like "8.0"
  CostCenter?: string;
  Project?: string;
}

/**
 * Fortnox Attendance Transaction Response
 */
export interface FortnoxAttendanceTransactionResponse {
  AttendanceTransaction: {
    id: string; // UUID
    EmployeeId: string;
    Date: string;
    CauseCode: string;
    Hours: string;
    CostCenter?: string;
    Project?: string;
  };
}
```

---

## Implementation Notes

### When to Use Salary Transactions vs Attendance Transactions

- **Salary Transactions:** Use for wage/salary amounts, bonuses, allowances, expenses
- **Attendance Transactions:** Use for worked hours, overtime, absence, attendance records

**For EP-Tracker payroll basis:**
- Normal hours + overtime → Use **Attendance Transactions** with appropriate `CauseCode`
- Salary amounts → Use **Salary Transactions** with `SalaryCode` and `Amount`

### Idempotency

- Use `fortnox_payroll_links` table to track exported transactions
- Check before exporting if period/employee combination already exists
- Store returned `SalaryRow` (for salary) or `id` (for attendance) for future reference

### Validation Before Export

1. Verify `payroll_basis` is locked
2. Verify employee has valid `EmployeeId` in Fortnox (may need to sync employees first)
3. Verify all wage types have mappings to Fortnox `SalaryCode`
4. Verify dates are within valid range
5. Verify amounts/hours are > 0 where required

---

## References

- [Fortnox API Documentation](https://api.fortnox.se/apidocs)
- [Fortnox Developer Portal](https://developer.fortnox.se/)
- Integration code: `lib/integrations/fortnox/export-payroll.ts`
- Client code: `lib/integrations/fortnox/client.ts`
- Types: `lib/integrations/fortnox/types.ts`

