# EPIC 34: Implementation Status

## ✅ Implementerat

### M4a - Read-only View
- ✅ Visa fakturaunderlag per projekt/period
- ✅ Alla linjetyper (time, material, expense, mileage, ata, diary)
- ✅ Moms per sats (0/6/12/25)
- ✅ Totalsummering (ex moms, moms, inkl moms)
- ✅ Dagbokssammanfattning i `lines_json.diary`
- ✅ Kundinformation från kundregister (just fixat!)
- ✅ Visning av kundinformation i UI (just fixat!)

### M4b - Editing
- ✅ Redigera headerfält (serie, nummer, datum, betalvillkor, referenser, etc.)
- ✅ Redigera rader (beskrivning, artikel, konto, á-pris, moms, etc.)
- ✅ Audit-logg på ändringar
- ✅ Inline-redigering i UI

### M4c - Lock & Export (delvis)
- ✅ Låsning med fakturaserie, nummer, OCR, hash
- ✅ Oplåsning med motivering
- ✅ CSV-export med dagbok (använder invoice_basis data, kräver låsning)
- ✅ PDF-export med svensk fakturalayout (just implementerat!)
- ❌ SIE-export (saknas)

### M4d - SE-invoice Compliance (delvis)
- ✅ Fakturaserie
- ✅ Fakturanummer
- ✅ Betalvillkor (från kundregister)
- ✅ Moms/momskod (0/6/12/25)
- ✅ OCR-referens
- ✅ Omvänd byggmoms (reverse_charge_building)
- ✅ ROT/RUT-flagga (från kundregister)
- ✅ Kundinformation (invoice_address_json, delivery_address_json, customer_snapshot)
- ✅ Referenser (our_ref, your_ref från kundregister)
- ❌ PDF med svensk fakturalayout (saknas)
- ❌ Standardtexter för omvänd byggmoms/ROT (saknas)

### Data Model
- ✅ `invoice_basis` tabell med alla fält
- ✅ `lines_json` med alla linjetyper inkl. diary
- ✅ `totals` med per-sats-moms
- ✅ `customer_snapshot` för audit trail
- ✅ `locked`, `locked_by`, `locked_at`, `hash_signature`

### Jobs/Schedulers
- ✅ `refreshInvoiceBasis()` - aggregerar alla linjetyper
- ✅ Dagbokssanering och sammanfattning
- ✅ Kundinformation från kundregister
- ✅ Hourly rates från employees/subcontractors

### API Routes
- ✅ `GET /api/invoice-basis/[projectId]` - Hämtar/refreshar underlag
- ✅ `POST /api/invoice-basis/[projectId]/header` - Uppdaterar header
- ✅ `POST /api/invoice-basis/[projectId]/lines/[lineId]` - Uppdaterar rad
- ✅ `POST /api/invoice-basis/[projectId]/lock` - Låser underlag
- ✅ `POST /api/invoice-basis/[projectId]/unlock` - Låser upp
- ✅ `GET /api/exports/invoice` - CSV-export (men saknar dagbok)

### UI/UX
- ✅ Fakturaunderlag-sida med projekt/period-väljare
- ✅ Radlista med alla linjetyper
- ✅ Dagboksvy (visas i UI)
- ✅ Redigeringsläge
- ✅ Låsning/oplåsning
- ✅ Export-knapp
- ✅ Kundinformation-sektion (just fixat!)

## ❌ Saknas / Ofullständigt

### M4c - Export (nästan komplett)
- ✅ CSV-export använder nu invoice_basis data och inkluderar dagbok
- ✅ Dagbok som separata rader i CSV (Type="Dagbok", sanerad text, utan belopp)
- ✅ Export kräver låsning
- ✅ PDF-export med svensk fakturalayout (just implementerat!)
- ❌ SIE-export

### M4e - Integrations
- ❌ Fortnox API-integration
- ❌ Visma API-integration
- ❌ Fortnox CSV-import
- ❌ Visma CSV-import
- ❌ Master data sync (kunder, artiklar, projekt, kostnadsställen)
- ❌ Mapping-tabeller (acct_map, article_map, customer_map, project_map, costcenter_map)

### M4d - Compliance (delvis)
- ✅ PDF-generering med svensk fakturalayout (just implementerat!)
- ✅ Standardtext för omvänd byggmoms (visas i PDF)
- ❌ Standardtexter för ROT/RUT (saknas)
- ❌ Validering av obligatoriska fält vid export

### Övrigt
- ✅ Export kräver låsning
- ✅ Export använder invoice_basis data
- ❌ Bilagor (attachments) visas inte i export

## 🔧 Kritiska Fixar Behövs

1. ✅ **CSV-export använder nu invoice_basis data** - FIXAT
   - Använder `invoice_basis.lines_json.lines` för alla rader
   - Inkluderar `invoice_basis.lines_json.diary` som separata rader (Type="Dagbok")
   - Kräver `locked = true` för export

2. ✅ **Dagbok i CSV-export** - FIXAT
   - Diary-rader längst ned i CSV
   - Format: Type="Dagbok", Article="", Qty=0, Unit="", priser 0, Text=sanerad sammanfattning

3. ✅ **PDF-export** - FIXAT
   - PDF-generering med svensk fakturalayout
   - Dagbok visas som egen sektion "Fakturatext – Dagbok" före totalsummering
   - Alla obligatoriska fält (org.nr, OCR, betalvillkor, per-momssats-summering, omvänd byggmoms-text)

4. **SIE-export**
   - Implementera SIE-format med verifikation per faktura/period
   - Per-sats-moms

## 📊 Status Sammanfattning

| Komponent | Status | Kommentar |
|-----------|--------|-----------|
| M4a - View | ✅ 100% | Allt implementerat |
| M4b - Editing | ✅ 100% | Allt implementerat |
| M4c - Lock & Export | ⚠️ 85% | CSV och PDF med dagbok fixat, SIE saknas |
| M4d - Compliance | ⚠️ 85% | PDF fixat, ROT/RUT-standardtexter saknas |
| M4e - Integrations | ❌ 0% | Inte påbörjat |

**Total: ~80% implementerat**

## 🎯 Nästa Steg

1. ✅ Fixa CSV-export att använda invoice_basis data och inkludera dagbok - KLART
2. ✅ Implementera PDF-export - KLART
3. Implementera SIE-export
4. Implementera Fortnox/Visma-integrationer (M4e)

