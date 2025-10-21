/**
 * Feature tour step definitions for different pages
 */

export const dashboardTourSteps = [
	{
		id: 'welcome',
		title: 'Välkommen till översikten!',
		description:
			'Här ser du en snabb sammanfattning av dina projekt, tidrapporter och material. Det är din startpunkt varje dag.',
		target: '[data-tour="dashboard-header"]',
		position: 'bottom' as const,
	},
	{
		id: 'quick-actions',
		title: 'Snabbåtgärder',
		description:
			'Använd dessa knappar för att snabbt komma åt de vanligaste funktionerna utan att navigera i menyn.',
		target: '[data-tour="quick-actions"]',
		position: 'bottom' as const,
	},
	{
		id: 'timer-widget',
		title: 'Timer-widget',
		description:
			'Timern är alltid synlig i nedre högra hörnet. Klicka för att starta tidrapportering - den fortsätter räkna även när du navigerar mellan sidor!',
		target: '[data-tour="timer-widget"]',
		position: 'top' as const,
	},
	{
		id: 'stats',
		title: 'Dina statistik',
		description:
			'Se snabbt hur många projekt du har, hur många tidrapporter du loggat denna vecka, och ditt material.',
		target: '[data-tour="stats"]',
		position: 'top' as const,
	},
];

export const projectsTourSteps = [
	{
		id: 'projects-list',
		title: 'Dina projekt',
		description:
			'Här ser du alla dina projekt. Klicka på ett projekt för att se detaljer, eller skapa ett nytt projekt.',
		target: '[data-tour="projects-list"]',
		position: 'bottom' as const,
	},
	{
		id: 'create-project',
		title: 'Skapa nytt projekt',
		description:
			'Klicka här för att skapa ditt första projekt. Du behöver projektnamn, kund och adress.',
		target: '[data-tour="create-project"]',
		position: 'bottom' as const,
	},
];

export const timeTourSteps = [
	{
		id: 'time-entries',
		title: 'Dina tidrapporter',
		description:
			'Här ser du alla dina tidrapporter. Du kan redigera eller ta bort gamla rapporter, eller lägga till nya.',
		target: '[data-tour="time-entries"]',
		position: 'bottom' as const,
	},
	{
		id: 'add-time',
		title: 'Lägg till tid',
		description:
			'Klicka här för att rapportera tid manuellt. Du kan välja start- och sluttid, eller använda timern i nedre högra hörnet.',
		target: '[data-tour="add-time"]',
		position: 'bottom' as const,
	},
	{
		id: 'timer',
		title: 'Eller använd timern',
		description:
			'Klicka på timer-widgeten, välj projekt och tryck "Starta tid". Perfekt för kontinuerligt arbete!',
		target: '[data-tour="timer-widget"]',
		position: 'top' as const,
	},
];

export const materialsTourSteps = [
	{
		id: 'materials-tabs',
		title: 'Material, Utlägg & Miltal',
		description:
			'Här kan du registrera material, utlägg (med kvitton) och miltal. Allt organiserat i flikar.',
		target: '[data-tour="materials-tabs"]',
		position: 'bottom' as const,
	},
	{
		id: 'add-material',
		title: 'Lägg till material',
		description:
			'Klicka här för att lägga till nytt material. Du kan även ta foto av kvitton direkt i appen!',
		target: '[data-tour="add-material"]',
		position: 'bottom' as const,
	},
];

export const approvalsTourSteps = [
	{
		id: 'approvals-week',
		title: 'Välj vecka',
		description:
			'Välj vilken vecka du vill granska. Alla tidrapporter och material för den veckan visas nedan.',
		target: '[data-tour="week-selector"]',
		position: 'bottom' as const,
	},
	{
		id: 'approvals-tabs',
		title: 'Granska tidrapporter eller material',
		description:
			'Använd flikarna för att växla mellan tidrapporter och material. Båda måste godkännas separat.',
		target: '[data-tour="approvals-tabs"]',
		position: 'bottom' as const,
	},
	{
		id: 'export',
		title: 'Exportera till lön',
		description:
			'Efter godkännande kan du exportera data till CSV för lönesystem, eller ladda ner alla bilagor som ZIP.',
		target: '[data-tour="export-buttons"]',
		position: 'bottom' as const,
	},
];

