'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function Integrations() {
    return (
        <section className="border-y-2 border-gray-200 bg-gray-50 py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-4 text-3xl font-bold text-gray-900">
                        Integrationer
                    </h2>
                    <p className="mb-12 text-lg text-gray-700">
                        Fortnox och Visma eEkonomi (export/underlag). Fler på väg.
                    </p>

                    <div className="mb-12 flex flex-wrap items-center justify-center gap-6">
                        <div className="rounded-2xl border-2 border-gray-200 bg-white px-10 py-6 shadow-md transition-all hover:border-orange-300 hover:shadow-lg">
                            <span className="text-2xl font-bold text-gray-900">
                                Fortnox
                            </span>
                        </div>
                        <div className="rounded-2xl border-2 border-gray-200 bg-white px-10 py-6 shadow-md transition-all hover:border-orange-300 hover:shadow-lg">
                            <span className="text-2xl font-bold text-gray-900">
                                Visma eEkonomi
                            </span>
                        </div>
                    </div>

                    <Button
                        className="h-12 rounded-full border-2 border-gray-300 bg-white font-semibold text-gray-900 hover:border-orange-500 hover:bg-white"
                        variant="outline"
                    >
                        Prata integrationer med oss
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </div>
        </section>
    );
}








