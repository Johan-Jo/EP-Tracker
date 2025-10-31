'use client';

import { Button } from '@/components/ui/button';

export function CTASection() {
    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 to-orange-700 py-24 sm:py-40">
            {/* Decorative circles */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl" />
            
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="mb-8 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Kom igång idag – bygg smartare imorgon
                    </h2>
                    
                    <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <Button 
                            size="lg"
                            variant="outline"
                            className="h-16 w-full rounded-full border-2 border-white bg-transparent px-12 text-xl font-bold text-white transition-all duration-300 hover:bg-white/10 sm:w-auto"
                        >
                            Prova gratis
                        </Button>
                    </div>
                    
                    <p className="mt-8 text-lg text-orange-100">
                        Kom igång på minuter – interaktiva guider ingår
                    </p>
                </div>
            </div>
        </section>
    );
}

