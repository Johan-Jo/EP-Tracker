'use client';

import { Clock, Clipboard, ShoppingCart, FileText, CheckSquare, Calendar } from 'lucide-react';

const features = [
    {
        icon: Clock,
        title: 'Tid & Team',
        items: [
            'Flytande timer, manuell tid, resor/restid',
            'Crew-stämpling, redigering, historik',
            'Atteststöd'
        ]
    },
    {
        icon: Clipboard,
        title: 'Projekt & Arbetsordrar',
        items: [
            'Projekt-CRUD med faser/arbetsordrar',
            'Färgkodning, filter',
            'Rollbaserad navigering'
        ]
    },
    {
        icon: ShoppingCart,
        title: 'Material, Utlägg & Milersättning',
        items: [
            'Registrering med foton, kategorier',
            'Status (utkast → inskickat → godkänt)',
            'Export/attest'
        ]
    },
    {
        icon: CheckSquare,
        title: 'ÄTA, Dagbok & Checklistor',
        items: [
            'ÄTA-hantering',
            'Fältdagbok (inkl. foton)',
            'Checklistor och signatur'
        ]
    },
    {
        icon: FileText,
        title: 'Attest, Export & Underlag',
        items: [
            'Attestflöden för tid/material/utlägg',
            'CSV-export, fakturaunderlag',
            'Löne- och fakturaunderlag'
        ]
    },
    {
        icon: Calendar,
        title: 'Planeringssystem',
        items: [
            'Veckograd med drag-and-drop, kapacitet',
            'Konfliktvarningar, projektfilter',
            "Mobil 'Idag': checka in/ut, kartnavigering"
        ]
    }
];

export function FeatureGrid() {
    return (
        <section className="bg-gray-50 py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Kärnfunktioner
                    </h2>
                    <p className="text-xl text-gray-600">
                        Allt från tidrapportering bygg till planering byggprojekt
                    </p>
                </div>
                
                <div className="mx-auto mt-20 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <div 
                            key={index}
                            className="group rounded-3xl border border-gray-200 bg-white p-10 shadow-lg transition-all hover:border-orange-300 hover:shadow-2xl"
                        >
                            <div className="mb-8 flex items-center gap-5">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg transition-transform group-hover:scale-110">
                                    <feature.icon className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {feature.title}
                                </h3>
                            </div>
                            
                            <ul className="space-y-3">
                                {feature.items.map((item, itemIndex) => (
                                    <li key={itemIndex} className="flex items-start gap-3">
                                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" />
                                        <span className="text-base text-gray-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mx-auto mt-12 max-w-3xl text-center">
                    <p className="text-base font-semibold text-orange-600">
                        Se alla funktioner – kom igång på minuter
                    </p>
                </div>
            </div>
        </section>
    );
}








