'use client';

import { Zap, Hand, CheckCircle2, Shield } from 'lucide-react';

const values = [
    {
        icon: Zap,
        title: 'Snabbare dokumentation',
        description: '3–5× snabbare än manuell skrivrutin',
        color: 'orange'
    },
    {
        icon: Hand,
        title: 'Mindre friktion',
        description: 'Tala i mobilen med handskar på; funkar offline',
        color: 'orange'
    },
    {
        icon: CheckCircle2,
        title: 'Bättre kvalitet',
        description: 'Konsekvent, korrekt svenska efter översättning',
        color: 'orange'
    },
    {
        icon: Shield,
        title: 'Spårbarhet',
        description: 'Versioner, loggar, signaturer; lätt att revidera och attestera',
        color: 'orange'
    }
];

export function ValueGrid() {
    return (
        <section className="bg-gradient-to-b from-white to-gray-50 py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Varför EP-Tracker
                    </h2>
                    <p className="text-xl text-gray-600">
                        Värde som gör skillnad i fält och på kontoret
                    </p>
                </div>
                
                <div className="mx-auto mt-20 grid max-w-5xl gap-6 sm:grid-cols-2">
                    {values.map((value, index) => (
                        <div 
                            key={index}
                            className="group flex items-start gap-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-md transition-all hover:border-orange-300 hover:shadow-xl"
                        >
                            <div className="flex-shrink-0">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 transition-transform group-hover:scale-110">
                                    <value.icon className="h-7 w-7 text-orange-600" />
                                </div>
                            </div>
                            <div className="pt-1">
                                <h3 className="text-xl font-bold leading-snug text-gray-900">
                                    {value.title}
                                </h3>
                                <p className="mt-2 text-base text-gray-600">
                                    {value.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mx-auto mt-12 max-w-3xl text-center">
                    <p className="text-base text-gray-600">
                        En plattform utan dubbelarbete: från planering till attest – samma dataflöde.
                    </p>
                </div>
            </div>
        </section>
    );
}


