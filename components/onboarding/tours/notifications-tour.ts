/**
 * Interactive Tour: Notifications Settings
 * Epic 25: Web Push Notifications
 */

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export const notificationsTourSteps: TourStep[] = [
  {
    target: '[data-tour="enable-notifications"]',
    title: 'Aktivera pushnotiser',
    content: 'Klicka här för att aktivera pushnotiser och få realtidsuppdateringar om viktiga händelser i EP-Tracker.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="test-notification"]',
    title: 'Testa dina notiser',
    content: 'Skicka en testnotis för att verifiera att pushnotiser fungerar på din enhet.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="notification-types"]',
    title: 'Anpassa notis-typer',
    content: 'Välj vilka typer av notiser du vill ta emot. Du kan aktivera eller inaktivera varje typ individuellt.',
    placement: 'top',
  },
  {
    target: '[data-tour="quiet-hours"]',
    title: 'Tyst läge',
    content: 'Ställ in tider när du inte vill bli störd av notiser, t.ex. nattetid.',
    placement: 'top',
  },
  {
    target: '[data-tour="notification-history"]',
    title: 'Notishistorik',
    content: 'Se alla notiser du fått de senaste 50 dagarna.',
    placement: 'left',
  },
];

export const projectAlertsTourSteps: TourStep[] = [
  {
    target: '[data-tour="work-hours"]',
    title: 'Arbetstider',
    content: 'Ställ in när arbetsdagen börjar och slutar för detta projekt. Detta används för att beräkna när påminnelser och varningar ska skickas.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="checkin-reminder"]',
    title: 'Incheckningspåminnelse',
    content: 'Aktivera för att påminna arbetare att checka in innan arbetsdagen startar.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="checkout-reminder"]',
    title: 'Utcheckningspåminnelse',
    content: 'Aktivera för att påminna arbetare att checka ut när arbetsdagen slutar.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="late-checkin-alert"]',
    title: 'Sen incheckningsvarning',
    content: 'Varna arbetsledare om arbetare inte checkat in i tid.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="forgotten-checkout-alert"]',
    title: 'Glömt utcheckningsvarning',
    content: 'Varna arbetsledare om arbetare glömt att checka ut.',
    placement: 'bottom',
  },
];

