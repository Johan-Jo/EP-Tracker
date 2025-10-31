'use client';

import { Quote } from 'lucide-react';

const testimonials = [
    {
        quote: 'Röstfunktionen är genial. Vi sparar X timmar/vecka och får rapporter i rätt svenska – även när hantverkarna talar polska eller arabiska.',
        author: 'Sara L.',
        role: 'VD, Byggservice Stockholm'
    },
    {
        quote: 'Offline-läget räddar oss på varenda källare och parkeringsdäck. Ingen tid går förlorad.',
        author: 'Jonas P.',
        role: 'Arbetsledare, VVS-projekt'
    },
    {
        quote: 'Äntligen ett system som är byggt för oss, inte mot oss. Från planering till attest – allt i en app.',
        author: 'Maria K.',
        role: 'Platschef, Renoveringsprojekt'
    }
];

export function Testimonials() {
    return (
        <section className="bg-white py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Kundcitat
                    </h2>
                </div>
                
                <div className="mx-auto mt-20 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {testimonials.map((testimonial, index) => (
                        <div 
                            key={index}
                            className="relative rounded-3xl border-2 border-gray-200 bg-gradient-to-br from-white to-orange-50 p-10 shadow-xl transition-all hover:border-orange-300 hover:shadow-2xl"
                        >
                            <div className="absolute -left-4 -top-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                                <Quote className="h-6 w-6 text-white" />
                            </div>
                            
                            <blockquote className="mb-8 mt-4 text-xl font-medium leading-relaxed text-gray-900">
                                "{testimonial.quote}"
                            </blockquote>
                            
                            <div className="flex items-center gap-4 border-t-2 border-gray-200 pt-6">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-200 to-orange-300 text-lg font-bold text-orange-800">
                                    {testimonial.author.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900">
                                        {testimonial.author}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {testimonial.role}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

