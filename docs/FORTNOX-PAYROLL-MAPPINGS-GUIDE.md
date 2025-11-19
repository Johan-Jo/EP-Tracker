# Guide: Konfigurera Fortnox Payroll Mappningar

Denna guide förklarar hur du konfigurerar mappningar mellan EP-Tracker och Fortnox Payroll för att kunna exportera löneunderlag.

## Översikt

För att exportera löneunderlag till Fortnox Payroll behöver du konfigurera två typer av mappningar:

1. **Employee Mappings** - Mappar EP-Tracker anställda till Fortnox EmployeeId
2. **Wage Code Mappings** - Mappar EP-Tracker lönetyper till Fortnox SalaryCode

## Metod 1: Via UI (Rekommenderat)

1. Gå till **Inställningar > Fortnox** i EP-Tracker
2. Scrolla ner till sektionen **"Payroll Mappningar"**
3. Följ instruktionerna nedan för varje typ av mappning

### Anställd-mappningar

1. I sektionen **"Anställd-mappningar"**:
   - Välj en anställd från dropdown-menyn
   - Ange deras **Fortnox EmployeeId** (detta måste matcha EmployeeId i Fortnox Payroll)
   - Klicka på **"Lägg till"**

2. **Hitta Fortnox EmployeeId:**
   - Logga in på Fortnox
   - Gå till **Lön > Anställda**
   - Öppna anställdens profil
   - EmployeeId visas i anställdens information (kan vara ett nummer eller en kod)

### Lönearter-mappningar

1. I sektionen **"Lönearter-mappningar"**:
   - Välj en lönetyp från dropdown-menyn:
     - **Normal** - För normala timmar (normaltimmar)
     - **Övertid** - För övertidstimmar
     - **OB** - För OB-timmar (natt/helg/helgdag)
   - Ange motsvarande **Fortnox SalaryCode** (t.ex. "100", "200", etc.)
   - Klicka på **"Lägg till"**

2. **Hitta Fortnox SalaryCode:**
   - Logga in på Fortnox
   - Gå till **Lön > Register > Lönearter och koder**
   - Välj en lönearter-tabell och tryck på **"Skriv ut"** för att se alla tillgängliga koder
   - Alternativt, kontakta din löneadministratör för att få rätt koder

## Metod 2: Via SQL (Avancerat)

Om du föredrar att konfigurera mappningar direkt i databasen kan du använda SQL:

### Anställd-mappningar

```sql
-- Hämta person_id för anställd (ersätt email med anställdens email)
SELECT id, full_name, email 
FROM profiles 
WHERE email = 'anstalld@example.com';

-- Lägg till mappning (ersätt person_id och fortnox_employee_id)
INSERT INTO fortnox_employee_mappings (org_id, person_id, fortnox_employee_id)
VALUES (
  'ditt-org-id-here'::uuid,
  'person-id-here'::uuid,
  '123'  -- Fortnox EmployeeId
);
```

### Lönearter-mappningar

```sql
-- Lägg till mappning för normala timmar
INSERT INTO fortnox_wage_code_mappings (org_id, ep_wage_type, fortnox_salary_code, description, is_active)
VALUES (
  'ditt-org-id-here'::uuid,
  'normal',
  '100',  -- Fortnox SalaryCode för normala timmar
  'Normal timmar',
  true
);

-- Lägg till mappning för övertid
INSERT INTO fortnox_wage_code_mappings (org_id, ep_wage_type, fortnox_salary_code, description, is_active)
VALUES (
  'ditt-org-id-here'::uuid,
  'overtime',
  '200',  -- Fortnox SalaryCode för övertid
  'Övertid',
  true
);

-- Lägg till mappning för OB
INSERT INTO fortnox_wage_code_mappings (org_id, ep_wage_type, fortnox_salary_code, description, is_active)
VALUES (
  'ditt-org-id-here'::uuid,
  'ob',
  '300',  -- Fortnox SalaryCode för OB
  'OB (natt/helg/helgdag)',
  true
);
```

## Verifiera mappningar

Efter att du har konfigurerat mappningarna kan du verifiera dem:

```sql
-- Visa alla employee-mappningar
SELECT 
  em.*,
  p.full_name,
  p.email
FROM fortnox_employee_mappings em
JOIN profiles p ON p.id = em.person_id
WHERE em.org_id = 'ditt-org-id-here'::uuid;

-- Visa alla wage code-mappningar
SELECT *
FROM fortnox_wage_code_mappings
WHERE org_id = 'ditt-org-id-here'::uuid
  AND is_active = true;
```

## Felsökning

### "Inga employee-mappningar hittades"

- Kontrollera att du har lagt till minst en employee-mappning
- Verifiera att EmployeeId matchar exakt det som finns i Fortnox Payroll
- Se till att anställden faktiskt finns i Fortnox Payroll

### "Inga wage code-mappningar hittades"

- Kontrollera att du har lagt till mappningar för alla lönetyper som används (normal, overtime, ob)
- Verifiera att SalaryCode matchar exakt det som finns i Fortnox Payroll
- Kontrollera att `is_active = true` för mappningarna

### "Employee not found in Fortnox Payroll"

- Verifiera att EmployeeId är korrekt
- Se till att anställden är skapad i Fortnox Payroll innan export
- Kontrollera att anställden inte är inaktiverad i Fortnox

### "Invalid SalaryCode"

- Verifiera att SalaryCode matchar exakt det som finns i Fortnox Payroll
- Kontrollera att lönearter finns i Fortnox Payroll
- Se till att du använder rätt format (oftast en siffra eller kod)

## Exempel: Komplett setup

Här är ett komplett exempel för en organisation med 3 anställda:

```sql
-- Hämta org_id
SELECT id, name FROM organizations WHERE name = 'Ditt Företag';

-- Antag att org_id är: '123e4567-e89b-12d3-a456-426614174000'

-- Employee-mappningar
INSERT INTO fortnox_employee_mappings (org_id, person_id, fortnox_employee_id)
SELECT 
  '123e4567-e89b-12d3-a456-426614174000'::uuid,
  id,
  CASE 
    WHEN email = 'anna@example.com' THEN '101'
    WHEN email = 'erik@example.com' THEN '102'
    WHEN email = 'maria@example.com' THEN '103'
  END
FROM profiles
WHERE email IN ('anna@example.com', 'erik@example.com', 'maria@example.com');

-- Wage code-mappningar
INSERT INTO fortnox_wage_code_mappings (org_id, ep_wage_type, fortnox_salary_code, description, is_active)
VALUES
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'normal', '100', 'Normal timmar', true),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'overtime', '200', 'Övertid', true),
  ('123e4567-e89b-12d3-a456-426614174000'::uuid, 'ob', '300', 'OB', true);
```

## Nästa steg

När mappningarna är konfigurerade:

1. Gå till **Löneunderlag**-sidan
2. Lås löneunderlaget för den period du vill exportera
3. Klicka på **"Exportera" > "Exportera till Fortnox (API)"**
4. Verifiera att transaktionerna visas korrekt i Fortnox Payroll

## Support

Om du stöter på problem:
- Kontrollera att Fortnox-anslutningen är aktiv (Inställningar > Fortnox)
- Verifiera att alla mappningar är korrekta
- Kontakta support om problemet kvarstår

