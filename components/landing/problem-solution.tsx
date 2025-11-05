'use client';

import { Clock, FileText, Download, Package } from 'lucide-react';

const solutions = [
    {
        icon: Clock,
        title: 'Enkla tidrapporter',
        description: '(även offline)'
    },
    {
        icon: Package,
        title: 'Material & kvitton',
        description: 'på rätt projekt'
    },
    {
        icon: FileText,
        title: 'Automatiska fakturaunderlag',
        description: ''
    },
    {
        icon: Download,
        title: 'Fortnox/Visma-export',
        description: '(beroende på upplägg)'
    }
];

export function ProblemSolution() {
    return (
        <section className="bg-white py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Problem → Lösning
                    </h2>
                    <p className="text-xl text-gray-600">
                        Allt du behöver för att komma från arbetsplats till faktura
                    </p>
                </div>
                
                <div className="mx-auto mt-20 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {solutions.map((solution, index) => (
                        <div 
                            key={index} 
                            className="group rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-md transition-all hover:border-orange-300 hover:shadow-xl"
                        >
                            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg transition-transform group-hover:scale-110">
                                <solution.icon className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="mb-2 text-lg font-bold text-gray-900">
                                {solution.title}
                            </h3>
                            {solution.description && (
                                <p className="text-sm text-gray-600">
                                    {solution.description}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}



