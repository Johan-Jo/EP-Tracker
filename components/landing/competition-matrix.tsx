'use client';

import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
    {
        feature: 'Röststyrd dagbok (15 språk → svensk rapport)',
        epTracker: true,
        bygglet: false,
        fieldly: false,
        hantverksdata: false
    },
    {
        feature: 'Dagliga kundrapporter (PDF/länk m. signatur)',
        epTracker: true,
        bygglet: true,
        fieldly: true,
        hantverksdata: true
    },
    {
        feature: 'PWA offline (tid, foto, röst)',
        epTracker: true,
        bygglet: true,
        fieldly: true,
        hantverksdata: true
    },
    {
        feature: 'Veckoplanering drag-and-drop + kapacitet',
        epTracker: true,
        bygglet: true,
        fieldly: true,
        hantverksdata: true
    },
    {
        feature: 'Crew-stämpling & attestflöden',
        epTracker: true,
        bygglet: true,
        fieldly: true,
        hantverksdata: true
    },
    {
        feature: 'Multi-tenant med RLS & auditloggar',
        epTracker: true,
        bygglet: false,
        fieldly: false,
        hantverksdata: false
    },
    {
        feature: 'Bild-till-text & smart taggning',
        epTracker: true,
        bygglet: false,
        fieldly: false,
        hantverksdata: false
    },
    {
        feature: 'Export på kundens språk vid behov',
        epTracker: true,
        bygglet: false,
        fieldly: false,
        hantverksdata: false
    },
    {
        feature: "Mobil 'Idag'-vy med kartnavigering",
        epTracker: true,
        bygglet: true,
        fieldly: true,
        hantverksdata: true
    }
];

export function CompetitionMatrix() {
    return (
        <section className="bg-gray-50 py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Varför välja EP-Tracker?
                    </h2>
                    <p className="text-xl text-gray-600">
                        Jämförelse med andra lösningar på marknaden
                    </p>
                </div>

                {/* Desktop Table */}
                <div className="mx-auto mt-16 hidden max-w-6xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl lg:block">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                                    <th className="px-8 py-6 text-left text-lg font-bold text-gray-900">
                                        Funktion / Kriterium
                                    </th>
                                    <th className="bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-6 text-lg font-bold text-white">
                                        EP-Tracker
                                    </th>
                                    <th className="px-8 py-6 text-lg font-bold text-gray-700">
                                        Bygglet
                                    </th>
                                    <th className="px-8 py-6 text-lg font-bold text-gray-700">
                                        Fieldly
                                    </th>
                                    <th className="px-8 py-6 text-lg font-bold text-gray-700">
                                        Hantverksdata/Next
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {features.map((row, index) => (
                                    <tr 
                                        key={index} 
                                        className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                                        }`}
                                    >
                                        <td className="px-8 py-5 text-base text-gray-800">
                                            {row.feature}
                                        </td>
                                        <td className="bg-orange-50/30 px-8 py-5 text-center">
                                            {row.epTracker ? (
                                                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500">
                                                    <Check className="h-5 w-5 text-white" strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <span className="text-2xl text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {row.bygglet ? (
                                                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                                                    <Check className="h-5 w-5 text-white" strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <span className="text-2xl text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {row.fieldly ? (
                                                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                                                    <Check className="h-5 w-5 text-white" strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <span className="text-2xl text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {row.hantverksdata ? (
                                                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-300">
                                                    <Check className="h-5 w-5 text-white" strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <span className="text-2xl text-gray-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile Cards */}
                <div className="mx-auto mt-12 max-w-2xl space-y-4 lg:hidden">
                    {features.map((row, index) => (
                        <div 
                            key={index}
                            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
                        >
                            <h3 className="mb-4 font-bold text-gray-900">
                                {row.feature}
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2">
                                    {row.epTracker ? (
                                        <Check className="h-5 w-5 text-orange-500" strokeWidth={3} />
                                    ) : (
                                        <X className="h-5 w-5 text-gray-300" />
                                    )}
                                    <span className="text-sm font-semibold text-orange-600">EP-Tracker</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {row.bygglet ? (
                                        <Check className="h-5 w-5 text-gray-400" strokeWidth={3} />
                                    ) : (
                                        <X className="h-5 w-5 text-gray-300" />
                                    )}
                                    <span className="text-sm text-gray-600">Bygglet</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {row.fieldly ? (
                                        <Check className="h-5 w-5 text-gray-400" strokeWidth={3} />
                                    ) : (
                                        <X className="h-5 w-5 text-gray-300" />
                                    )}
                                    <span className="text-sm text-gray-600">Fieldly</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {row.hantverksdata ? (
                                        <Check className="h-5 w-5 text-gray-400" strokeWidth={3} />
                                    ) : (
                                        <X className="h-5 w-5 text-gray-300" />
                                    )}
                                    <span className="text-sm text-gray-600">Hantverksdata</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* USP Summary */}
                <div className="mx-auto mt-16 max-w-4xl rounded-3xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-white p-10 shadow-xl">
                    <h3 className="mb-4 text-center text-2xl font-bold text-gray-900">
                        Vad som gör EP-Tracker unikt
                    </h3>
                    <p className="text-center text-lg text-gray-700">
                        EP-Tracker särskiljer sig genom <strong>röststyrd dagbok på 15 språk</strong>, autoöversatt till korrekt svenska och <strong>dagliga kundrapporter</strong> – allt offline-first i en säker multi-tenant PWA med RLS & auditloggar.
                    </p>
                    
                    <div className="mt-8 flex justify-center">
                        <Button 
                            size="lg"
                            className="group relative h-14 overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-12 font-bold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                        >
                            <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                            <span className="relative">
                                Testa gratis – upplev skillnaden i fält
                            </span>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

