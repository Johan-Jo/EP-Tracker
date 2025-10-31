'use client';

import { Mic, ArrowRight, Shield, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const usps = [
    {
        icon: Mic,
        title: 'Röststyrd dagbok (15 språk)',
        description: 'Tala in anteckningar på valfritt av 15 språk. Systemet transkriberar och autoöversätter till korrekt skriven svenska.',
        features: [
            'Kopplas automatiskt till rätt projekt och datum',
            'Skapa dagliga kundrapporter (PDF/länk) med bilder, status och signaturer',
            'Offline: spela in och fota utan täckning – synkas säkert när nät finns'
        ],
        cta: 'Testa gratis – se röst till rapport live',
        gradient: 'from-orange-500 to-orange-600'
    },
    {
        icon: ArrowRight,
        title: 'Planering → Utförande → Attest',
        description: 'Röd tråd hela vägen från veckoplanering till godkänd attest.',
        features: [
            'Planering: Veckovy med drag-and-drop, kapacitet, konflikter och filter',
            'Utförande: Mobil \'Idag\'-vy med jobbkort, checka in/ut, status, navigering i karta',
            'Attest & export: Löne-/fakturaunderlag direkt från fält'
        ],
        cta: 'Prova gratis – planera din första vecka',
        gradient: 'from-blue-600 to-blue-700'
    },
    {
        icon: Shield,
        title: 'Säkerhet & styrning',
        description: 'Multi-tenant arkitektur med rollstyrning och full spårbarhet.',
        features: [
            'Rollstyrning: Admin, Arbetsledare, Arbetare, Ekonomi, Superadmin',
            'Multi-tenant med RLS, auditloggar och härdad session',
            'Spårbarhet från fält till kontor'
        ],
        cta: 'Läs mer om dataskydd och revision',
        gradient: 'from-gray-700 to-gray-800'
    },
    {
        icon: Smartphone,
        title: 'PWA i fält (offline-first)',
        description: 'Mobil först, installeras på telefon/surfplatta. PWA offline fungerar där jobbet sker.',
        features: [
            'PWA offline: tid, material, foton och röst fungerar utan nät',
            'Snabb och robust i tuffa miljöer',
            'Synkas automatiskt när anslutning finns'
        ],
        cta: 'Testa offline – funkar där jobbet sker',
        gradient: 'from-orange-500 to-orange-600'
    }
];

export function USPs() {
    return (
        <section className="bg-white py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Unika säljpoänger
                    </h2>
                    <p className="text-xl text-gray-600">
                        Vad som gör EP-Tracker unikt på marknaden
                    </p>
                </div>
                
                <div className="mx-auto mt-20 grid max-w-6xl gap-12">
                    {usps.map((usp, index) => (
                        <div 
                            key={index}
                            className="group rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-10 shadow-lg transition-all hover:border-orange-300 hover:shadow-2xl sm:p-12"
                        >
                            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
                                {/* Icon & Title */}
                                <div className="flex-shrink-0">
                                    <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${usp.gradient} shadow-lg transition-transform group-hover:scale-110`}>
                                        <usp.icon className="h-10 w-10 text-white" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className="mb-4 text-3xl font-bold text-gray-900">
                                        {usp.title}
                                    </h3>
                                    <p className="mb-6 text-lg text-gray-700">
                                        {usp.description}
                                    </p>
                                    
                                    <ul className="mb-8 space-y-3">
                                        {usp.features.map((feature, featureIndex) => (
                                            <li key={featureIndex} className="flex items-start gap-3">
                                                <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" />
                                                <span className="text-base text-gray-700">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <Button 
                                        variant="outline"
                                        className="group/btn rounded-full border-2 border-orange-500 px-8 py-6 font-semibold text-orange-600 transition-all hover:bg-orange-50"
                                    >
                                        {usp.cta}
                                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

