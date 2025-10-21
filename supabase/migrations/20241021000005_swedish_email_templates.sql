-- ============================================================================
-- Update Email Templates to Swedish
-- Updates all email templates with Swedish subject lines and descriptions
-- ============================================================================

-- Update trial-ending-reminder
UPDATE email_templates
SET 
  subject_template = 'Din EP Tracker-provperiod slutar om {{daysRemaining}} dagar',
  description = 'Skickas 3 dagar innan provperioden slutar'
WHERE name = 'trial-ending-reminder';

-- Update trial-ended
UPDATE email_templates
SET 
  subject_template = 'Din EP Tracker-provperiod har slutat',
  description = 'Skickas när provperioden har tagit slut'
WHERE name = 'trial-ended';

-- Update payment-failed
UPDATE email_templates
SET 
  subject_template = 'Problem med din betalning för EP Tracker',
  description = 'Skickas när en betalning misslyckas'
WHERE name = 'payment-failed';

-- Update payment-successful
UPDATE email_templates
SET 
  subject_template = 'Tack för din betalning till EP Tracker!',
  description = 'Skickas när en betalning lyckas'
WHERE name = 'payment-successful';

-- Update account-suspended
UPDATE email_templates
SET 
  subject_template = 'Ditt EP Tracker-konto har pausats',
  description = 'Skickas när ett konto pausas'
WHERE name = 'account-suspended';

-- Update announcement
UPDATE email_templates
SET 
  subject_template = '{{subject}}',
  description = 'Allmän meddelandemall för viktiga uppdateringar'
WHERE name = 'announcement';

-- Update password-reset
UPDATE email_templates
SET 
  subject_template = 'Återställ ditt lösenord för EP Tracker',
  description = 'Skickas när användare begär lösenordsåterställning'
WHERE name = 'password-reset';

-- Update welcome
UPDATE email_templates
SET 
  subject_template = 'Välkommen till EP Tracker!',
  description = 'Välkomstmail för nya användare'
WHERE name = 'welcome';

-- Add more detailed Swedish descriptions
UPDATE email_templates
SET description = 'Skickas automatiskt 3 dagar innan provperioden slutar för att påminna organisationen om att uppgradera till en betald plan.'
WHERE name = 'trial-ending-reminder';

UPDATE email_templates
SET description = 'Skickas automatiskt när provperioden har tagit slut. Informerar organisationen om att de behöver uppgradera för att fortsätta använda tjänsten.'
WHERE name = 'trial-ended';

UPDATE email_templates
SET description = 'Skickas automatiskt när en betalning misslyckas. Innehåller information om hur man uppdaterar betalningsuppgifter.'
WHERE name = 'payment-failed';

UPDATE email_templates
SET description = 'Bekräftelsemail som skickas när en betalning har genomförts. Inkluderar fakturainformation och nästa fakturadatum.'
WHERE name = 'payment-successful';

UPDATE email_templates
SET description = 'Skickas när ett konto pausas, antingen manuellt av super admin eller automatiskt på grund av misslyckade betalningar.'
WHERE name = 'account-suspended';

UPDATE email_templates
SET description = 'Flexibel meddelandemall för att skicka viktiga uppdateringar, nya funktioner eller systemmeddelanden till organisationer.'
WHERE name = 'announcement';

UPDATE email_templates
SET description = 'Transaktionsmail för lösenordsåterställning. Innehåller en säker länk som är giltig i 24 timmar.'
WHERE name = 'password-reset';

UPDATE email_templates
SET description = 'Skickas till nya användare när de skapar sitt konto. Välkomnar dem och guidar dem till dashboarden.'
WHERE name = 'welcome';

-- Log the update
DO $$
BEGIN
  RAISE NOTICE 'Email templates updated to Swedish successfully';
END $$;

