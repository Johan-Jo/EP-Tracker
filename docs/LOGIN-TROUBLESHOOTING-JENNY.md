# Login Troubleshooting: jenny.everskog@respondi.se

## Problem
Användaren får felet "Fel e-post eller lösenord" vid inloggning.

## Diagnostisering

### Steg 1: Kör diagnostiskt SQL-skript
Kör `scripts/check-jenny-login-issue.sql` i Supabase SQL Editor för att kontrollera:

1. **Användarexistens i auth.users**
   - Finns användaren?
   - Är e-postadressen bekräftad?
   - Är kontot bannat eller raderat?

2. **Profilstatus**
   - Har användaren en profil i `profiles`-tabellen?

3. **Medlemskap**
   - Har användaren ett aktivt medlemskap?
   - Vilken roll har användaren?

### Steg 2: Vanliga orsaker till inloggningsfel

#### 1. E-post inte bekräftad (vanligaste orsaken)
**Symptom:** `email_confirmed_at IS NULL` och `confirmed_at IS NULL`

**Lösning:**
```sql
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'jenny.everskog@respondi.se'
AND email_confirmed_at IS NULL;
```

**Anmärkning:** Efter att ha bekräftat e-postadressen kan användaren behöva logga in igen.

#### 2. Felaktigt lösenord
Om e-postadressen är bekräftad men inloggning fortfarande misslyckas:
- Kontrollera att användaren använder rätt lösenord
- Överväg att återställa lösenordet via "Glömt lösenord"-funktionen
- Eller använd admin-funktioner för att återställa lösenordet

#### 3. Konto bannat
**Symptom:** `banned_until IS NOT NULL` och `banned_until > NOW()`

**Lösning:**
```sql
UPDATE auth.users
SET banned_until = NULL
WHERE email = 'jenny.everskog@respondi.se';
```

#### 4. Konto raderat
**Symptom:** `deleted_at IS NOT NULL`

**Lösning:** Kontakta support för att återställa kontot.

#### 5. Ingen profil
**Symptom:** Användaren finns i `auth.users` men saknas i `profiles`

**Lösning:** Skapa profil (detta borde ske automatiskt vid registrering, men kan behöva manuellt skapas):
```sql
INSERT INTO profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
WHERE email = 'jenny.everskog@respondi.se'
AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.users.id
);
```

#### 6. Inaktivt medlemskap
**Symptom:** Användaren har inget aktivt medlemskap (`memberships.is_active = false`)

**Lösning:** Aktivera medlemskapet eller skapa ett nytt medlemskap.

### Steg 3: Förbättrad felhantering

Jag har uppdaterat `app/api/auth/signin/route.ts` för att:
- Logga mer detaljerad information på serversidan (för debugging)
- Bättre hantera o bekräftade e-postadresser
- Kontrollera om kontot är bannat
- Ge mer specifika felmeddelanden när det är säkert att göra det

**Viktigt:** Även om servern nu loggar mer information, får användaren fortfarande ett generiskt felmeddelande av säkerhetsskäl ("Fel e-post eller lösenord"). Kontrollera serverloggar för mer detaljerad information.

### Steg 4: Kontrollera serverloggar

Efter att användaren försöker logga in, kontrollera serverloggarna för:
```
Sign-in error details: {
  email: 'jenny.everskog@respondi.se',
  errorMessage: '...',
  errorStatus: ...,
  fullError: ...
}
```

Detta ger mer information om vad som gick fel.

## Snabbdiagnos

Kör detta SQL för en snabb överblick:

```sql
SELECT 
    au.email,
    CASE 
        WHEN au.id IS NULL THEN '❌ USER DOES NOT EXIST'
        WHEN au.deleted_at IS NOT NULL THEN '❌ ACCOUNT DELETED'
        WHEN au.banned_until IS NOT NULL AND au.banned_until > NOW() THEN '❌ ACCOUNT BANNED'
        WHEN au.email_confirmed_at IS NULL AND au.confirmed_at IS NULL THEN '❌ EMAIL NOT CONFIRMED'
        WHEN p.id IS NULL THEN '❌ NO PROFILE'
        WHEN m.id IS NULL THEN '❌ NO ACTIVE MEMBERSHIP'
        ELSE '✅ Account OK - Check password'
    END as status,
    au.email_confirmed_at,
    p.id as profile_id,
    m.is_active as membership_active
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN memberships m ON p.id = m.user_id AND m.is_active = true
WHERE au.email = 'jenny.everskog@respondi.se';
```

## Åtgärder efter fix

1. Be användaren att testa inloggning igen
2. Om problemet kvarstår, kontrollera serverloggar för mer detaljer
3. Överväg att använda "Skicka inloggningslänk" (magic link) som alternativ om lösenordsproblem kvarstår
