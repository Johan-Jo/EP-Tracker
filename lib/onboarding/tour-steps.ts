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
			'Här kan du schemalägga uppdrag och arbetsorder för hela veckan. Dra och släpp mellan datum, eller klicka på ett datum för att skapa nytt uppdrag eller arbetsorder.',
		target: 'body',
		position: 'center' as const,
	},
	{
		id: 'planning-week',
		title: 'Veckonavigering',
		description:
			'Byt vecka med pilknapparna. Kalendern visar måndag till söndag med alla resurser och deras uppdrag och arbetsorder.',
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
		title: 'Schemalägg uppdrag och arbetsorder',
		description:
			'Dra ett uppdrag eller arbetsorder till ett nytt datum för att flytta det. Dra mellan personer för att ändra tilldelning. Klicka på en arbetsorder för att öppna detaljsidan.',
		target: '[data-tour="schedule-grid"]',
		position: 'top' as const,
	},
	{
		id: 'planning-create-work-order',
		title: 'Skapa arbetsorder från kalendern',
		description:
			'Klicka på "Skapa arbetsorder" för att skapa en ny arbetsorder direkt från kalendern. Den visas automatiskt i kalendern för tilldelade personer.',
		target: '[data-tour="create-work-order"]',
		position: 'bottom' as const,
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

export const workOrdersTodayTourSteps = [
	{
		id: 'work-orders-today-welcome',
		title: 'Mina arbetsorder idag',
		description:
			'Här ser du alla arbetsorder som är tilldelade till dig för idag. Använd "Starta arbete" när du börjar och "Avsluta arbete" när du är klar.',
		target: 'body',
		position: 'center' as const,
	},
	{
		id: 'work-orders-today-start',
		title: 'Starta arbete',
		description:
			'Klicka "Starta arbete" när du börjar jobbet. Detta sätter faktisk starttid och uppdaterar status till "Pågår".',
		target: '[data-tour="work-order-cards"]',
		position: 'top' as const,
	},
	{
		id: 'work-orders-today-navigate',
		title: 'Navigera till arbetsplatsen',
		description:
			'Klicka "Navigera" för att öppna Google Maps med arbetsplatsens adress eller koordinater. Perfekt för att hitta till nya platser!',
		target: '[data-tour="work-order-cards"]',
		position: 'top' as const,
	},
];

export const notificationsTourSteps = [
	{
		id: 'notifications-welcome',
		title: 'Push-notiser',
		description:
			'Aktivera pushnotiser för att få realtidsuppdateringar om check-ins, godkännanden och mer. Fungerar på både iOS och Android!',
		target: 'body',
		position: 'center' as const,
	},
	{
		id: 'enable-notifications',
		title: 'Aktivera notiser',
		description:
			'Klicka för att aktivera pushnotiser. Du kommer bli ombedd att ge behörighet i webbläsaren.',
		target: '[data-tour="enable-notifications"]',
		position: 'bottom' as const,
	},
	{
		id: 'notification-types',
		title: 'Anpassa notis-typer',
		description:
			'Välj vilka typer av notiser du vill ta emot. Du kan aktivera eller inaktivera varje typ individuellt.',
		target: '[data-tour="notification-types"]',
		position: 'top' as const,
	},
	{
		id: 'quiet-hours',
		title: 'Tyst läge',
		description:
			'Ställ in tider när du inte vill bli störd av notiser, t.ex. nattetid (22:00-07:00).',
		target: '[data-tour="quiet-hours"]',
		position: 'top' as const,
	},
	{
		id: 'test-notification',
		title: 'Testa notiser',
		description:
			'Skicka en testnotis för att verifiera att allt fungerar. Du kan också se historik över alla notiser du fått.',
		target: '[data-tour="test-notification"]',
		position: 'top' as const,
	},
];

export const workOrdersTourSteps = [
	{
		id: 'work-orders-header',
		title: 'Arbetsorder – din jobböversikt',
		description:
			'Här ser du alla arbetsorder i organisationen. Använd filtren för att snabbt hitta rätt jobb per projekt, kund, status eller person.',
		target: '[data-tour="work-orders-header"]',
		position: 'bottom' as const,
	},
	{
		id: 'work-orders-create',
		title: 'Skapa ny arbetsorder',
		description:
			'Klicka här för att skapa en ny arbetsorder. Du väljer kund och projekt, fyller i beskrivning, tid och plats samt tilldelar vem som ska utföra jobbet.',
		target: '[data-tour="work-orders-create"]',
		position: 'bottom' as const,
	},
	{
		id: 'work-orders-table',
		title: 'Status och uppföljning',
		description:
			'I listan ser du status, prioritet, planerad tid och ansvarig. Klicka på en rad för att öppna detaljsidan, registrera tid och följa upp genomförandet.',
		target: '[data-tour="work-orders-table"]',
		position: 'top' as const,
	},
];

