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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import toast from 'react-hot-toast';

interface HelpPageNewProps {
	userRole: 'admin' | 'foreman' | 'worker' | 'finance';
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
			title: 'Tidsrapportering',
			description: 'Lär dig att registrera arbetstid',
			icon: Clock,
			roles: ['admin', 'foreman', 'worker', 'finance'],
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
			title: 'Material & Utlägg',
			description: 'Registrera material och kostnader',
			icon: Package,
			roles: ['admin', 'foreman', 'worker', 'finance'],
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
			roles: ['admin', 'foreman', 'worker'],
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
			description: 'Granska och godkänn tidrapporter',
			icon: CheckSquare,
			roles: ['admin', 'foreman'],
			sections: [
				{
					title: 'Godkänna tidrapporter',
					items: [
						'Gå till "Godkännanden"',
						'Välj vecka att granska',
						'Granska tidrapporter i tabellen',
						'Markera de du vill godkänna',
						'Klicka "Godkänn"',
					],
				},
				{
					title: 'Hantera avslag',
					items: [
						'Klicka meddelande-ikonen på tidrapport',
						'Skriv vad som behöver ändras',
						'Skicka feedback',
						'Användaren ser din kommentar',
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
					items: ['Godkänn tid, material, ÄTA', 'Välj period', 'Klicka "Faktura-CSV"', 'Granska CSV-fil', 'Använd för fakturering'],
				},
			],
		},
		{
			title: 'Offline-läge',
			description: 'Arbeta utan internetanslutning',
			icon: Info,
			roles: ['admin', 'foreman', 'worker', 'finance'],
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
			roles: ['admin', 'foreman', 'worker', 'finance'],
		},
		{
			id: 'projects',
			title: 'Projekt',
			description: 'Skapa projekt, hantera team och konfigurera alert-inställningar',
			icon: BookOpen,
			page: '/dashboard/projects',
			roles: ['admin', 'foreman', 'worker', 'finance'],
		},
		{
			id: 'time',
			title: 'Tidsrapportering',
			description: 'Rapportera tid med timer eller manuellt',
			icon: Clock,
			page: '/dashboard/time',
			roles: ['admin', 'foreman', 'worker', 'finance'],
		},
		{
			id: 'materials',
			title: 'Material & Utlägg',
			description: 'Lägg till material, utlägg och miltal',
			icon: Package,
			page: '/dashboard/materials',
			roles: ['admin', 'foreman', 'worker', 'finance'],
		},
		{
			id: 'planning-today',
			title: 'Dagens uppdrag',
			description: 'Checka in/ut och navigera till arbetsplatser',
			icon: CalendarCheck,
			page: '/dashboard/planning/today',
			roles: ['admin', 'foreman', 'worker'],
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
	];

	// Filter interactive guides based on user role
	const interactiveGuides = allInteractiveGuides.filter((guide) => guide.roles.includes(userRole));

	const allFaqs = [
		{
			id: 'faq-1',
			question: 'Hur rättar jag en tidrapport?',
			answer:
				'Du kan redigera tidrapporter som har status "Utkast". Om en tidrapport redan är godkänd, kontakta din arbetsledare för att begära ändringar.',
			roles: ['admin', 'foreman', 'worker', 'finance'],
		},
		{
			id: 'faq-2',
			question: 'Vad händer om jag glömmer stoppa timern?',
			answer:
				'Timern fortsätter räkna tills du stoppar den manuellt. Du kan redigera start- och stopptid efter att du behöver korrigera tiden.',
			roles: ['admin', 'foreman', 'worker', 'finance'],
		},
		{
			id: 'faq-3',
			question: 'Kan jag ta bort en tidrapport?',
			answer:
				'Ja, tidrapporter med status "Utkast" kan tas bort. Godkända tidrapporter kan inte tas bort av säkerhetsskäl.',
			roles: ['admin', 'foreman', 'worker', 'finance'],
		},
		{
			id: 'faq-4',
			question: 'Hur fungerar offline-läge?',
			answer:
				'När du är offline sparas all data lokalt på din enhet. När du får internetanslutning igen synkroniseras automatiskt alla dina ändringar till servern. Du ser en synkroniseringsstatus längst upp i appen.',
			roles: ['admin', 'foreman', 'worker', 'finance'],
		},
		{
			id: 'faq-8',
			question: 'Var hittar jag mina dagliga uppdrag?',
			answer:
				'Gå till "Planering → Idag" för att se alla dina uppdrag för dagen. Här kan du checka in/ut, navigera till arbetsplatser och se anteckningar för varje jobb.',
			roles: ['admin', 'foreman', 'worker'],
		},
		{
			id: 'faq-10',
			question: 'Kan jag checka in utan internetanslutning?',
			answer:
				'Ja! Check-in/out fungerar offline. Händelserna sparas lokalt och synkroniseras automatiskt när du får internetanslutning igen. Du ser din status uppdateras direkt.',
			roles: ['admin', 'foreman', 'worker'],
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
			roles: ['admin', 'foreman', 'worker', 'finance'],
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
			roles: ['admin', 'foreman', 'worker', 'finance'],
		},
		{
			id: 'faq-18',
			question: 'Vilka typer av notiser kan jag få?',
			answer:
				'Du kan få notiser om: godkännanden av tid, veckosammanfattningar, påminnelser om utcheckning, och projektspecifika alerts om check-in/out. Alla notiser kan aktiveras/avaktiveras individuellt i notis-inställningarna.',
			roles: ['admin', 'foreman', 'worker', 'finance'],
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
			roles: ['admin', 'foreman', 'worker', 'finance'],
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

