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

