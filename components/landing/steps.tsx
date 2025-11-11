'use client';

import { UserPlus, FolderPlus, Zap } from 'lucide-react';

const steps = [
    {
        number: '1',
        icon: UserPlus,
        title: 'Skapa konto & bjud in teamet',
        description: ''
    },
    {
        number: '2',
        icon: FolderPlus,
        title: 'Lägg upp kunder & projekt',
        description: '(mallar ingår)'
    },
    {
        number: '3',
        icon: Zap,
        title: 'Rapportera & fakturera',
        description: ''
    }
];

export function Steps() {
    return (
        <section className="bg-gradient-to-b from-white to-orange-50 py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Så funkar det – 3 steg
                    </h2>
                </div>
                
                <div className="mx-auto mt-20 grid max-w-5xl gap-12 md:grid-cols-3">
                    {steps.map((step, index) => (
                        <div key={index} className="relative text-center">
                            {/* Step number badge */}
                            <div className="mb-6 flex items-center justify-center">
                                <div className="relative">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-2xl">
                                        <step.icon className="h-10 w-10 text-white" />
                                    </div>
                                    <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg">
                                        {step.number}
                                    </div>
                                </div>
                            </div>
                            
                            <h3 className="mb-2 text-xl font-bold text-gray-900">
                                {step.title}
                            </h3>
                            
                            {step.description && (
                                <p className="text-base text-gray-600">
                                    {step.description}
                                </p>
                            )}
                            
                            {/* Connector arrow */}
                            {index < steps.length - 1 && (
                                <div className="absolute left-1/2 top-10 hidden w-full md:block" style={{ left: '60%' }}>
                                    <svg width="100" height="20" className="text-orange-300">
                                        <path d="M 0 10 L 80 10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" />
                                        <path d="M 75 5 L 85 10 L 75 15" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}







