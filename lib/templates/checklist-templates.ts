export const DEFAULT_CHECKLIST_TEMPLATES = [
	{
		name: 'Riskanalys - Byggplats',
		description: 'Standard riskanalys för byggarbetsplatser enligt AFS 1999:3',
		category: 'Säkerhet',
		template_data: {
			items: [
				{
					type: 'checkbox',
					label: 'Fallskydd installerat på alla höjder över 2 meter',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Personlig skyddsutrustning (hjälm, skor, reflexväst) tillgänglig',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Nödutgångar och utrymningsvägar markerade',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Första hjälpen-utrustning på plats',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Brandskydd och släckutrustning kontrollerad',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Elinstallationer och verktyg godkända och kontrollerade',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Arbetsområde avgränsat och skyltning uppsatt',
					checked: false,
				},
				{
					type: 'text',
					label: 'Identifierade risker och åtgärder',
					value: '',
				},
				{
					type: 'text',
					label: 'Ansvarig arbetsledare',
					value: '',
				},
			],
		},
	},
	{
		name: 'Egenkontroll - Målning',
		description: 'Kvalitetskontroll för målningsarbeten',
		category: 'Kvalitet',
		template_data: {
			items: [
				{
					type: 'checkbox',
					label: 'Underlag rengjort och förberett enligt specifikation',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Grundmålning utförd (antal strykningar kontrollerat)',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Mellan slipning utförd',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Slutmålning utförd med korrekt färgkod',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Inga synliga defekter (droppar, ojämnheter, missar)',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Maskering och skydd bortplockat',
					checked: false,
				},
				{
					type: 'text',
					label: 'Färgkod/kulör',
					value: '',
				},
				{
					type: 'text',
					label: 'Antal strykningar',
					value: '',
				},
				{
					type: 'photo',
					label: 'Foto av färdigt arbete',
					url: null,
				},
			],
		},
	},
	{
		name: 'Egenkontroll - Golvläggning',
		description: 'Kvalitetskontroll för golvarbeten',
		category: 'Kvalitet',
		template_data: {
			items: [
				{
					type: 'checkbox',
					label: 'Undergolv plant och torrt (fuktmätning utförd)',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Underlagsmaterial monterat enligt tillverkarens anvisningar',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Golvmaterial acklimatiserat i rummet 48h',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Läggning utförd med korrekt fogtäthet',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Socklar monterade',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Inga synliga defekter eller skador',
					checked: false,
				},
				{
					type: 'text',
					label: 'Golvtyp och artikelnummer',
					value: '',
				},
				{
					type: 'text',
					label: 'Fuktmätning (%)',
					value: '',
				},
				{
					type: 'photo',
					label: 'Foto av färdigt golv',
					url: null,
				},
			],
		},
	},
	{
		name: 'Skyddskontroll - Ombyggnation',
		description: 'Kontroll av skyddsåtgärder vid ombyggnad/renovering enligt AFS 1999:3',
		category: 'Säkerhet',
		template_data: {
			items: [
				{
					type: 'checkbox',
					label: 'Plastning och dammskydd uppsatt',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Ventilation/dammsugare i drift',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Skydd av golv, trappor och fasta inredningar',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Vattenavstängning kontrollerad',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Elinstallationer avstängda eller skyddade',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Sopnedkast/container på plats',
					checked: false,
				},
				{
					type: 'checkbox',
					label: 'Varningsskyltar och tillträdesförbud uppsatt',
					checked: false,
				},
				{
					type: 'text',
					label: 'Särskilda anmärkningar',
					value: '',
				},
			],
		},
	},
];

