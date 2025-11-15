'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	Lightbulb,
	BookOpen,
	HelpCircle,
	Video,
	Clock,
	Package,
	CheckSquare,
	FileText,
	Info,
	PlayCircle,
	RotateCcw,
	ChevronDown,
	Calendar,
	CalendarCheck,
	Users,
	Bell,
	Mic,
	DollarSign,
	Building2,
	QrCode,
	FileEdit,
	Settings,
	LayoutDashboard,
	ContactRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

interface HelpPageNewProps {
	userRole: 'admin' | 'foreman' | 'worker' | 'finance' | 'ue';
}

export function HelpPageNew({ userRole }: HelpPageNewProps) {
	const router = useRouter(); // PERFORMANCE OPTIMIZATION (Story 26.3)
	const [activeTab, setActiveTab] = useState('guides');
	const [openFaqs, setOpenFaqs] = useState<string[]>([]);

	const toggleFaq = (id: string) => {
		setOpenFaqs((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
	};

	const allGuides = [
		{
			title: 'Organisationsinställningar',
			description: 'Håll kontaktuppgifter, adress och standardtider uppdaterade',
			icon: Building2,
			roles: ['admin'],
			sections: [
				{
					title: 'Adress via Geoapify',
					items: [
						'Öppna "Inställningar → Organisation".',
						'Skriv organisationens adress i fältet "Adress". Förslag hämtas från Geoapify.',
						'Välj ett av sökförslagen. Postnummer och ort fylls i automatiskt och kan inte ändras manuellt.',
						'Behöver du ny adress? Sök igen och välj ett nytt förslag.',
					],
				},
				{
					title: 'Bankinformation',
					items: [
						'Bankinformation visas på fakturor som genereras för kunder.',
						'Fyll i Bankgiro (format: 123-4567) för svenska betalningar.',
						'Fyll i Plusgiro (format: 12 34 56-7) om du använder Plusgiro.',
						'För internationella betalningar: fyll i IBAN och BIC/SWIFT-kod.',
						'Alla fält är valfria - fyll bara i de som är relevanta för din organisation.',
						'Bankinformationen sparas och används automatiskt vid fakturaexport (PDF).',
					],
				},
				{
					title: 'Standardarbetstid & raster',
					items: [
						'Starttid, sluttid och ordinarie arbetstid är förifyllt till 07:00 – 16:00 (8 timmar).',
						'Lunchen är förvald till 11:00–12:00. Justera vid behov för din organisation.',
						'Klicka "Lägg till rast" för fler pauser eller ta bort med papperskorgen.',
						'Spara för att uppdatera nya projekt och planeringens standardvärden.',
					],
				},
				{
					title: 'Momsuppgifter',
					items: [
						'Aktivera reglaget om bolaget är momsregistrerat.',
						'Fyll i VAT-nummer och standard momssats. Dessa används i rapporter och exportfiler.',
						'Kom ihåg att spara efter varje ändring.',
					],
				},
			],
		},
		{
			title: 'Tidsrapportering',
			description: 'Lär dig att registrera arbetstid',
			icon: Clock,
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
			sections: [
				{
					title: 'Snabbstart timer',
					items: [
						'Klicka på "Starta timer" i navigationen',
						'Välj projekt och uppgift',
						'Timern börjar direkt',
						'Klicka "Stoppa" när du är klar',
					],
				},
				{
					title: 'Checkout-bekräftelse och tidredigering',
					items: [
						'När du checkar ut från översiktssidan visas en bekräftelsedialog',
						'Dialogrutan visar: check-in tid, check-out tid och total arbetad tid',
						'Följande fråga visas: "Stämmer tiden för din arbetsdag?"',
						'Klicka "Ja, spara" för att acceptera tiden och gå vidare',
						'Klicka "Nej, editera" för att justera tiderna',
						'I redigeringsläge: datum visas som read-only (kan inte ändras)',
						'Använd +/- knapparna för att justera timmar och minuter',
						'Du kan också skriva tiden direkt i fälten',
						'Total arbetad tid uppdateras automatiskt när du ändrar tider',
						'Efter redigering: klicka "Spara och checka ut"',
						'Efter checkout: du kan välja att skapa en dagbokspost',
					],
				},
				{
					title: 'Manuell registrering',
					items: [
						'Gå till "Tid"-sidan',
						'Klicka "Lägg till tid"',
						'Fyll i datum, start, stopp',
						'Välj projekt och fas',
						'Spara',
					],
				},
			],
		},
		{
			title: 'Röstanteckningar (Voice-to-Text)',
			description: 'Diktera arbetsrapporter och få automatisk översättning',
			icon: Mic,
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
			sections: [
				{
					title: 'Spela in röstanteckning',
					items: [
						'Gå till "Dagbok"-sidan',
						'Klicka på mikrofon-ikonen',
						'Prata in din arbetsrapport (på valfritt språk)',
						'Systemet visar ljudnivå i realtid',
						'Klicka "Stoppa" när du är klar',
					],
				},
				{
					title: 'Automatisk bearbetning',
					items: [
						'Ljudet laddas upp automatiskt',
						'Whisper AI transkriberar din röst till text',
						'Om du pratade på annat språk än svenska översätts texten automatiskt',
						'Du får direkt feedback om transkription och översättning',
						'Texten sparas och kan användas för dagboksanteckningar',
					],
				},
				{
					title: 'Språkstöd',
					items: [
						'Automatisk språkdetektering - prata på valfritt språk',
						'Stöd för: Svenska, Engelska, Polska, Tyska, Spanska, och många fler',
						'AI översätter automatiskt till svenska',
						'Perfekt för flerspråkiga team',
					],
				},
				{
					title: 'Tips för bästa resultat',
					items: [
						'Tala tydligt och i normal hastighet',
						'Undvik mycket bakgrundsljud om möjligt',
						'Använd branschtermer - systemet känner igen byggtermer',
						'Du kan diktera mätningar, material och arbetsbeskrivningar',
					],
				},
			],
		},
		{
			title: 'Material & Utlägg',
			description: 'Registrera material och kostnader',
			icon: Package,
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
			sections: [
				{
					title: 'Material',
					items: [
						'Gå till "Material"-sidan',
						'Klicka "Lägg till material"',
						'Beskriv vad du har beställt',
						'Ange antal och pris',
						'Ta foto på kvitto (valfritt)',
						'Spara',
					],
				},
				{
					title: 'Utlägg',
					items: [
						'Välj "Utlägg"-fliken',
						'Klicka "Lägg till utlägg"',
						'Välj kategori (parkering, verktyg, etc.)',
						'Ange belopp',
						'Ta foto på kvitto',
						'Spara',
					],
				},
			],
		},
		{
			title: 'Dagens uppdrag (Mobil)',
			description: 'Checklista för fältarbetare',
			icon: CalendarCheck,
			roles: ['admin', 'foreman', 'worker', 'ue'],
			sections: [
				{
					title: 'Dagens jobb',
					items: [
						'Gå till "Planering → Idag"',
						'Se alla dina uppdrag för dagen',
						'Checka in när du börjar',
						'Navigera till arbetsplatsen',
						'Checka ut när du är klar',
					],
				},
				{
					title: 'Snabbnavigering',
					items: [
						'Klicka "Navigera" på ett uppdrag',
						'Google Maps öppnas automatiskt',
						'Kör till arbetsplatsen',
					],
				},
			],
		},
		{
			title: 'Planering',
			description: 'Schemalägg uppdrag för veckan',
			icon: Calendar,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Skapa uppdrag',
					items: [
						'Gå till "Planering"',
						'Klicka på ett datum i kalendern',
						'Välj projekt och personal',
						'Ange tid och anteckningar',
						'Spara uppdraget',
					],
				},
				{
					title: 'Flytta uppdrag',
					items: [
						'Dra ett uppdrag till nytt datum',
						'Släpp för att flytta',
						'Ändringar sparas direkt',
						'Dubbel-klicka för att redigera',
					],
				},
				{
					title: 'Automatisk projektmedlemskap',
					items: [
						'Dra uppdrag till en användare som inte är medlem',
						'En dialogruta frågar om du vill lägga till användaren',
						'Klicka "Ja" för att automatiskt lägga till i teamet',
						'Uppdraget flyttas och användaren får åtkomst direkt',
					],
				},
			],
		},
		{
			title: 'Godkännanden',
			description: 'Granska och godkänn poster',
			icon: CheckSquare,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Godkänn poster',
					items: [
						'Gå till "Godkännanden"',
						'Välj vecka att granska',
						'Välj flik: "Tidrapporter" eller "Kostnader"',
						'Markera de poster du vill godkänna',
						'Klicka "Godkänn" för bulk-godkännande',
					],
				},
				{
					title: 'Godkännandetyper',
					items: [
						'Tidrapporter - Arbetsrapporter från användare',
						'Material - Material som beställts eller använts',
						'Utlägg - Kostnader och utgifter',
						'Miltal - Miltalsersättning',
						'ÄTA - Ändringsbeslut',
					],
				},
				{
					title: 'Statusvärden',
					items: [
						'Utkast - Posten är inte skickad än',
						'Väntar godkännande - Posten väntar på ditt godkännande',
						'Godkänd - Posten är godkänd och kan faktureras',
						'Avvisad - Posten är avvisad och kan redigeras',
					],
				},
				{
					title: 'Avvisa poster',
					items: [
						'Markera poster som behöver ändras',
						'Klicka "Avvisa"-knappen',
						'Skriv kommentar med anledning (obligatoriskt)',
						'Användaren får notifikation och kan redigera',
					],
				},
				{
					title: 'Tips',
					items: [
						'Använd bulk-godkännande för att spara tid',
						'Godkänn alla poster från samma användare i taget',
						'Kontrollera att material och utlägg är kopplade till rätt projekt',
						'Dagboksposter kräver inte godkännande',
					],
				},
			],
		},
		{
			title: 'Projektmedlemmar',
			description: 'Hantera teammedlemmar och projektåtkomst',
			icon: Users,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Lägga till medlemmar',
					items: [
						'Öppna ett projekt',
						'Gå till "Team"-fliken',
						'Klicka "Hantera team"',
						'Välj vilka användare som ska ha åtkomst',
						'Klicka "Lägg till" eller "Ta bort"',
					],
				},
				{
					title: 'Åtkomstkontroll',
					items: [
						'Användare ser bara projekt de är tilldelade till',
						'All tid, material och dokument är projektspecifik',
						'Admins och arbetsledare kan tilldela medlemmar',
						'Workers rapporterar bara på sina tilldelade projekt',
					],
				},
			],
		},
		{
			title: 'Projekt Alert-inställningar',
			description: 'Konfigurera notifieringar för check-in/out',
			icon: Bell,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Konfigurera alerts',
					items: [
						'Öppna ett projekt',
						'Scrolla ner till "Alert-inställningar"',
						'Klicka "Redigera" för att ändra',
						'Sätt arbetsdag start/slut (t.ex. 07:00-16:00)',
						'Aktivera/avaktivera olika alerts',
					],
				},
				{
					title: 'Alert-typer (Real-time)',
					items: [
						'✅ Notifiera vid check-in - Du får notis när arbetare checkar in',
						'✅ Notifiera vid check-out - Du får notis när arbetare checkar ut',
						'Notiserna innehåller: namn, projekt, tid och arbetad tid',
						'Klicka på notisen för att gå direkt till projektet',
					],
				},
				{
					title: 'Alert-typer (Kommande)',
					items: [
						'⏰ Check-in påminnelse - Påminner arbetare X min före start',
						'⏰ Check-out påminnelse - Påminner arbetare X min före slut',
						'⚠️ Sen check-in varning - Varnar dig om sen check-in',
						'⚠️ Glömt check-out varning - Varnar dig om glömt check-out',
					],
				},
			],
		},
		{
			title: 'Bjud in användare',
			description: 'Lägg till nya teammedlemmar',
			icon: Users,
			roles: ['admin'],
			sections: [
				{
					title: 'Skicka inbjudan',
					items: [
						'Gå till "Inställningar → Användare"',
						'Klicka "Bjud in användare"',
						'Fyll i namn, e-post och roll',
						'Ange timtaxa (valfritt)',
						'Användaren får ett e-postmeddelande',
					],
				},
				{
					title: 'Skicka om inbjudan',
					items: [
						'Hitta användare med "Väntar på registrering"-status',
						'Klicka "Skicka ny inbjudan"',
						'Ett nytt e-postmeddelande skickas',
						'Status uppdateras när användaren registrerar sig',
					],
				},
			],
		},
		{
			title: 'CSV Export',
			description: 'Exportera data för lön och fakturering',
			icon: FileText,
			roles: ['admin', 'foreman', 'finance'],
			sections: [
				{
					title: 'Löne-CSV',
					items: [
						'Godkänn alla tidrapporter först',
						'Välj period (vecka)',
						'Klicka "Löne-CSV"',
						'Granska CSV-fil',
						'Importera i lönesystem',
					],
				},
				{
					title: 'Faktura-CSV',
					items: [
						'Godkänn tid, material, ÄTA samt dagbok för perioden',
						'Gå till "Fakturaunderlag" (/dashboard/invoice-basis)',
						'Välj projekt och datumintervall, granska och uppdatera rader vid behov',
						'Lås underlaget (krävs för export)',
						'Klicka "Ladda ner CSV" – filen är redo för fakturering / Fortnox / Visma',
					],
				},
			],
		},
		{
			title: 'Löneunderlag',
			description: 'Beräkna, låsa och exportera löneunderlag per person och period',
			icon: DollarSign,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Snabbguide (3 steg)',
					items: [
						'Steg 1 – Beräkna: Välj period och klicka Beräkna. Systemet räknar fram löneunderlag per person.',
						'Steg 2 – Granska & lås: Kontrollera timmar och belopp. Lås poster som är klara, lås upp om något blev fel.',
						'Steg 3 – Exportera: PDF innehåller endast låsta poster. CSV/PAXml kan exportera Alla, Låsta eller Markerade poster. PAXml rekommenderas för Fortnox Lön.',
					],
				},
				{
					title: 'Steg 1: Tidsregistrering',
					items: [
						'Användare registrerar tid via dashboard-slider eller manuellt',
						'Tidsregistreringar skapas med status "Utkast" (draft)',
						'Varje registrering innehåller: användare, projekt, starttid, stopptid',
					],
				},
				{
					title: 'Steg 2: Godkänna tidsregistreringar',
					items: [
						'Gå till "Godkännanden"-sidan (/dashboard/approvals)',
						'Välj vecka att granska',
						'Filtrera på "Väntar" för att se ogodkända registreringar',
						'Markera de poster du vill godkänna',
						'Klicka "Godkänn"',
						'Status ändras till "Godkänd" (approved) - detta krävs för löneunderlag',
					],
				},
				{
					title: 'Steg 3: Konfigurera löneregler och faktisk lön',
					items: [
						'Gå till "Löneunderlag"-sidan',
						'Klicka på tab "Löneregler"',
						'Ange normal arbetstid per vecka (standard: 40h)',
						'Sätt övertidsmultiplikator (standard: 1.5)',
						'Konfigurera automatisk rast (efter hur många timmar och längd)',
						'Ange OB-rates för natt, helg och helgdag',
						'Klicka "Spara regler"',
						'Viktigt: Ange "Faktisk lön" (timlön) för varje anställd',
						'Faktisk lön används för att beräkna bruttolön i löneunderlag',
						'Faktureringsvärde är separat och redigeras i Användarinställningar',
					],
				},
				{
					title: 'Steg 4: Beräkna löneunderlag',
					items: [
						'Gå till tab "Löneunderlag"',
						'Välj period (start- och slutdatum)',
						'Klicka "Beräkna om"',
						'Systemet hämtar närvaroregistreringar eller godkända tidsregistreringar',
						'Om inga närvaroregistreringar finns, byggs de automatiskt från tidsregistreringar',
						'Data grupperas per person och vecka',
						'Beräknar normaltid, övertid, OB-timmar och rastar',
						'Resultat sparas och visas per person och vecka',
					],
				},
				{
					title: 'Steg 5: Granska resultat',
					items: [
						'Löneunderlag visas på sidan',
						'För varje person och period visas:',
						'  • Normaltid (t.ex. 40h)',
						'  • Övertid (t.ex. 5.5h)',
						'  • OB-timmar (natt/helg/helgdag)',
						'  • Rasttimmar',
						'  • Totalt antal timmar',
						'  • Bruttolön (beräknad från faktisk lön och timmar)',
						'Bruttolön beräknas automatiskt om faktisk lön är angiven',
						'Om bruttolön visas som "Ej angiven": kontrollera att faktisk lön är satt i "Löneregler"',
						'Kontrollera att beräkningarna stämmer',
					],
				},
				{
					title: 'Steg 6: Låsa löneunderlag (valfritt)',
					items: [
						'Granska beräknade löneunderlag',
						'Klicka "Lås" på de entries du vill låsa',
						'Låsta entries kan inte ändras tills de låses upp',
						'Använd för att säkerställa data är korrekt innan export',
						'Du kan alltid upplåsa om du behöver göra ändringar',
					],
				},
				{
					title: 'Steg 7: Exportera löneunderlag',
					items: [
						'Klicka "Exportera CSV" eller "Exportera PDF" i sidhuvudet',
						'CSV-export: Exporterar alla poster för vald period (låsta + olåsta) som detaljerade löneartsrader per datum/projekt',
						'Tillsammans med CSV skapas en PAXml-fil i mappen /exports som kan importeras direkt i Fortnox/Visma',
						'PDF-export: Exporterar endast låsta poster och hämtar alltid den faktiska låsta posten för vald person',
						'Lås därför de poster du tänker överlämna innan du tar ut PDF',
						'CSV-filen har UTF-8 + kommatecken och inkluderar löneartkod, antal, pris, belopp, projekt/kostnadsställe samt avvikelseflagga',
						'PDF-filen är ett formaterat A4-underlag med översikter, radlista och kontrollista och kan skickas till platschef/löneavdelning',
						'Öppna CSV-filen i Excel eller ladda upp CSV/PAXml till lönesystemet för import',
					],
				},
				{
					title: 'Hur beräkningen fungerar',
					items: [
						'Systemet grupperar timmar per person för hela valda perioden',
						'För varje person beräknas:',
						'  • Totala timmar = summa av alla sessioner för perioden',
						'  • OB-timmar = timmar under natt/helg/helgdag',
						'  • Rasttimmar = automatiskt 1 timme per projekt per dag om arbetstid > 5 timmar',
						'  • Nettotimmar = totala timmar - rasttimmar',
						'  • Normaltid = min(nettotimmar, normal threshold × antal veckor)',
						'  • Övertid = max(0, nettotimmar - normal threshold × antal veckor)',
						'Bruttolön beräknas enligt:',
						'  • (Normaltid × Faktisk lön)',
						'  • + (Övertid × Faktisk lön × Övertidsmultiplikator)',
						'  • + (OB-timmar × Faktisk lön × OB-tillägg)',
						'Resultat sparas per person per period i payroll_basis tabellen',
						'Faktisk lön hämtas från memberships.salary_per_hour_sek',
					],
				},
				{
					title: 'Felhantering',
					items: [
						'Om inga löneunderlag hittas:',
						'  • Kontrollera att tidsregistreringar är godkända',
						'  • Använd debug-knappen för att se vad som finns i databasen',
						'  • Kontrollera att perioden är korrekt',
						'Om "Failed to refresh payroll basis":',
						'  • Kontrollera konsolen för detaljerade felmeddelanden',
						'  • Kontrollera att du är Admin eller Foreman',
						'  • Kontrollera att löneregler är konfigurerade',
					],
				},
			],
		},
		{
			title: 'Personalliggare',
			description: 'QR-kod check-in/out system för projekt',
			icon: QrCode,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Aktivera personalliggare för projekt',
					items: [
						'Öppna ett projekt',
						'Gå till projektinställningar',
						'Aktivera "Personalliggare"',
						'Ett unikt QR-kod genereras automatiskt',
						'QR-koden kan skrivas ut och placeras på byggplatsen',
					],
				},
				{
					title: 'Check-in via QR-kod',
					items: [
						'Öppna EP Tracker-appen på din telefon',
						'Gå till "Personalliggare"-sidan',
						'Skanna QR-koden på byggplatsen',
						'Du checkas automatiskt in på projektet',
						'Check-in-tid registreras automatiskt',
					],
				},
				{
					title: 'Check-out via QR-kod',
					items: [
						'Skanna samma QR-kod igen när du är klar',
						'Du checkas automatiskt ut',
						'Check-out-tid registreras',
						'Total arbetad tid beräknas automatiskt',
					],
				},
				{
					title: 'Hantera worksite-koder',
					items: [
						'Varje projekt får en unik worksite-kod',
						'Koden kan återställas om den komprometteras',
						'QR-koden fungerar offline och synkroniseras senare',
						'Endast användare med åtkomst till projektet kan checka in',
					],
				},
			],
		},
		{
			title: 'ÄTA (Ändringsbeslut)',
			description: 'Skapa och hantera ändrings- och tilläggsarbeten',
			icon: FileEdit,
			roles: ['admin', 'foreman', 'worker', 'ue'],
			sections: [
				{
					title: 'Skapa ÄTA-förslag',
					items: [
						'Gå till "ÄTA"-sidan',
						'Klicka "Ny ÄTA"',
						'Fyll i titel, beskrivning och kategori',
						'Välj projekt och fas',
						'Ange uppskattad kostnad eller debiteringstyp',
						'Ladda upp foton (valfritt)',
						'Spara som utkast',
					],
				},
				{
					title: 'Debiteringstyper',
					items: [
						'Fast belopp - Ange ett fast belopp som ska faktureras',
						'Löpande - Ange enhet, antal och à-pris',
						'Projektets timtaxa används automatiskt om inget à-pris anges',
					],
				},
				{
					title: 'Skicka för godkännande',
					items: [
						'Öppna ÄTA-förslaget',
						'Klicka "Skicka för godkännande"',
						'Status ändras till "Väntar godkännande"',
						'Admin eller arbetsledare får notifikation',
					],
				},
				{
					title: 'Godkänna eller avvisa ÄTA',
					items: [
						'Gå till "Godkännanden"-sidan',
						'Välj flik "ÄTA"',
						'Granska ÄTA-förslaget',
						'Klicka "Godkänn" för att acceptera',
						'Eller klicka "Avvisa" och skriv kommentar',
						'Godkända ÄTA kan faktureras',
					],
				},
				{
					title: 'Statusvärden',
					items: [
						'Utkast - ÄTA är inte skickad än',
						'Väntar godkännande - Väntar på godkännande',
						'Godkänd - ÄTA är godkänd och kan faktureras',
						'Avvisad - ÄTA är avvisad och kan redigeras',
					],
				},
			],
		},
		{
			title: 'Checklista',
			description: 'Skapa och använda checklistor för projektspecifika kontroller',
			icon: CheckSquare,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Skapa ny checklista',
					items: [
						'Gå till "Checklista"-sidan',
						'Klicka "Ny checklista"',
						'Välj projekt',
						'Ange titel för checklistan',
						'Lägg till uppgifter manuellt eller använd en mall',
					],
				},
				{
					title: 'Använda mallar',
					items: [
						'Välj en mall från listan (t.ex. "Riskanalys", "Egenkontroll målning")',
						'Mallens uppgifter fylls i automatiskt',
						'Du kan lägga till eller ta bort uppgifter',
						'Anpassa checklistan efter projektets behov',
					],
				},
				{
					title: 'Markera uppgifter som klara',
					items: [
						'Öppna checklistan',
						'Klicka på checkboxen för varje genomförd uppgift',
						'Lägg till anteckningar vid behov',
						'Checklistan markeras som klar när alla uppgifter är avklarade',
					],
				},
				{
					title: 'Signera checklista',
					items: [
						'När alla uppgifter är klara kan du signera',
						'Skriv ditt namn',
						'Signaturen sparas med tidsstämpel',
						'Signerade checklistor kan inte redigeras',
					],
				},
				{
					title: 'Visa och hantera checklistor',
					items: [
						'Alla checklistor visas per projekt',
						'Filtrera på status (klar/ej klar)',
						'Öppna checklistor för att se detaljer',
						'Checklistor kan tas bort om de inte är signerade',
					],
				},
			],
		},
		{
			title: 'Fakturaunderlag',
			description: 'Granska, låsa och exportera faktureringsdata',
			icon: FileText,
			roles: ['admin', 'foreman', 'finance'],
			sections: [
				{
					title: 'Översikt',
					items: [
						'Fakturaunderlag samlar all fakturerbar data för en period',
						'Inkluderar: tid, material, utlägg, ÄTA och dagbok',
						'Data måste vara godkänd innan den kan faktureras',
					],
				},
				{
					title: 'Granska fakturaunderlag',
					items: [
						'Gå till "Fakturaunderlag"-sidan',
						'Välj projekt och datumintervall',
						'Granska alla rader som ska faktureras',
						'Kontrollera att belopp och beskrivningar stämmer',
						'Redigera rader vid behov',
					],
				},
				{
					title: 'Låsa underlag',
					items: [
						'Efter granskning, lås underlaget',
						'Låsta underlag kan inte ändras',
						'Låsning krävs för export',
						'Du kan låsa upp om du behöver göra ändringar',
					],
				},
				{
					title: 'Exportera CSV',
					items: [
						'När underlaget är låst, klicka "Ladda ner CSV"',
						'CSV-filen innehåller alla faktureringsrader',
						'Formatet är kompatibelt med Fortnox och Visma',
						'Filen kan importeras direkt i faktureringssystemet',
					],
				},
				{
					title: 'Tips',
					items: [
						'Granska alltid underlaget innan låsning',
						'Kontrollera att alla godkända poster är med',
						'Lås endast när du är säker på att allt stämmer',
						'Exportera direkt efter låsning för bästa översikt',
					],
				},
			],
		},
		{
			title: 'Kunder',
			description: 'Hantera kundinformation och koppla till projekt',
			icon: ContactRound,
			roles: ['admin', 'foreman', 'finance'],
			sections: [
				{
					title: 'Lägga till kund',
					items: [
						'Gå till "Inställningar → Kunder"',
						'Klicka "Ny kund"',
						'Fyll i kundnamn och kontaktinformation',
						'Välj kundtyp (företag, privatperson, etc.)',
						'Spara',
					],
				},
				{
					title: 'Redigera kundinformation',
					items: [
						'Öppna kunden från listan',
						'Klicka "Redigera"',
						'Uppdatera kontaktuppgifter, adress eller annan information',
						'Spara ändringar',
					],
				},
				{
					title: 'Koppla kund till projekt',
					items: [
						'När du skapar ett nytt projekt, välj kund',
						'Eller redigera befintligt projekt och välj kund',
						'Kunden visas på projektsidan',
						'Kundinformation används i fakturor',
					],
				},
				{
					title: 'Hantera kundtyper',
					items: [
						'Kundtyper hjälper till att organisera kunder',
						'Vanliga typer: Företag, Privatperson, Fastighetsägare',
						'Du kan skapa egna kundtyper',
						'Filtrera kunder efter typ',
					],
				},
			],
		},
		{
			title: 'Personal',
			description: 'Hantera anställda och personalinformation',
			icon: Users,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Lägga till anställd',
					items: [
						'Gå till "Inställningar → Personal"',
						'Klicka "Ny anställd"',
						'Fyll i namn, e-post och kontaktinformation',
						'Ange anställningsnummer om tillämpligt',
						'Spara',
					],
				},
				{
					title: 'Redigera personalinformation',
					items: [
						'Öppna anställd från listan',
						'Klicka "Redigera"',
						'Uppdatera kontaktuppgifter eller annan information',
						'Spara ändringar',
					],
				},
				{
					title: 'Hantera anställdstatus',
					items: [
						'Markera anställd som aktiv eller inaktiv',
						'Inaktiva anställda visas inte i dropdowns',
						'Historisk data bevaras',
						'Återaktivera när behövs',
					],
				},
				{
					title: 'Koppla till projekt',
					items: [
						'Anställda kan kopplas till projekt via teammedlemskap',
						'Gå till projektets "Team"-flik',
						'Lägg till anställd som teammedlem',
						'Anställda kan nu rapportera tid på projektet',
					],
				},
			],
		},
		{
			title: 'Underentreprenörer',
			description: 'Hantera underentreprenörer och deras projekt',
			icon: Building2,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Lägga till underentreprenör',
					items: [
						'Gå till "Inställningar → Underentreprenörer"',
						'Klicka "Ny underentreprenör"',
						'Fyll i företagsnamn och kontaktinformation',
						'Ange organisationsnummer',
						'Spara',
					],
				},
				{
					title: 'Hantera underentreprenörsinformation',
					items: [
						'Öppna underentreprenör från listan',
						'Redigera kontaktuppgifter, adress eller annan information',
						'Uppdatera organisationsnummer vid behov',
						'Spara ändringar',
					],
				},
				{
					title: 'Koppla till projekt',
					items: [
						'Underentreprenörer kan kopplas till projekt',
						'Används för att spåra externa leverantörer',
						'Koppling visas i projektöversikten',
						'Används i rapporter och export',
					],
				},
			],
		},
		{
			title: 'Inställningar',
			description: 'Navigera och konfigurera systeminställningar',
			icon: Settings,
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
			sections: [
				{
					title: 'Översikt',
					items: [
						'Inställningar-sidan är din centrala plats för att konfigurera systemet',
						'Här hittar du alla inställningar för din profil och organisation',
					],
				},
				{
					title: 'Profilinställningar',
					items: [
						'Gå till "Inställningar → Profil"',
						'Uppdatera ditt namn, e-post och telefonnummer',
						'Ladda upp profilbild',
						'Ändra lösenord',
						'Spara ändringar',
					],
				},
				{
					title: 'Notifikationsinställningar',
					items: [
						'Gå till "Inställningar → Notiser"',
						'Aktivera eller inaktivera push-notiser',
						'Välj vilka typer av notiser du vill ta emot',
						'Ställ in tysta timmar',
						'Spara inställningar',
					],
				},
				{
					title: 'Organisationsinställningar (Admin)',
					items: [
						'Endast admins kan ändra organisationsinställningar',
						'Gå till "Inställningar → Organisation"',
						'Uppdatera organisationsinformation, adress och bankuppgifter',
						'Konfigurera standardarbetstider och raster',
						'Se guiden "Organisationsinställningar" för mer detaljer',
					],
				},
				{
					title: 'Användarhantering (Admin)',
					items: [
						'Gå till "Inställningar → Användare"',
						'Bjud in nya användare',
						'Hantera användarroller',
						'Se guiden "Bjud in användare" för mer detaljer',
					],
				},
			],
		},
		{
			title: 'Översikt (Dashboard)',
			description: 'Förstå dashboard-widgets och snabbåtgärder',
			icon: LayoutDashboard,
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
			sections: [
				{
					title: 'Dashboard-widgets',
					items: [
						'Översiktssidan visar viktig information på en plats',
						'Statistik för den aktuella veckan',
						'Aktiva projekt och senaste aktiviteter',
						'Snabbåtgärder för vanliga uppgifter',
					],
				},
				{
					title: 'Statistik',
					items: [
						'Se totala arbetstimmar för veckan',
						'Antal aktiva projekt',
						'Pågående tidsregistreringar',
						'Väntande godkännanden',
					],
				},
				{
					title: 'Snabbåtgärder',
					items: [
						'Starta timer direkt från dashboard',
						'Skapa ny tidrapport',
						'Lägg till material eller utlägg',
						'Gå till vanliga sidor med ett klick',
					],
				},
				{
					title: 'Aktivitetsflöde',
					items: [
						'Se senaste aktiviteter i organisationen',
						'Filtrera efter typ (tid, material, ÄTA, etc.)',
						'Klicka på aktivitet för att se detaljer',
						'Håll koll på vad som händer i projekten',
					],
				},
				{
					title: 'Check-in/Check-out',
					items: [
						'Om du har en aktiv check-in, visas den på dashboard',
						'Klicka "Checka ut" för att avsluta arbetsdagen',
						'En bekräftelsedialog visar din arbetstid',
						'Justera tiden om behövs innan du sparar',
					],
				},
			],
		},
		{
			title: 'Offline-läge',
			description: 'Arbeta utan internetanslutning',
			icon: Info,
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
			sections: [
				{
					title: '',
					items: [
						'EP Tracker fungerar offline! Allt du gör sparas lokalt på din enhet. När du får internetanslutning igen synkroniseras automatiskt alla dina ändringar till servern. Du ser en synkroniseringsstatus längst upp i appen.',
					],
				},
			],
		},
	];

	// Filter guides based on user role
	const guides = allGuides.filter((guide) => guide.roles.includes(userRole));

	const allInteractiveGuides = [
		{
			id: 'dashboard',
			title: 'Översikt',
			description: 'Lär dig använda översiktssidan, snabbåtgärder och statistik',
			icon: Lightbulb,
			page: '/dashboard',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'projects',
			title: 'Projekt',
			description: 'Skapa projekt, hantera team och konfigurera alert-inställningar',
			icon: BookOpen,
			page: '/dashboard/projects',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'time',
			title: 'Tidsrapportering',
			description: 'Rapportera tid med timer eller manuellt',
			icon: Clock,
			page: '/dashboard/time',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'diary',
			title: 'Dagbok & Röstanteckningar',
			description: 'Skriv dagboksanteckningar eller diktera med röst-till-text',
			icon: Mic,
			page: '/dashboard/diary',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'materials',
			title: 'Material & Utlägg',
			description: 'Lägg till material, utlägg och miltal',
			icon: Package,
			page: '/dashboard/materials',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'planning-today',
			title: 'Dagens uppdrag',
			description: 'Checka in/ut och navigera till arbetsplatser',
			icon: CalendarCheck,
			page: '/dashboard/planning/today',
			roles: ['admin', 'foreman', 'worker', 'ue'],
		},
		{
			id: 'planning',
			title: 'Planering',
			description: 'Schemalägg uppdrag och tilldela personal',
			icon: Calendar,
			page: '/dashboard/planning',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'approvals',
			title: 'Godkännanden',
			description: 'Granska och godkänn tidrapporter, exportera till lön',
			icon: CheckSquare,
			page: '/dashboard/approvals',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'payroll',
			title: 'Löneunderlag',
			description: 'Beräkna, låsa och exportera löneunderlag per person och period',
			icon: DollarSign,
			page: '/dashboard/payroll',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'worksites',
			title: 'Personalliggare',
			description: 'QR-kod check-in/out system för projekt',
			icon: QrCode,
			page: '/dashboard/worksites',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'ata',
			title: 'ÄTA',
			description: 'Skapa och hantera ändrings- och tilläggsarbeten',
			icon: FileEdit,
			page: '/dashboard/ata',
			roles: ['admin', 'foreman', 'worker', 'ue'],
		},
		{
			id: 'checklists',
			title: 'Checklista',
			description: 'Skapa och använda checklistor för projektspecifika kontroller',
			icon: CheckSquare,
			page: '/dashboard/checklists',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'invoice-basis',
			title: 'Fakturaunderlag',
			description: 'Granska, låsa och exportera faktureringsdata',
			icon: FileText,
			page: '/dashboard/invoice-basis',
			roles: ['admin', 'foreman', 'finance'],
		},
		{
			id: 'customers',
			title: 'Kunder',
			description: 'Hantera kundinformation och koppla till projekt',
			icon: ContactRound,
			page: '/dashboard/customers',
			roles: ['admin', 'foreman', 'finance'],
		},
		{
			id: 'employees',
			title: 'Personal',
			description: 'Hantera anställda och personalinformation',
			icon: Users,
			page: '/dashboard/employees',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'subcontractors',
			title: 'Underentreprenörer',
			description: 'Hantera underentreprenörer och deras projekt',
			icon: Building2,
			page: '/dashboard/subcontractors',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'settings',
			title: 'Inställningar',
			description: 'Navigera och konfigurera systeminställningar',
			icon: Settings,
			page: '/dashboard/settings',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
	];

	// Filter interactive guides based on user role
	const interactiveGuides = allInteractiveGuides.filter((guide) => guide.roles.includes(userRole));

	const allFaqs = [
		{
			id: 'faq-1',
			question: 'Hur rättar jag en tidrapport?',
			answer:
				'Du kan redigera tidrapporter som har status "Utkast". Om en tidrapport redan är godkänd, kontakta din arbetsledare för att begära ändringar.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-2',
			question: 'Vad händer om jag glömmer stoppa timern?',
			answer:
				'Timern fortsätter räkna tills du stoppar den manuellt. När du checkar ut visas en bekräftelsedialog där du kan se och justera både check-in och check-out tid innan du sparar.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-2b',
			question: 'Hur redigerar jag tiden när jag checkar ut?',
			answer:
				'När du checkar ut från översiktssidan visas en dialog med din arbetstid. Klicka "Nej, editera" för att justera tiderna. Du kan använda +/- knapparna för att ändra timmar och minuter, eller skriva tiden direkt. Datumet kan inte ändras, endast tiden. Total arbetad tid uppdateras automatiskt. Perfekt för att rätta till om du glömde checka in/ut eller om tiden behöver justeras.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-3',
			question: 'Kan jag ta bort en tidrapport?',
			answer:
				'Ja, tidrapporter med status "Utkast" kan tas bort. Godkända tidrapporter kan inte tas bort av säkerhetsskäl.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-4',
			question: 'Hur fungerar offline-läge?',
			answer:
				'När du är offline sparas all data lokalt på din enhet. När du får internetanslutning igen synkroniseras automatiskt alla dina ändringar till servern. Du ser en synkroniseringsstatus längst upp i appen.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-8',
			question: 'Var hittar jag mina dagliga uppdrag?',
			answer:
				'Gå till "Planering → Idag" för att se alla dina uppdrag för dagen. Här kan du checka in/ut, navigera till arbetsplatser och se anteckningar för varje jobb.',
			roles: ['admin', 'foreman', 'worker', 'ue'],
		},
		{
			id: 'faq-10',
			question: 'Kan jag checka in utan internetanslutning?',
			answer:
				'Ja! Check-in/out fungerar offline. Händelserna sparas lokalt och synkroniseras automatiskt när du får internetanslutning igen. Du ser din status uppdateras direkt.',
			roles: ['admin', 'foreman', 'worker', 'ue'],
		},
		{
			id: 'faq-7',
			question: 'Hur flyttar jag ett uppdrag till ett annat datum?',
			answer:
				'Gå till Planering-sidan, dra uppdraget från ett datum och släpp det på det nya datumet. Ändringar sparas automatiskt. Du kan också dubbel-klicka på uppdraget för att redigera datum manuellt.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-9',
			question: 'Vad betyder färgerna på projekten?',
			answer:
				'Varje projekt har en unik färg som visas i kalendern och på uppdragskort. Detta gör det lätt att snabbt se vilka projekt som är schemalagda och filtrera vyn efter specifika projekt.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-5',
			question: 'Hur godkänner jag flera tidrapporter samtidigt?',
			answer:
				'Gå till "Godkännanden", markera checkboxarna på de tidrapporter du vill godkänna, och klicka sedan på "Godkänn"-knappen. Du kan också godkänna alla tidrapporter för en användare eller ett projekt på en gång.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-6',
			question: 'Var hittar jag tidigare exporter?',
			answer:
				'Klicka på "Historik"-knappen på godkännandesidan. Där ser du alla tidigare CSV-exporter med information om period, antal poster och vem som skapade exporten.',
			roles: ['admin', 'foreman', 'finance'],
		},
		{
			id: 'faq-11',
			question: 'Varför ser jag inte alla projekt?',
			answer:
				'Användare ser bara projekt de är tilldelade till. Om du är admin eller arbetsledare, gå till projektets "Team"-flik och lägg till dig själv som medlem. Workers behöver bli tillagda av en admin eller arbetsledare.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-12',
			question: 'Hur lägger jag till någon i ett projekt?',
			answer:
				'Öppna projektet, gå till "Team"-fliken och klicka "Hantera team". Välj användare från listan och klicka "Lägg till". Endast admins och arbetsledare kan hantera projektmedlemmar.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-13',
			question: 'Vad händer när jag tar bort en medlem från ett projekt?',
			answer:
				'Användaren förlorar omedelbart åtkomst till projektet och kan inte längre se eller rapportera på det. Befintlig data (tid, material) som användaren skapat förblir kvar i projektet.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-14',
			question: 'Hur vet jag att en inbjuden användare har registrerat sig?',
			answer:
				'Gå till "Inställningar → Användare". Användare som väntar på registrering har en gul badge "Väntar på registrering". När de registrerar sig ändras statusen till grön "Aktiv".',
			roles: ['admin'],
		},
		{
			id: 'faq-15',
			question: 'Kan jag skicka om en inbjudan?',
			answer:
				'Ja! Hitta användaren med "Väntar på registrering"-status i användarhanteringen och klicka "Skicka ny inbjudan". Ett nytt e-postmeddelande skickas till användaren.',
			roles: ['admin'],
		},
		{
			id: 'faq-16',
			question: 'Vad händer om jag drar ett uppdrag till någon som inte är medlem i projektet?',
			answer:
				'Systemet upptäcker automatiskt om personen inte är medlem och visar en dialogruta. Du kan välja att lägga till personen i projektet direkt, och uppdraget flyttas automatiskt efteråt. Detta sparar tid och förhindrar fel.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-17',
			question: 'Hur aktiverar jag push-notifieringar?',
			answer:
				'Gå till "Inställningar → Notiser" och klicka "Aktivera notiser". Din webbläsare kommer att fråga om tillåtelse - acceptera för att ta emot notifieringar. Du kan välja vilka typer av notiser du vill ha och ställa in tysta timmar.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-18',
			question: 'Vilka typer av notiser kan jag få?',
			answer:
				'Du kan få notiser om: godkännanden av tid, veckosammanfattningar, påminnelser om utcheckning, och projektspecifika alerts om check-in/out. Alla notiser kan aktiveras/avaktiveras individuellt i notis-inställningarna.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-19',
			question: 'Hur ställer jag in projekt alert-inställningar?',
			answer:
				'Öppna projektet, scrolla ner till "Alert-inställningar" och klicka "Redigera". Här kan du sätta arbetsdag start/slut-tid, aktivera notiser för check-in/out, och konfigurera påminnelser och varningar. Endast admin och arbetsledare kan redigera alert-inställningar.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-20',
			question: 'När får jag notis om check-in och check-out?',
			answer:
				'Om aktiverat i projektets alert-inställningar, får admin och arbetsledare en notis direkt när en arbetare checkar in eller ut på projektet. Notisen visar namn, projekt, tid och arbetad tid (vid check-out). Klicka på notisen för att gå direkt till projektet.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-21',
			question: 'Fungerar notiser när appen är stängd?',
			answer:
				'Ja! Push-notiser fungerar även när appen är stängd. Du får notiser som vanliga systemnotiser i Windows, Mac, iOS eller Android. Klicka på notisen för att öppna appen och gå direkt till relevant sida.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-22',
			question: 'Hur använder jag röstanteckningar?',
			answer:
				'Gå till Dagbok-sidan och klicka på mikrofon-ikonen. Prata in din arbetsrapport på valfritt språk. Systemet transkriberar automatiskt din röst till text och översätter till svenska om du pratade på annat språk. Perfekt för att snabbt rapportera från arbetsplatsen!',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-23',
			question: 'Vilka språk kan jag använda för röstanteckningar?',
			answer:
				'Du kan prata på nästan vilket språk som helst! Systemet detekterar automatiskt språket och stöder bl.a. Svenska, Engelska, Polska, Tyska, Spanska, Franska, Italienska och många fler. Om du pratar på annat språk än svenska översätts texten automatiskt till svenska.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-24',
			question: 'Hur exakt är rösttranskriptionen?',
			answer:
				'Vi använder OpenAI Whisper, som är en av de mest avancerade AI-modellerna för rösttranskription. Systemet är specialtränat för byggbranschen och känner igen vanliga byggtermer som betong, armering, gjutning, etc. För bästa resultat, tala tydligt och undvik mycket bakgrundsljud.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-25',
			question: 'Sparas mina röstinspelningar?',
			answer:
				'Röstinspelningarna laddas upp och transkriberas säkert. Efter transkription sparas både originalljudet och den transkriberade texten så du alltid kan gå tillbaka och lyssna på originalinspelningen om du behöver dubbelkolla något.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-26',
			question: 'Kan jag använda röstanteckningar offline?',
			answer:
				'Rösttranskription och översättning kräver internetanslutning eftersom den använder AI i molnet. Du kan dock spela in ljudet offline, och det kommer automatiskt att bearbetas när du får internetanslutning igen.',
			roles: ['admin', 'foreman', 'worker', 'finance', 'ue'],
		},
		{
			id: 'faq-27',
			question: 'Hur beräknas löneunderlag?',
			answer:
				'Löneunderlag beräknas automatiskt från närvaroregistreringar (attendance_session) eller godkända tidsregistreringar (time_entries med status="approved"). Processen: 1) Systemet hämtar alla närvaroregistreringar/tidsregistreringar för perioden, 2) Grupperar dem per person och vecka, 3) Beräknar totala timmar, OB-timmar (natt/helg/helgdag), rasttimmar, 4) Delar upp i normaltid (max 40h/vecka) och övertid, 5) Sparar resultat i payroll_basis tabellen. Du kan konfigurera regler under "Löneregler" på löneunderlag-sidan.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-28',
			question: 'Varför visas inga löneunderlag när jag klickar på "Beräkna om"?',
			answer:
				'Detta kan bero på flera saker: 1) Inga godkända tidsregistreringar för perioden - gå till "Godkännanden"-sidan och godkänn tidsregistreringar först, 2) Felaktig period - kontrollera att start- och slutdatum är korrekt, 3) Inga närvaroregistreringar och inga godkända tidsregistreringar - använd debug-knappen för att se vad som finns i databasen. Systemet försöker automatiskt bygga närvaroregistreringar från tidsregistreringar om inga finns.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-29',
			question: 'Behöver jag godkänna tidsregistreringar innan löneunderlag beräknas?',
			answer:
				'Ja! Löneunderlag-beräkningen använder endast tidsregistreringar med status "approved" (godkänd). Tidsregistreringar med status "draft" (utkast) eller "submitted" (väntar) räknas inte med. Gå till "Godkännanden"-sidan (/dashboard/approvals) och godkänn tidsregistreringar först innan du beräknar löneunderlag.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-30',
			question: 'Vad är skillnaden mellan närvaroregistreringar och tidsregistreringar?',
			answer:
				'Närvaroregistreringar (attendance_session) skapas från QR-scanning på worksites eller automatiskt från tidsregistreringar. Tidsregistreringar (time_entries) är manuella eller timer-baserade registreringar. Systemet försöker först använda närvaroregistreringar för löneunderlag, men om inga finns används godkända tidsregistreringar som fallback. Båda ger samma resultat när de beräknas till löneunderlag.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-31',
			question: 'Varför ska jag låsa löneunderlag?',
			answer:
				'Att låsa löneunderlag förhindrar att beräkningar ändras efter att du har granskat dem. Detta säkerställer att exporterade data matchar vad du har godkänt. PDF-exporten exporterar endast låsta poster, vilket säkerställer att du exporterar finaliserad data. CSV-exporten exporterar alla poster och kan användas för granskning. Du kan alltid upplåsa om du behöver göra ändringar.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-32',
			question: 'Vad händer om jag ändrar löneregler efter att ha låst löneunderlag?',
			answer:
				'Om du ändrar löneregler efter att löneunderlag är låst, påverkar ändringarna inte de låsta entries. Du måste först upplåsa entries, sedan klicka "Beräkna om" för att applicera nya regler. Efter ny beräkning kan du låsa igen.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-33',
			question: 'Hur ofta bör jag beräkna löneunderlag?',
			answer:
				'Vi rekommenderar att beräkna löneunderlag minst en gång per vecka, eller när du har gjort ändringar i närvaroregistreringar. Du kan också beräkna om när du har ändrat löneregler eller när du behöver uppdatera en specifik period.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-34',
			question: 'Kan jag exportera löneunderlag för en specifik person?',
			answer:
				'Ja, du kan filtrera löneunderlag-sidan efter person genom att använda periodväljaren och sedan exportera. CSV-exporten innehåller alla entries för den valda perioden (både låsta och olåsta), så du kan också filtrera i Excel efter person om du vill. PDF-exporten exporterar endast låsta poster, så se till att låsa de poster du vill exportera först.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-35',
			question: 'Hur beräknas bruttolön i löneunderlag?',
			answer:
				'Bruttolön beräknas automatiskt från faktisk lön (salary_per_hour_sek) och arbetade timmar. Formeln är: (Normaltid × Faktisk lön) + (Övertid × Faktisk lön × Övertidsmultiplikator) + (OB-timmar × Faktisk lön × OB-tillägg). För att bruttolön ska beräknas måste du först ange "Faktisk lön" för varje anställd under "Löneregler"-fliken. Om bruttolön visas som "Ej angiven" betyder det att faktisk lön inte är angiven för den personen.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-36',
			question: 'Vad är skillnaden mellan faktisk lön och faktureringsvärde?',
			answer:
				'Faktisk lön (salary_per_hour_sek) är den lön som den anställde faktiskt får och används för beräkning av bruttolön i löneunderlag. Faktureringsvärde (hourly_rate_sek) är det belopp som faktureras kunden och redigeras i Användarinställningar. Dessa två värden kan vara olika - faktureringsvärde inkluderar vanligtvis overhead, vinstmarginal etc.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-37',
			question: 'Varför visas bruttolön som "Ej angiven"?',
			answer:
				'Bruttolön visas som "Ej angiven" om: 1) Faktisk lön inte är angiven för personen - gå till "Löneregler"-fliken och ange faktisk lön, 2) Löneunderlag inte har omberäknats efter att faktisk lön angavs - klicka "Beräkna om" för att uppdatera, 3) Det inte finns några timmar att beräkna från. Om du precis har lagt till faktisk lön måste du klicka "Beräkna om" för att beräkna bruttolön för befintliga poster.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-38',
			question: 'Vad är OB-timmar?',
			answer:
				'OB (Overtid/Belöningspengar) är extra ersättning för arbete under särskilda tider: natt (22:00-06:00), helg (lördag/söndag) och helgdagar. Varje OB-timme multipliceras med en konfigurerad rate (standard: natt 1.2x, helg 1.5x, helgdag 2.0x). Dessa timmar räknas separat från övertidstimmar.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-39',
			question: 'Hur fungerar automatiska rastar?',
			answer:
				'Systemet beräknar automatiskt rasttimmar baserat på arbetstid per projekt per dag. Om arbetstiden är mer än 5 timmar i ett projekt under en dag, dras automatiskt 1 timme av för rast. Denna rast dras av från totala arbetstimmar innan normaltid och övertid beräknas.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-40',
			question: 'Hur fungerar personalliggare med QR-koder?',
			answer:
				'Personalliggare använder QR-koder för snabb check-in och check-out på byggplatser. Varje projekt kan ha en unik QR-kod som genereras automatiskt när personalliggare aktiveras. Arbetare skannar QR-koden med sin telefon för att checka in/ut automatiskt. Systemet fungerar även offline och synkroniseras när internetanslutning finns.',
			roles: ['admin', 'foreman', 'worker', 'ue'],
		},
		{
			id: 'faq-41',
			question: 'Kan jag återställa en QR-kod om den komprometteras?',
			answer:
				'Ja, du kan återställa worksite-koden för ett projekt om den komprometteras. Gå till projektinställningar och återställ koden. En ny QR-kod genereras automatiskt. Den gamla koden fungerar inte längre.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-42',
			question: 'Hur skapar jag ett ÄTA-förslag?',
			answer:
				'Gå till "ÄTA"-sidan och klicka "Ny ÄTA". Fyll i titel, beskrivning, kategori och välj projekt. Välj debiteringstyp (fast belopp eller löpande) och ange kostnader. Du kan ladda upp foton för att dokumentera arbetet. Spara som utkast och skicka för godkännande när du är klar.',
			roles: ['admin', 'foreman', 'worker', 'ue'],
		},
		{
			id: 'faq-43',
			question: 'Vad är skillnaden mellan fast belopp och löpande debitering för ÄTA?',
			answer:
				'Fast belopp innebär att du anger ett fast belopp som ska faktureras direkt. Löpande debitering innebär att du anger enhet (t.ex. timmar, m²), antal och à-pris. Om inget à-pris anges används projektets timtaxa automatiskt. Välj den typ som passar bäst för ändringsarbetet.',
			roles: ['admin', 'foreman', 'worker', 'ue'],
		},
		{
			id: 'faq-44',
			question: 'Hur använder jag checklistmallar?',
			answer:
				'När du skapar en ny checklista kan du välja en mall från listan (t.ex. "Riskanalys", "Egenkontroll målning"). Mallens uppgifter fylls i automatiskt, men du kan anpassa dem efter projektets behov. Du kan lägga till eller ta bort uppgifter, och lägga till anteckningar vid behov.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-45',
			question: 'Kan jag redigera en signerad checklista?',
			answer:
				'Nej, signerade checklistor kan inte redigeras. Detta säkerställer att signerade dokument förblir oförändrade. Om du behöver göra ändringar, skapa en ny checklista istället.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-46',
			question: 'Varför måste jag låsa fakturaunderlag innan export?',
			answer:
				'Låsning säkerställer att faktureringsdata inte ändras efter granskning. Detta ger dig kontroll över vad som faktureras och förhindrar oavsiktliga ändringar. Låsta underlag kan inte ändras, men du kan låsa upp om du behöver göra ändringar innan fakturering.',
			roles: ['admin', 'foreman', 'finance'],
		},
		{
			id: 'faq-47',
			question: 'Vad ingår i fakturaunderlag?',
			answer:
				'Fakturaunderlag inkluderar all fakturerbar data för en period: godkända tidrapporter, material, utlägg, ÄTA och dagbok. All data måste vara godkänd innan den kan inkluderas i fakturaunderlag. Du kan granska och redigera rader innan låsning och export.',
			roles: ['admin', 'foreman', 'finance'],
		},
		{
			id: 'faq-48',
			question: 'Hur kopplar jag en kund till ett projekt?',
			answer:
				'När du skapar ett nytt projekt kan du välja kund från dropdown-menyn. För befintliga projekt, öppna projektet och redigera kundinformation. Kunden visas på projektsidan och kundinformation används automatiskt i fakturor som genereras för projektet.',
			roles: ['admin', 'foreman', 'finance'],
		},
		{
			id: 'faq-49',
			question: 'Vad är skillnaden mellan personal och användare?',
			answer:
				'Personal är en lista över anställda med kontaktinformation och anställningsnummer. Användare är personer som har inloggning i systemet och kan rapportera tid, material etc. En anställd kan vara personal utan att vara användare, men användare är vanligtvis också personal.',
			roles: ['admin', 'foreman'],
		},
		{
			id: 'faq-50',
			question: 'Hur använder jag underentreprenörer i systemet?',
			answer:
				'Underentreprenörer är externa leverantörer som kan kopplas till projekt. De används för att spåra externa leverantörer och visas i projektöversikten. Underentreprenörsinformation används i rapporter och export för att identifiera externa kostnader.',
			roles: ['admin', 'foreman'],
		},
	];

	// Filter FAQs based on user role
	const faqs = allFaqs.filter((faq) => faq.roles.includes(userRole));

	// PERFORMANCE OPTIMIZATION (Story 26.3): Use router for instant navigation
	const handleStartGuide = (guideId: string) => {
		// Remove completed flag
		localStorage.removeItem(`tour-${guideId}-completed`);
		// Find guide and navigate with tour parameter
		const guide = interactiveGuides.find((g) => g.id === guideId);
		if (guide) {
			router.push(`${guide.page}?tour=${guideId}`);
		}
	};

	const handleResetAll = () => {
		toast.success('Alla guider och checklistor har återställts');
	};

	return (
		<div className='flex-1 overflow-auto pb-20 md:pb-0'>
			{/* Header */}
			<header className='sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border'>
				<div className='px-4 md:px-8 py-4 md:py-6'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight mb-1'>Hjälp & Support</h1>
						<p className='text-sm text-muted-foreground'>Guider och svar på vanliga frågor</p>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className='px-4 md:px-8 py-6 max-w-7xl'>
				{/* Tabs */}
				<Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
					<TabsList className='grid w-full md:w-auto md:inline-grid grid-cols-2 md:grid-cols-4 gap-1 h-auto p-1'>
						<TabsTrigger value='guides' className='gap-2 h-10'>
							<BookOpen className='w-4 h-4' />
							<span>Guider</span>
						</TabsTrigger>
						<TabsTrigger value='interactive' className='gap-2 h-10'>
							<Lightbulb className='w-4 h-4' />
							<span className='hidden sm:inline'>Interaktiva</span>
							<span className='sm:hidden'>Inter.</span>
						</TabsTrigger>
						<TabsTrigger value='faq' className='gap-2 h-10'>
							<HelpCircle className='w-4 h-4' />
							<span>FAQ</span>
						</TabsTrigger>
						<TabsTrigger value='videos' className='gap-2 h-10'>
							<Video className='w-4 h-4' />
							<span>Videos</span>
						</TabsTrigger>
					</TabsList>

					{/* Guides Tab */}
					<TabsContent value='guides' className='space-y-4 mt-6'>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							{guides.map((guide, index) => {
								const IconComponent = guide.icon;
								return (
									<div
										key={index}
										className='bg-card border-2 border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-200'
									>
										<div className='flex items-start gap-3 mb-4'>
											<div className='p-2 rounded-lg bg-accent shrink-0'>
												<IconComponent className='w-5 h-5 text-primary' />
											</div>
											<div className='flex-1 min-w-0'>
												<h3 className='text-lg font-semibold mb-1'>{guide.title}</h3>
												<p className='text-sm text-muted-foreground'>{guide.description}</p>
											</div>
										</div>

										<div className='space-y-4'>
											{guide.sections.map((section, sIndex) => (
												<div key={sIndex}>
													{section.title && <h4 className='text-sm font-semibold mb-2'>{section.title}:</h4>}
													<ol className='space-y-1.5 list-decimal list-inside text-sm text-muted-foreground'>
														{section.items.map((item, iIndex) => (
															<li key={iIndex} className='pl-1'>
																{item}
															</li>
														))}
													</ol>
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>
					</TabsContent>

					{/* Interactive Guides Tab */}
					<TabsContent value='interactive' className='space-y-6 mt-6'>
						<div className='bg-card border-2 border-border rounded-xl p-6'>
							<h3 className='text-lg font-semibold mb-2'>Interaktiva guider</h3>
							<p className='text-sm text-muted-foreground mb-6'>Starta om guiderna för att lära dig funktionerna igen</p>

							<div className='space-y-3'>
								{interactiveGuides.map((guide) => {
									const IconComponent = guide.icon;
									return (
										<div
											key={guide.id}
											className='bg-accent/30 border-2 border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all duration-200'
										>
											<div className='p-2 rounded-lg bg-accent shrink-0'>
												<IconComponent className='w-5 h-5 text-primary' />
											</div>

											<div className='flex-1 min-w-0'>
												<h4 className='font-semibold mb-1'>{guide.title}</h4>
												<p className='text-sm text-muted-foreground'>{guide.description}</p>
											</div>

											<Button
												variant='outline'
												size='sm'
												onClick={() => handleStartGuide(guide.id)}
												className='shrink-0 gap-2 hover:bg-primary hover:text-primary-foreground transition-colors'
											>
												<PlayCircle className='w-4 h-4' />
												Starta
											</Button>
										</div>
									);
								})}
							</div>
						</div>

						{/* Reset Section */}
						<div className='bg-accent/50 border-2 border-primary/20 rounded-xl p-6'>
							<h4 className='font-semibold mb-2'>Starta om från början</h4>
							<p className='text-sm text-muted-foreground mb-4'>
								Återställ alla guider och checklistor. Du kommer att se välkomstskärmen igen.
							</p>
							<Button variant='outline' onClick={handleResetAll} className='gap-2'>
								<RotateCcw className='w-4 h-4' />
								Återställ allt
							</Button>
						</div>
					</TabsContent>

					{/* FAQ Tab */}
					<TabsContent value='faq' className='space-y-3 mt-6'>
						{faqs.map((faq) => {
							const isOpen = openFaqs.includes(faq.id);

							return (
								<Collapsible key={faq.id} open={isOpen} onOpenChange={() => toggleFaq(faq.id)}>
									<div className='bg-card border-2 border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-200'>
										<CollapsibleTrigger className='w-full p-5 flex items-center justify-between gap-3 text-left hover:bg-accent/50 transition-colors'>
											<h4 className='font-semibold'>{faq.question}</h4>
											<ChevronDown
												className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
													isOpen ? 'rotate-180' : ''
												}`}
											/>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<div className='px-5 pb-5 pt-2 border-t border-border'>
												<p className='text-sm text-muted-foreground leading-relaxed'>{faq.answer}</p>
											</div>
										</CollapsibleContent>
									</div>
								</Collapsible>
							);
						})}
					</TabsContent>

					{/* Videos Tab */}
					<TabsContent value='videos' className='space-y-4 mt-6'>
						<div className='bg-card border-2 border-border rounded-xl p-12 text-center'>
							<div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6'>
								<Video className='w-10 h-10 text-muted-foreground' />
							</div>
							<h3 className='text-xl font-semibold mb-3'>Videotutorials kommer snart</h3>
							<p className='text-sm text-muted-foreground max-w-md mx-auto'>
								Vi arbetar på att skapa videoguider som visar hur du använder systemet. Håll utkik!
							</p>
						</div>
					</TabsContent>
				</Tabs>
			</main>
		</div>
	);
}

