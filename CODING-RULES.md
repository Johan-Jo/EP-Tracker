# Kodningsregler för EP-Tracker

## ❌ FÖRBJUDET: Browser Native Popups

**ANVÄND ALDRIG:**
- `confirm()`
- `alert()`
- `prompt()`

### Varför?
- Dålig användarupplevelse
- Ser olika ut i olika webbläsare
- Kan inte stylas
- Stör användarflödet
- Ser oprofessionella ut

### ✅ Använd istället:

#### För bekräftelser (confirm):
```typescript
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// State för att visa dialog
const [showDeleteDialog, setShowDeleteDialog] = useState(false);

// Visa dialog
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Är du säker?</AlertDialogTitle>
      <AlertDialogDescription>
        Denna åtgärd kan inte ångras.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Avbryt</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirm}>
        Bekräfta
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### För notifikationer (alert):
```typescript
import { toast } from 'react-hot-toast';

// Framgång
toast.success('Åtgärden lyckades!');

// Fel
toast.error('Något gick fel');

// Information
toast('Information här');
```

#### För input (prompt):
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Använd en custom Dialog med Input-fält
```

## Kontrollera innan commit:
```bash
# Sök efter förbjudna funktioner:
grep -r "confirm(" --include="*.tsx" --include="*.ts"
grep -r "alert(" --include="*.tsx" --include="*.ts"
grep -r "prompt(" --include="*.tsx" --include="*.ts"
```

---

## ❌ FÖRBJUDET: Multi-Region Deployment

**VIKTIGT:** EP-Tracker är konfigurerad för **ENDAST EN REGION: Stockholm (arn1)**

Detta är ett krav på grund av Vercel Hobby-planens begränsningar. Multi-region deployment kräver Pro/Enterprise.

### ✅ TILLÅTET:
```typescript
// Next.js Route Handlers & Pages
export const runtime = 'nodejs';  // ✅ Preferred
export const preferredRegion = 'arn1';  // ✅ REQUIRED

// OR if Edge is absolutely necessary:
export const runtime = 'edge';  // ⚠️ Use sparingly
export const preferredRegion = 'arn1';  // ✅ REQUIRED
```

### ❌ FÖRBJUDET:
```typescript
// NEVER use multiple regions
export const preferredRegion = ['arn1', 'fra1'];  // ❌ FORBIDDEN
export const preferredRegion = 'auto';  // ❌ FORBIDDEN

// NEVER configure multiple regions in vercel.json
{
  "regions": ["arn1", "fra1"]  // ❌ FORBIDDEN
}
```

### 🔧 Konfigurationsfiler som MÅSTE respektera detta:

1. **vercel.json:**
   ```json
   {
     "regions": ["arn1"]  // ✅ ONLY Stockholm
   }
   ```

2. **middleware.ts:**
   ```typescript
   export const config = {
     matcher: [...],
     regions: ['arn1']  // ✅ REQUIRED
   };
   ```

3. **Alla API routes (app/api/**/route.ts):**
   ```typescript
   export const preferredRegion = 'arn1';
   ```

4. **Alla Page routes (app/**/page.tsx):**
   ```typescript
   export const preferredRegion = 'arn1';
   ```

### 🚨 Fel du kommer se om detta bryts:
```
Error: Deploying Serverless Functions to multiple regions 
is restricted to the Pro and Enterprise plans.
```

### ✅ Verifiering innan commit:
```bash
# Kontrollera att INGA multi-region konfigurationer finns:
rg -n "regions\s*:\s*\[[^\]]*,\s*[^\]]*\]" --type ts --type json
rg -n "preferredRegion\s*=\s*\[" --type ts
rg -n "preferredRegion\s*=\s*['\"]auto['\"]" --type ts

# Resultatet ska vara TOMT. Alla träffar = FEL!
```

---

## Andra viktiga regler:

### TypeScript
- Undvik `any` när det är möjligt
- Använd explicita typer för props och state

### React
- Använd functional components med hooks
- Undvik direkt DOM-manipulation
- Använd Next.js Image för bilder

### Styling
- Använd Tailwind CSS classes
- Använd shadcn/ui komponenter
- Behåll konsistent spacing (px-4, py-2, gap-3 osv.)

### Error Handling
- Använd try/catch för async operationer
- Visa användarvänliga felmeddelanden med toast
- Logga fel till console för debugging

