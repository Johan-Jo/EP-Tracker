'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
    {
        question: 'Fungerar EP-Tracker på mobilen?',
        answer: 'Ja, EP-Tracker fungerar perfekt via webbläsaren på både iOS och Android. Appen är byggd som en PWA och kan installeras på din hemskärm för en app-liknande upplevelse.',
    },
    {
        question: 'Kan jag integrera med Fortnox eller Visma?',
        answer: 'Ja, vi stöder export till både Fortnox och Visma via CSV. Du kan också använda PDF-export om du föredrar det.',
    },
    {
        question: 'Hur snabbt kan vi komma igång?',
        answer: 'De flesta team är igång samma dag! Registreringen tar bara 2 minuter, och vi har guider som hjälper dig att komma igång snabbt.',
    },
    {
        question: 'Kan vi ta foton och få kundsignatur?',
        answer: 'Absolut! Alla arbetsorder stöder foton, checklista och kundsignatur direkt i appen.',
    },
    {
        question: 'Stöder ni OB, jour och restid?',
        answer: 'Ja, EP-Tracker har inbyggt stöd för OB, jour, restid och traktamente med egna anpassningsbara regler.',
    },
];

export function LandingFAQ() {
    return (
        <section className="bg-white py-20 sm:py-32">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="mb-16 text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Vanliga frågor
                    </h2>
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

