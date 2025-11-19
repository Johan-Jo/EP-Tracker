# Testplan: Fortnox Payroll Export

**Datum:** 2025-01-18  
**Status:** Ready for Testing  
**Miljö:** Development (http://localhost:3000)

---

## Översikt

Denna testplan täcker alla aspekter av Fortnox Payroll Export-funktionaliteten, från konfiguration till export och validering.

---

## Pre-requisites (Förutsättningar)

### Databas Setup
1. ✅ Kör migration: `supabase/migrations/20250118000001_fortnox_payroll_links.sql`
2. ✅ Kör migration: `supabase/migrations/20250118000002_fortnox_payroll_mappings.sql`

### Fortnox Setup
1. ✅ Fortnox-konto med aktiv Payroll-modul
2. ✅ Fortnox-anslutning konfigurerad i EP-Tracker (Inställningar > Fortnox)
3. ✅ OAuth-scope inkluderar "Salary" eller "Lön"
4. ✅ Testanvändare skapade i Fortnox Payroll med kända EmployeeId
5. ✅ Lönearter (SalaryCode) skapade i Fortnox Payroll

### Testdata
1. ✅ Minst 2 anställda i EP-Tracker
2. ✅ Minst 1 låst payroll_basis för testperioden
3. ✅ Employee-mappningar konfigurerade (Inställningar > Fortnox)
4. ✅ Wage code-mappningar konfigurerade (Inställningar > Fortnox)

---

## Test 1: Konfiguration - Employee Mappningar

**Tid:** ~10 minuter

### 1.1 Navigera till Fortnox-inställningar
- [ ] Gå till **Inställningar > Fortnox**
- [ ] Verifiera att sektionen **"Payroll Mappningar"** visas
- [ ] Verifiera att **"Anställd-mappningar"**-kortet visas

### 1.2 Lägg till Employee-mappning via UI
- [ ] I **"Anställd-mappningar"**-sektionen:
  - [ ] Välj en anställd från dropdown (t.ex. "Anna Andersson")
  - [ ] Ange Fortnox EmployeeId (t.ex. "101")
  - [ ] Klicka på **"Lägg till"**
- [ ] **Förväntat:** Mappningen visas i tabellen
- [ ] **Förväntat:** Success-toast visas

### 1.3 Verifiera Employee-mappning i databas
- [ ] Kontrollera databasen:
  ```sql
  SELECT * FROM fortnox_employee_mappings 
  WHERE org_id = 'ditt-org-id';
  ```
- [ ] **Förväntat:** Mappningen finns i databasen

### 1.4 Ta bort Employee-mappning
- [ ] Klicka på **"🗑️ Ta bort"**-knappen för en mappning
- [ ] Bekräfta borttagning
- [ ] **Förväntat:** Mappningen försvinner från tabellen
- [ ] **Förväntat:** Success-toast visas

### 1.5 Försök lägga till duplicerad mappning
- [ ] Försök lägga till samma person_id igen
- [ ] **Förväntat:** Felmeddelande "Mappning för denna anställd finns redan"

---

## Test 2: Konfiguration - Wage Code Mappningar

**Tid:** ~10 minuter

### 2.1 Lägg till Wage Code-mappningar
- [ ] I **"Lönearter-mappningar"**-sektionen:
  - [ ] Välj "Normal" från dropdown
  - [ ] Ange Fortnox SalaryCode (t.ex. "100")
  - [ ] Klicka på **"Lägg till"**
- [ ] **Förväntat:** Mappningen visas i tabellen

### 2.2 Lägg till alla tre wage code-mappningar
- [ ] Lägg till:
  - [ ] Normal → "100"
  - [ ] Övertid → "200"
  - [ ] OB → "300"
- [ ] **Förväntat:** Alla tre mappningar visas i tabellen

### 2.3 Verifiera Wage Code-mappningar i databas
- [ ] Kontrollera databasen:
  ```sql
  SELECT * FROM fortnox_wage_code_mappings 
  WHERE org_id = 'ditt-org-id';
  ```
- [ ] **Förväntat:** Alla tre mappningar finns i databasen

### 2.4 Ta bort Wage Code-mappning
- [ ] Klicka på **"🗑️ Ta bort"**-knappen
- [ ] **Förväntat:** Mappningen försvinner

---

## Test 3: Validering - Payroll Basis

**Tid:** ~15 minuter

### 3.1 Validera låst payroll basis
- [ ] Gå till **Löneunderlag**-sidan
- [ ] Välj en period med låsta poster
- [ ] **Förväntat:** Låsta poster visas med status "Låst"

### 3.2 Validera exportstatus i tabellen
- [ ] Kontrollera tabellen:
  - [ ] Kolumnen **"Fortnox"** visas
  - [ ] Ej exporterade poster visar "–"
  - [ ] Exporterade poster visar "✓ Exporterad" (grön)

### 3.3 Validera att olåsta poster inte kan exporteras
- [ ] Försök exportera en olåst post till Fortnox
- [ ] **Förväntat:** Felmeddelande "Löneunderlag måste vara låst"

---

## Test 4: Export - Lyckad Export

**Tid:** ~20 minuter

### 4.1 Förbered export
- [ ] Kontrollera att:
  - [ ] Fortnox-anslutning är aktiv
  - [ ] Minst 1 payroll basis är låst
  - [ ] Employee-mappningar finns
  - [ ] Wage code-mappningar finns för alla använda lönetyper

### 4.2 Exportera till Fortnox
- [ ] Gå till **Löneunderlag**-sidan
- [ ] Kontrollera att Fortnox-exportalternativet visas i export-menyn
- [ ] Klicka på **"Exportera" > "Exportera till Fortnox (API)"**
- [ ] **Förväntat:** Loading-toast visas
- [ ] **Förväntat:** Success-toast visas med antal transaktioner

### 4.3 Verifiera exportstatus
- [ ] Kontrollera tabellen:
  - [ ] Exporterade poster visar "✓ Exporterad" i Fortnox-kolumnen
  - [ ] Tooltip visar exportdatum

### 4.4 Verifiera i Fortnox
- [ ] Logga in på Fortnox Payroll
- [ ] Gå till **Lön > Transaktioner** eller motsvarande
- [ ] **Förväntat:** Salary transactions visas
- [ ] **Förväntat:** Attendance transactions visas
- [ ] **Förväntat:** EmployeeId matchar mappning
- [ ] **Förväntat:** SalaryCode matchar mappning
- [ ] **Förväntat:** Datum och timmar är korrekta

### 4.5 Verifiera exportstatus i databas
- [ ] Kontrollera databasen:
  ```sql
  SELECT * FROM fortnox_payroll_links 
  WHERE org_id = 'ditt-org-id' 
  ORDER BY exported_at DESC;
  ```
- [ ] **Förväntat:** Export-länk finns i databasen
- [ ] **Förväntat:** `status = 'exported'`
- [ ] **Förväntat:** `fortnox_transaction_ids` innehåller transaction IDs
- [ ] **Förväntat:** `exported_by` matchar användarens ID

---

## Test 5: Export - Felhantering

**Tid:** ~15 minuter

### 5.1 Export utan Fortnox-anslutning
- [ ] Ta bort eller inaktivera Fortnox-anslutning
- [ ] Försök exportera
- [ ] **Förväntat:** Felmeddelande "Fortnox-anslutning saknas"

### 5.2 Export utan employee-mappningar
- [ ] Ta bort alla employee-mappningar
- [ ] Försök exportera
- [ ] **Förväntat:** Felmeddelande om saknade employee-mappningar

### 5.3 Export utan wage code-mappningar
- [ ] Ta bort alla wage code-mappningar
- [ ] Försök exportera
- [ ] **Förväntat:** Felmeddelande om saknade wage code-mappningar

### 5.4 Export med ogiltigt EmployeeId
- [ ] Skapa mappning med ogiltigt EmployeeId (t.ex. "99999")
- [ ] Försök exportera
- [ ] **Förväntat:** Fel från Fortnox API
- [ ] **Förväntat:** Error-toast med felmeddelande
- [ ] **Förväntat:** Exportstatus i databas är "failed"

### 5.5 Export med ogiltigt SalaryCode
- [ ] Skapa wage code-mappning med ogiltigt SalaryCode (t.ex. "INVALID")
- [ ] Försök exportera
- [ ] **Förväntat:** Fel från Fortnox API
- [ ] **Förväntat:** Error-toast med felmeddelande

### 5.6 Export av redan exporterad period
- [ ] Försök exportera samma payroll_basis igen
- [ ] **Förväntat:** Felmeddelande "redan exporterade till Fortnox"

---

## Test 6: Export - Edge Cases

**Tid:** ~20 minuter

### 6.1 Export med endast normala timmar
- [ ] Skapa payroll_basis med endast `hours_norm` (inga övertid eller OB)
- [ ] Exportera
- [ ] **Förväntat:** Endast normala timmar exporteras

### 6.2 Export med endast övertid
- [ ] Skapa payroll_basis med endast `hours_overtime`
- [ ] Exportera
- [ ] **Förväntat:** Endast övertid exporteras

### 6.3 Export med endast OB
- [ ] Skapa payroll_basis med endast `ob_hours`
- [ ] Exportera
- [ ] **Förväntat:** Endast OB exporteras

### 6.4 Export med ob_hours_actual
- [ ] Skapa payroll_basis med `ob_hours = 3` men `ob_hours_actual = 5`
- [ ] Exportera
- [ ] **Förväntat:** 5 OB-timmar exporteras (inte 3)

### 6.5 Export med tom period
- [ ] Skapa payroll_basis med `total_hours = 0` och `gross_salary_sek = null`
- [ ] Försök exportera
- [ ] **Förväntat:** Valideringsfel "inga timmar eller belopp att exportera"

### 6.6 Export med lång period (flera veckor)
- [ ] Skapa payroll_basis för en månad (31 dagar)
- [ ] Exportera
- [ ] **Förväntat:** Transaktioner distribueras korrekt över alla dagar
- [ ] **Förväntat:** Totala timmar matchar

### 6.7 Export med flera anställda
- [ ] Skapa payroll_basis för flera anställda i samma period
- [ ] Exportera alla samtidigt
- [ ] **Förväntat:** Alla anställda exporteras korrekt
- [ ] **Förväntat:** Varje anställd får rätt EmployeeId

---

## Test 7: UI - Export Menu

**Tid:** ~10 minuter

### 7.1 Export menu med Fortnox-anslutning
- [ ] Gå till **Löneunderlag**-sidan
- [ ] Klicka på **"Exportera"**-knappen
- [ ] **Förväntat:** Fortnox-exportalternativet visas om anslutning finns

### 7.2 Export menu utan Fortnox-anslutning
- [ ] Ta bort Fortnox-anslutning
- [ ] Gå till **Löneunderlag**-sidan
- [ ] Klicka på **"Exportera"**-knappen
- [ ] **Förväntat:** Fortnox-exportalternativet visas INTE

### 7.3 Export menu med olåsta poster
- [ ] Gå till **Löneunderlag**-sidan med endast olåsta poster
- [ ] **Förväntat:** Fortnox-exportalternativet är tillgängligt
- [ ] Klicka på **"Exportera till Fortnox"**
- [ ] **Förväntat:** Varning "Inga låsta poster att exportera"

---

## Test 8: API - Integration

**Tid:** ~30 minuter

### 8.1 Test API direkt
- [ ] Använd Postman eller curl för att testa API:
  ```bash
  POST /api/integrations/fortnox/export-payroll
  {
    "payrollBasisIds": ["basis-1"],
    "employeeMappings": [...],
    "wageCodeMappings": [...]
  }
  ```
- [ ] **Förväntat:** 200 OK med success response
- [ ] **Förväntat:** Response innehåller `successCount`, `failureCount`, `transactionIds`

### 8.2 Test API utan authentication
- [ ] Anrop API utan authentication
- [ ] **Förväntat:** 401 Unauthorized

### 8.3 Test API med worker-roll
- [ ] Logga in som worker
- [ ] Anrop API
- [ ] **Förväntat:** 403 Forbidden

### 8.4 Test API med automatiskt mappningshämtning
- [ ] Anrop API utan att skicka mappings
- [ ] **Förväntat:** Mappings hämtas automatiskt från databas
- [ ] **Förväntat:** Export fungerar om mappings finns i databas

---

## Test 9: Performance

**Tid:** ~15 minuter

### 9.1 Export av många poster
- [ ] Skapa 10+ payroll_basis poster
- [ ] Exportera alla samtidigt
- [ ] **Förväntat:** Export tar < 60 sekunder
- [ ] **Förväntat:** Alla poster exporteras korrekt

### 9.2 Export med många transaktioner
- [ ] Skapa payroll_basis för en månad (31 dagar × 3 transaktionstyper)
- [ ] Exportera
- [ ] **Förväntat:** Export fungerar trots många transaktioner

---

## Test 10: Regression - Befintlig funktionalitet

**Tid:** ~10 minuter

### 10.1 Verifiera CSV-export fungerar fortfarande
- [ ] Exportera som CSV
- [ ] **Förväntat:** CSV genereras korrekt

### 10.2 Verifiera PAXml-export fungerar fortfarande
- [ ] Exportera som PAXml
- [ ] **Förväntat:** PAXml genereras korrekt

### 10.3 Verifiera PDF-export fungerar fortfarande
- [ ] Exportera som PDF
- [ ] **Förväntat:** PDF genereras korrekt

---

## Test Results Template

**Datum:** _______________  
**Testare:** _______________  
**Miljö:** _______________

| Test | Status | Anteckningar |
|------|--------|--------------|
| Test 1: Employee Mappningar | ☐ PASS / ☐ FAIL | |
| Test 2: Wage Code Mappningar | ☐ PASS / ☐ FAIL | |
| Test 3: Validering | ☐ PASS / ☐ FAIL | |
| Test 4: Lyckad Export | ☐ PASS / ☐ FAIL | |
| Test 5: Felhantering | ☐ PASS / ☐ FAIL | |
| Test 6: Edge Cases | ☐ PASS / ☐ FAIL | |
| Test 7: UI | ☐ PASS / ☐ FAIL | |
| Test 8: API | ☐ PASS / ☐ FAIL | |
| Test 9: Performance | ☐ PASS / ☐ FAIL | |
| Test 10: Regression | ☐ PASS / ☐ FAIL | |

**Overall Status:** ☐ PASS / ☐ FAIL

**Kritiska Buggar:**
- 

**Mindre Buggar:**
- 

**Förbättringsförslag:**
- 

---

## Nästa Steg

Efter testning:
1. Dokumentera alla buggar
2. Prioritera buggar (Critical / High / Medium / Low)
3. Fixa kritiska buggar
4. Kör regressionstester
5. Förbered för produktion

---

**Klar för testning!** 🚀

