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
		id: 'access-control',
		title: 'Projektåtkomst',
		description:
			'Du ser bara data från projekt där du är tillagd som medlem. Din chef eller admin kan lägga till dig i projekt via projektets "Team"-flik.',
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
		title: 'Dina tilldelade projekt',
		description:
			'Här ser du alla projekt du har åtkomst till. Du ser bara de projekt där du är tillagd som medlem. Klicka på ett projekt för att se detaljer.',
		target: '[data-tour="projects-list"]',
		position: 'bottom' as const,
	},
	{
		id: 'create-project',
		title: 'Skapa nytt projekt',
		description:
			'Klicka här för att skapa ditt första projekt. Du behöver projektnamn, kund och adress. När du skapar ett projekt blir du automatiskt medlem.',
		target: '[data-tour="create-project"]',
		position: 'bottom' as const,
	},
	{
		id: 'project-access',
		title: 'Projektåtkomst',
		description:
			'Kom ihåg att lägga till teammedlemmar i projektet via "Team"-fliken efter att du skapat det. Endast medlemmar kan se och rapportera på projektet.',
		target: '[data-tour="projects-list"]',
		position: 'bottom' as const,
	},
];

export const timeTourSteps = [
	{
		id: 'time-form',
		title: 'Lägg till tid',
		description:
			'Fyll i formuläret för att rapportera tid. Välj projekt, datum, start- och sluttid. Du kan också använda slidern på översiktssidan för att checka in/ut.',
		target: '[data-tour="time-form"]',
		position: 'bottom' as const,
	},
	{
		id: 'time-entries',
		title: 'Dina tidrapporter',
		description:
			'Här ser du alla dina tidrapporter. Du kan klicka på "Ändra" för att redigera en rapport.',
		target: '[data-tour="time-entries"]',
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

