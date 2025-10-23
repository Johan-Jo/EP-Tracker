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
		id: 'time-slider',
		title: 'Checka in/ut med slidern',
		description:
			'Dra slidern för att snabbt checka in eller ut från ett projekt. Den fortsätter räkna tid även när du navigerar mellan sidor!',
		target: '[data-tour="time-slider"]',
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

export const planningTourSteps = [
	{
		id: 'planning-welcome',
		title: 'Välkommen till planeringen!',
		description:
			'Här kan du schemalägga uppdrag för hela veckan. Dra och släpp uppdrag mellan datum, eller klicka på ett datum för att skapa nytt uppdrag.',
		target: 'body',
		position: 'center' as const,
	},
	{
		id: 'planning-week',
		title: 'Veckonavigering',
		description:
			'Byt vecka med pilknapparna. Kalendern visar måndag till söndag med alla resurser och deras uppdrag.',
		target: '[data-tour="week-navigation"]',
		position: 'bottom' as const,
	},
	{
		id: 'planning-projects',
		title: 'Filtrera på projekt',
		description:
			'Klicka på projekt-chips för att visa endast uppdrag från specifika projekt. Färgerna matchar uppdragens färger i kalendern.',
		target: '[data-tour="project-chips"]',
		position: 'bottom' as const,
	},
	{
		id: 'planning-grid',
		title: 'Schemalägg uppdrag',
		description:
			'Dra ett uppdrag till ett nytt datum för att flytta det. Dubbel-klicka på ett uppdrag för att redigera detaljer.',
		target: '[data-tour="schedule-grid"]',
		position: 'top' as const,
	},
];

export const planningTodayTourSteps = [
	{
		id: 'today-welcome',
		title: 'Dagens uppdrag',
		description:
			'Här ser du alla dina uppdrag för idag. Checka in när du börjar arbetet och checka ut när du är klar.',
		target: 'body',
		position: 'center' as const,
	},
	{
		id: 'today-checkin',
		title: 'Checka in/ut',
		description:
			'Klicka "Checka in" när du börjar arbeta på ett uppdrag. Status uppdateras direkt och synkas även om du är offline.',
		target: '[data-tour="job-cards"]',
		position: 'top' as const,
	},
	{
		id: 'today-navigate',
		title: 'Navigera till arbetsplatsen',
		description:
			'Klicka "Navigera" för att öppna Google Maps med adressen. Perfekt för att hitta till nya arbetsplatser!',
		target: '[data-tour="job-cards"]',
		position: 'top' as const,
	},
];

