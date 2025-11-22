# Problem: Datumet visar inte dagens datum som default

## Problembeskrivning

Datumfältet i tidsregistreringsformuläret visar inte dagens datum som standard, trots flera försök att fixa detta. Användaren ser ett felaktigt datum (t.ex. "18 November 2025") istället för dagens datum.

## Koden som inte fungerar

### `components/time/time-page-new.tsx`

```typescript
// Rad 193-195: Initialisering av currentDate
const getTodayDate = () => new Date().toISOString().split('T')[0];
const [currentDate, setCurrentDate] = useState(getTodayDate());

// Rad 300-306: useEffect som försöker sätta dagens datum
useEffect(() => {
	if (!editingEntry) {
		const today = getTodayDate();
		setCurrentDate(today);
	}
}, [editingEntry]);

// Rad 1227-1237: DatePickerInput användning
<DatePickerInput
	id="date"
	label="Datum"
	value={currentDate}
	onChange={(date) => {
		setCurrentDate(date);
		// Update start_at and stop_at when date changes
		if (startTime) {
			setValue('start_at', `${date}T${startTime}`);
		}
		if (endTime) {
			setValue('stop_at', `${date}T${endTime}`);
		}
	}}
	required
	error={errors.start_at?.message}
/>
```

### `components/ui/date-picker-input.tsx`

```typescript
// Rad 79-93: formatDisplayDate funktion
const formatDisplayDate = (dateStr: string) => {
	// If no value, always show today's date
	if (!dateStr) {
		const today = new Date();
		const day = today.getDate();
		const month = months[today.getMonth()];
		const year = today.getFullYear();
		return `${day} ${month} ${year}`;
	}
	const date = new Date(dateStr);
	const day = date.getDate();
	const month = months[date.getMonth()];
	const year = date.getFullYear();
	return `${day} ${month} ${year}`;
};

// Rad 198-200: Visning av datum i knappen
<span className="text-lg text-gray-900 dark:text-white">
	{formatDisplayDate(value || formatDate(new Date()))}
</span>
```

## Identifierade problem

1. **Race condition**: `currentDate` initialiseras med `getTodayDate()` i `useState`, men det kan finnas andra useEffect-hooks eller kod som körs efteråt och ändrar värdet.

2. **useEffect dependency array**: useEffect på rad 300-306 har bara `[editingEntry]` som dependency, vilket betyder att den bara körs när `editingEntry` ändras. Den körs INTE vid första mount om `editingEntry` redan är null.

3. **Value prop problem**: `DatePickerInput` får `value={currentDate}`, men om `currentDate` har ett gammalt värde (t.ex. från en tidigare session eller från någon annan källa), så kommer det gamla värdet att visas.

4. **formatDisplayDate logik**: Funktionen visar dagens datum om `dateStr` är tom, men om `value` (som är `currentDate`) har ett värde, används det värdet istället, även om det är felaktigt.

5. **Möjlig källkälla**: Det kan finnas kod som sätter `currentDate` från:
   - URL-parametrar
   - localStorage/sessionStorage
   - En tidigare render
   - Någon annan useEffect som körs efter mount

## Lösningsförslag som behöver implementeras

1. **Tvinga dagens datum vid mount**: Lägg till en useEffect med tom dependency array som ALLTID sätter `currentDate` till dagens datum vid mount.

2. **Validera currentDate**: Kontrollera om `currentDate` är ett giltigt datum och om det inte är dagens datum när formuläret inte är i edit-läge, sätt det till dagens datum.

3. **Sätt default value direkt**: I stället för att förlita sig på `currentDate` state, sätt `value` prop direkt till dagens datum om `currentDate` är tom eller ogiltig.

4. **Debug logging**: Lägg till console.log för att se när och var `currentDate` ändras.

5. **Kontrollera alla setCurrentDate-anrop**: Sök igenom hela filen efter alla ställen där `setCurrentDate` anropas och se till att de inte sätter ett felaktigt värde.

## Specifik kod som behöver fixas

```typescript
// LÖSNING 1: Lägg till denna useEffect direkt efter useState
useEffect(() => {
	// Force today's date on mount
	if (!editingEntry) {
		const today = getTodayDate();
		setCurrentDate(today);
	}
}, []); // Empty array = run only on mount

// LÖSNING 2: Uppdatera DatePickerInput value prop
<DatePickerInput
	id="date"
	label="Datum"
	value={editingEntry ? currentDate : getTodayDate()} // Force today if not editing
	onChange={(date) => {
		setCurrentDate(date);
		// ... rest of code
	}}
/>

// LÖSNING 3: Validera currentDate i formatDisplayDate
const formatDisplayDate = (dateStr: string) => {
	if (!dateStr) {
		// Always show today if no value
		const today = new Date();
		return `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
	}
	// Validate that dateStr is a valid date and not in the future
	const date = new Date(dateStr);
	const today = new Date();
	if (isNaN(date.getTime()) || date > today) {
		// If invalid or future date, show today
		return `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;
	}
	// Otherwise show the selected date
	return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};
```

## Ytterligare undersökning som behövs

1. Kontrollera om det finns någon kod som läser från localStorage/sessionStorage och sätter `currentDate`
2. Kontrollera om det finns URL-parametrar som sätter datumet
3. Kontrollera om det finns någon annan komponent eller hook som kan påverka `currentDate`
4. Lägg till debug logging för att spåra när `currentDate` ändras


