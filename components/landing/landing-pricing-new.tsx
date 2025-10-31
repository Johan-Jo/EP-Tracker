'use client';

import { Button } from '@/components/ui/button';
import { Check, Sparkles, Gift } from 'lucide-react';

const plans = [
    {
        name: 'Start',
        price: '199',
        period: 'kr/användare/månad',
        features: [
            'Tid, projekt & arbetsorder',
            'Material/kvitton',
            'Enkla rapporter',
            'E-postsupport'
        ],
        cta: 'Prova gratis',
        featured: false
    },
    {
        name: 'Pro',
        price: '299',
        period: 'kr/användare/månad',
        features: [
            'Allt i Start',
            'Fakturaunderlag',
            'Export till Fortnox/Visma',
            'Godkännandeflöden',
            'Avancerade rapporter'
        ],
        cta: 'Prova gratis',
        featured: true
    },
    {
        name: 'Business',
        price: 'Offert',
        period: '',
        features: [
            'Allt i Pro',
            'Roller/behörigheter',
            'SSO',
            'Prioriterad support',
            'Onboarding för hela teamet'
        ],
        cta: 'Kommer snart',
        featured: false
    }
];

export function PricingCards() {
    return (
        <section className="bg-gradient-to-b from-gray-50 to-white py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Priser
                    </h2>
                    <p className="text-xl text-gray-600">
                        Välj den plan som passar ditt team
                    </p>
                </div>
                
                <div className="mx-auto mt-20 grid max-w-6xl gap-8 lg:grid-cols-3">
                    {plans.map((plan, index) => (
                        <div 
                            key={index}
                            className={`relative rounded-3xl border-2 p-10 ${
                                plan.featured 
                                    ? 'border-orange-500 bg-gradient-to-br from-orange-600 to-orange-700 shadow-2xl pt-20' 
                                    : 'border-gray-200 bg-white shadow-lg'
                            }`}
                        >
                            {plan.featured && (
                                <>
                                    {/* Free Year Banner */}
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 w-[120%]">
                                        <div className="bg-blue-600 rounded-full px-6 py-3 shadow-2xl">
                                            <div className="flex items-center justify-center gap-3">
                                                <Gift className="h-5 w-5 text-white" />
                                                <span className="text-sm font-bold text-white">
                                                    Gratis ett helt år för de 200 första användarna
                                                </span>
                                                <Gift className="h-5 w-5 text-white" />
                                            </div>
                                        </div>
                                        {/* Recommended Badge */}
                                        <div className="flex items-center justify-center mt-2">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-2 text-sm font-bold text-white shadow-xl">
                                                <Sparkles className="h-5 w-5" />
                                                Rekommenderas
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            <div className="mb-10">
                                <h3 className={`mb-3 text-3xl font-bold ${
                                    plan.featured ? 'text-white' : 'text-gray-900'
                                }`}>
                                    {plan.name}
                                </h3>
                                
                                <div className="mt-6">
                                    {plan.price === 'Offert' ? (
                                        <div className={`text-4xl font-bold ${
                                            plan.featured ? 'text-white' : 'text-gray-900'
                                        }`}>
                                            Offert
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-base ${
                                                    plan.featured ? 'text-orange-200' : 'text-gray-600'
                                                }`}>
                                                    fr.
                                                </span>
                                                <span className={`text-5xl font-bold ${
                                                    plan.featured ? 'text-white' : 'text-orange-600'
                                                }`}>
                                                    {plan.price}
                                                </span>
                                            </div>
                                            <div className={`mt-2 text-base ${
                                                plan.featured ? 'text-orange-200' : 'text-gray-600'
                                            }`}>
                                                {plan.period}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <Button 
                                className={`mb-10 h-12 w-full rounded-xl text-base font-bold ${
                                    plan.featured
                                        ? 'bg-white text-orange-600 hover:bg-gray-50'
                                        : 'bg-orange-500 text-white hover:bg-orange-600'
                                }`}
                            >
                                {plan.cta}
                            </Button>
                            
                            <ul className="space-y-4">
                                {plan.features.map((feature, featureIndex) => (
                                    <li key={featureIndex} className="flex items-start gap-3">
                                        <Check className={`mt-0.5 h-6 w-6 flex-shrink-0 ${
                                            plan.featured ? 'text-white' : 'text-orange-600'
                                        }`} />
                                        <span className={`text-base ${plan.featured ? 'text-white' : 'text-gray-700'}`}>
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                
                <p className="mt-16 text-center text-base text-gray-600">
                    Priser exkl. moms
                </p>
                
                <div className="mt-8 flex items-center justify-center gap-6">
                    <Button variant="ghost" className="text-orange-600 hover:text-orange-700">
                        Prova gratis
                    </Button>
                    <span className="text-gray-400">|</span>
                    <Button variant="ghost" className="text-orange-600 hover:text-orange-700">
                        Testa gratis
                    </Button>
                </div>
            </div>
        </section>
    );
}

