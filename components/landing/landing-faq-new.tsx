'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
    {
        question: 'Vad är tidrapportering bygg?',
        answer: 'Tidrapportering bygg är ett system för att registrera arbetstid, projekt och resurser på byggarbetsplatser. EP-Tracker erbjuder tidrapportering bygg med offline-first PWA som fungerar utan täckning – tid, material och foton sparas lokalt och synkas säkert när nät finns.'
    },
    {
        question: 'Hur funkar röststyrd dagbok bygg?',
        answer: 'Röststyrd dagbok bygg i EP-Tracker stödjer 15 språk. Tala in anteckningar på valfritt språk – systemet transkriberar och autoöversätter till korrekt skriven svenska. Kopplas automatiskt till rätt projekt och datum, och du kan skapa dagliga kundrapporter (PDF/länk) med bilder, status och signaturer.'
    },
    {
        question: 'Hur stödjer ni planering byggprojekt?',
        answer: 'Planering byggprojekt i EP-Tracker sker via en veckograd med drag-and-drop, kapacitetsindikatorer, konfliktvarningar och projektfilter. På mobilen finns en \'Idag\'-vy där du kan checka in/ut, uppdatera status (planerad → pågår → klar) och navigera till arbetsplatsen via karta.'
    },
    {
        question: 'Vad innebär PWA offline?',
        answer: 'PWA offline betyder att EP-Tracker fungerar utan internetanslutning. Du kan registrera tid, ta foton, spela in röstanteckningar och lägga till material helt utan nät. All data sparas säkert lokalt i din enhet och synkas automatiskt när anslutning finns – perfekt för byggarbetsplatser med dålig täckning.'
    },
    {
        question: 'Vad är RLS och multi-tenant?',
        answer: 'RLS (Row Level Security) och multi-tenant innebär att varje kund har sina egna data som är helt separerade från andra kunder. Med RLS säkerställer vi att användare endast kan se data de har behörighet till enligt sin roll (Admin, Arbetsledare, Arbetare, Ekonomi, Superadmin). Allt spåras i auditloggar för full transparens.'
    },
    {
        question: 'Funkar EP-Tracker med Fortnox och Visma?',
        answer: 'Ja, EP-Tracker exporterar fakturaunderlag, löneunderlag och tidsrapporter som CSV/PDF som enkelt kan importeras till Fortnox, Visma och andra ekonomisystem. Vi har även direktintegrationer planerade.'
    }
];

export function FAQ() {
    return (
        <section className="bg-white py-20 sm:py-32">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="mb-16 text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Vanliga frågor
                    </h2>
                    <p className="text-xl text-gray-600">
                        Allt du behöver veta om EP-Tracker
                    </p>
                </div>
                
                <Accordion type="single" collapsible className="space-y-4">
                    {faqs.map((faq, index) => (
                        <AccordionItem 
                            key={index} 
                            value={`item-${index}`}
                            className="rounded-2xl border-2 border-gray-200 bg-white px-8 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
                        >
                            <AccordionTrigger className="py-6 text-left text-lg font-bold text-gray-900 hover:text-orange-600">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="pb-6 text-base text-gray-700">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}









