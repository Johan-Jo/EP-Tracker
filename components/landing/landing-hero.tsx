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
                        Spåra tid. Få betalt snabbare.
                    </h1>

                    {/* Ingress */}
                    <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-gray-700 sm:text-2xl">
                        EP-Tracker samlar timmar, material och projektstatus från fält – och gör
                        fakturaunderlag på sekunder.
                    </p>

                    {/* CTA Button */}
                    <div className="flex flex-col items-center justify-center">
                        <Link href="/sign-up" className="w-full sm:w-auto">
                            <Button
                                size="lg"
                                className="group relative h-16 w-full overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-14 text-xl font-bold text-white shadow-[0_20px_50px_-12px_rgba(249,115,22,0.5)] transition-all duration-300 hover:scale-105 hover:shadow-[0_32px_64px_-12px_rgba(249,115,22,0.6)] sm:w-auto"
                            >
                                {/* Shine effect */}
                                <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />

                                <span className="relative flex items-center gap-3">
                                    Prova gratis i 14 dagar
                                    <ArrowRight className="h-6 w-6 transition-transform duration-300 group-hover:translate-x-1" />
                                </span>
                            </Button>
                        </Link>
                    </div>

                    {/* Microcopy */}
                    <div className="mt-8 flex items-center justify-center gap-8 text-base text-gray-600">
                        <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                                <Check className="h-3 w-3 text-orange-600" />
                            </div>
                            <span>Inga kortuppgifter</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100">
                                <Check className="h-3 w-3 text-orange-600" />
                            </div>
                            <span>Starta på 2 min</span>
                        </div>
                    </div>
                </div>

                {/* Hero Image - Construction Workers */}
                <div className="mx-auto mt-16 max-w-5xl sm:mt-20">
                    <div className="relative overflow-hidden rounded-3xl shadow-2xl h-[300px] sm:h-[450px] lg:h-[500px]">
                        <Image
                            src="/images/hero-construction.jpg"
                            alt="Byggnadsarbetare använder EP-Tracker på byggarbetsplats"
                            fill
                            className="object-cover"
                            priority
                        />
                        {/* Gradient overlay for better contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
                    </div>
                </div>

                {/* Hero Visual - Dashboard Mockup */}
                <div className="mx-auto mt-16 max-w-6xl sm:mt-20">
                    <div
                        className="relative rounded-3xl border border-gray-200 bg-white p-2 shadow-2xl sm:p-3"
                    >
                        {/* Browser chrome */}
                        <div className="mb-3 flex items-center gap-2 rounded-t-2xl bg-gray-100 px-4 py-3">
                            <div className="flex gap-2">
                                <div className="h-3 w-3 rounded-full bg-orange-400" />
                                <div className="h-3 w-3 rounded-full bg-gray-300" />
                                <div className="h-3 w-3 rounded-full bg-gray-300" />
                            </div>
                            <div className="ml-4 h-3 flex-1 rounded-full bg-white" />
                        </div>

                        {/* Dashboard Content */}
                        <div className="space-y-4 rounded-2xl bg-gradient-to-br from-gray-50 to-white p-8">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-5">
                                <h3 className="text-xl font-bold text-gray-900">Tidrapport</h3>
                                <span className="rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white">
                                    Aktiv
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-md transition-all hover:shadow-lg">
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900">
                                            Projekt Bergsgatan 15
                                        </div>
                                        <div className="mt-1 text-sm text-gray-600">
                                            08:00 - 16:30
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-orange-600">8.5h</div>
                                </div>

                                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-md transition-all hover:shadow-lg">
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900">
                                            VVS-renovering
                                        </div>
                                        <div className="mt-1 text-sm text-gray-600">
                                            09:00 - 15:00
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-orange-600">6h</div>
                                </div>
                            </div>

                            <Button className="w-full rounded-xl bg-orange-500 py-6 font-semibold text-white shadow-lg hover:bg-orange-600 hover:shadow-xl">
                                Starta ny tid
                            </Button>
                        </div>

                        {/* Image caption */}
                        <p className="mt-5 text-center text-sm text-gray-500">
                            EP-Tracker i arbete – tid, material, status.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

