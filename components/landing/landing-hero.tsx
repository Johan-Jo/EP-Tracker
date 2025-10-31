'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';

export function LandingHero() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-blue-50 pb-20 pt-24 sm:pb-32 sm:pt-40">
            {/* Decorative circles */}
            <div className="absolute right-0 top-0 -mr-40 -mt-40 h-80 w-80 rounded-full bg-orange-200 opacity-20 blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-40 -ml-40 h-80 w-80 rounded-full bg-blue-200 opacity-20 blur-3xl" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    {/* Headline */}
                    <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
                        Planera, dokumentera och attestera – snabbare
                    </h1>
                    
                    {/* Ingress */}
                    <p className="mx-auto mb-8 max-w-2xl text-xl leading-relaxed text-gray-700 sm:text-2xl">
                        Röststyrd dagbok på 15 språk som blir svensk rapport
                    </p>

                    {/* Trust bar - proof points */}
                    <div className="mx-auto mb-12 flex max-w-4xl flex-wrap items-center justify-center gap-4 text-base text-gray-600">
                        <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                                <Check className="h-3 w-3 text-orange-600" />
                            </div>
                            <span>Funkar utan täckning</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                                <Check className="h-3 w-3 text-orange-600" />
                            </div>
                            <span>Röst → svensk rapport</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                                <Check className="h-3 w-3 text-orange-600" />
                            </div>
                            <span>Veckoplan i mobilen</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                                <Check className="h-3 w-3 text-orange-600" />
                            </div>
                            <span>Checka in/ut på plats</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                                <Check className="h-3 w-3 text-orange-600" />
                            </div>
                            <span>Foton & signatur</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                                <Check className="h-3 w-3 text-orange-600" />
                            </div>
                            <span>Klart för attest</span>
                        </div>
                    </div>
                    
                    {/* CTA Buttons */}
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Link href="/sign-up" className="w-full sm:w-auto">
                            <Button 
                                size="lg"
                                className="group relative h-16 w-full overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-14 text-xl font-bold text-white shadow-[0_20px_50px_-12px_rgba(249,115,22,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_32px_64px_-12px_rgba(249,115,22,0.6)] sm:w-auto"
                                style={{
                                    boxShadow: '0 20px 50px -12px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                                }}
                            >
                                {/* Shine effect */}
                                <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                                
                                <span className="relative flex items-center gap-3">
                                    Prova gratis
                                    <ArrowRight className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-1" />
                                </span>
                            </Button>
                        </Link>
                    </div>
                    
                    {/* Trust microcopy */}
                    <p className="mt-8 text-center text-base text-gray-600">
                        Mindre pappersjobb, säkrare underlag – från röst till kundrapport på minuter.
                    </p>
                </div>
                
                {/* Hero Image - Construction Worker */}
                <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
                    <div className="relative overflow-hidden rounded-3xl shadow-2xl">
                        <Image
                            src="/images/MatteZipp.webp"
                            alt="Hantverkare visar EP-Tracker i fält"
                            width={1200}
                            height={600}
                            className="h-[300px] w-full object-cover object-[50%_30%] sm:h-[400px]"
                            priority
                        />
                        {/* Gradient overlay for better text contrast if needed */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                </div>
                
                {/* App Screenshots Showcase */}
                <div className="mx-auto mt-16 max-w-5xl sm:mt-20">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
                        {/* Screenshot 1 - Dashboard */}
                        <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                            <Image
                                src="/images/dashboard.jpg"
                                alt="EP-Tracker översikt med aktiv tid"
                                width={400}
                                height={600}
                                className="h-full w-full object-cover"
                            />
                        </div>

                        {/* Screenshot 2 - Dagbok */}
                        <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                            <Image
                                src="/images/dagbok.jpg"
                                alt="EP-Tracker dagbok funktion"
                                width={400}
                                height={600}
                                className="h-full w-full object-cover"
                            />
                        </div>

                        {/* Screenshot 3 - Material */}
                        <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-xl transition-all hover:scale-105 hover:shadow-2xl">
                            <Image
                                src="/images/material.jpg"
                                alt="EP-Tracker material och utgifter"
                                width={400}
                                height={600}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    </div>
                    
                    {/* Caption */}
                    <p className="mt-8 text-center text-base text-gray-600">
                        EP-Tracker i arbete – översikt, material och projektstatus
                    </p>
                </div>
            </div>
        </section>
    );
}
