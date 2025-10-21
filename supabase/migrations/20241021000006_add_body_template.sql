-- ============================================================================
-- Add body_template column to email_templates
-- Allows editing email body content via UI
-- ============================================================================

-- Add body_template column
ALTER TABLE email_templates 
ADD COLUMN IF NOT EXISTS body_template TEXT;

-- Add default Swedish body templates for existing templates
UPDATE email_templates
SET body_template = 
  CASE name
    WHEN 'trial-ending-reminder' THEN 'Hej {{organizationName}}!

Din kostnadsfria provperiod för EP Tracker slutar om {{daysRemaining}} dagar.

För att fortsätta använda EP Tracker och behålla all din data, behöver du uppgradera till en betald plan.

Våra planer börjar från 199 kr/månad och inkluderar allt du behöver för att hantera dina projekt effektivt.

[Uppgradera nu]({{upgradeUrl}})

Har du frågor? Kontakta oss gärna på {{supportEmail}}

Med vänliga hälsningar,
EP Tracker-teamet'
    
    WHEN 'trial-ended' THEN 'Hej {{organizationName}}!

Din kostnadsfria provperiod för EP Tracker har nu slutat.

Vi hoppas att du har uppskattat tjänsten och sett hur den kan effektivisera din verksamhet med tidrapportering, material och utgifter.

Välj en plan som passar era behov och fortsätt arbeta smart med EP Tracker.

[Välj en plan]({{upgradeUrl}})

Har du frågor? Kontakta oss gärna på {{supportEmail}}

Med vänliga hälsningar,
EP Tracker-teamet'
    
    WHEN 'payment-failed' THEN 'Hej {{organizationName}}!

Vi kunde tyvärr inte genomföra din senaste betalning för EP Tracker ({{planName}}-planen, {{amount}} kr).

**Vanliga orsaker:**
• Utgånget kort
• Otillräckliga medel  
• Kortet är blockerat av banken
• Fel kortuppgifter

För att undvika avbrott i din tjänst behöver du uppdatera dina betalningsuppgifter så snart som möjligt.

[Uppdatera betalningsuppgifter]({{updatePaymentUrl}})

⚠️ **Viktigt:** Om betalningen inte kan genomföras inom 7 dagar kan ditt konto komma att pausas.

Har du frågor? Kontakta oss gärna på {{supportEmail}}

Med vänliga hälsningar,
EP Tracker-teamet'
    
    WHEN 'payment-successful' THEN 'Hej {{organizationName}}!

Tack för din betalning! Vi har tagit emot din betalning för EP Tracker och din prenumeration är nu aktiv.

**Kvitto:**
Plan: {{planName}}
Belopp: {{amount}} kr
Nästa faktura: {{nextBillingDate}}

[Visa faktura]({{invoiceUrl}})

Din faktura finns också tillgänglig i din instrumentpanel under Inställningar → Fakturering.

Har du frågor? Kontakta oss gärna på {{supportEmail}}

Med vänliga hälsningar,
EP Tracker-teamet'
    
    WHEN 'account-suspended' THEN 'Hej {{organizationName}}!

Ditt EP Tracker-konto har tillfälligt pausats.

**Orsak:** {{reason}}

**Vad betyder det?**
• Du kan inte längre logga in på EP Tracker
• Din data är säker och sparad
• Dina team-medlemmar kan inte heller komma åt kontot
• All funktionalitet är pausad

**Hur återaktiverar jag mitt konto?**
För att återaktivera ditt konto behöver du uppdatera dina betalningsuppgifter och betala eventuella utestående fakturor.

[Återaktivera konto]({{contactUrl}})

Behöver du hjälp? Kontakta oss direkt på {{supportEmail}} så hjälper vi dig.

Med vänliga hälsningar,
EP Tracker-teamet'
    
    WHEN 'announcement' THEN '{{message}}

{{#if ctaText}}
[{{ctaText}}]({{ctaUrl}})
{{/if}}

Med vänliga hälsningar,
EP Tracker Team'
    
    WHEN 'password-reset' THEN 'Hej {{userName}}!

Vi har tagit emot en begäran om att återställa lösenordet för ditt EP Tracker-konto.

Klicka på knappen nedan för att välja ett nytt lösenord:

[Återställ lösenord]({{resetUrl}})

⏰ **Viktigt:** Denna länk är giltig i {{expiresIn}}. Efter det måste du begära en ny återställningslänk.

Om du inte har begärt en lösenordsåterställning kan du ignorera detta mail. Ditt lösenord kommer inte att ändras.

**🛡️ Säkerhetstips:**
• Använd aldrig samma lösenord på flera platser
• Välj ett starkt lösenord med minst 8 tecken
• Kombinera stora och små bokstäver, siffror och symboler
• Dela aldrig ditt lösenord med någon

Har du problem? Kontakta oss på {{supportEmail}}

Med vänliga hälsningar,
EP Tracker-teamet'
    
    WHEN 'welcome' THEN 'Hej {{userName}}!

Välkommen till EP Tracker - din nya partner för smart projekthantering i byggbranschen!

Du är nu medlem i **{{organizationName}}** och har tillgång till alla funktioner under din 14-dagars kostnadsfria provperiod.

**Vad kan du göra med EP Tracker?**
✓ Tidrapportering direkt från mobilen
✓ Materialhantering och utgifter
✓ Projektöversikt i realtid
✓ Automatisk export för fakturering
✓ Offline-läge - fungerar överallt

[Kom igång nu]({{dashboardUrl}})

Behöver du hjälp? Tveka inte att kontakta oss på {{supportEmail}}

Med vänliga hälsningar,
EP Tracker-teamet'
    
    ELSE body_template
  END
WHERE body_template IS NULL;

-- Log the update
DO $$
BEGIN
  RAISE NOTICE 'body_template column added and populated with Swedish content';
END $$;

