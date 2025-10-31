'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function NavBar() {
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/95 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-20 items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/" className="text-3xl font-bold tracking-tight text-orange-500">
                            EP-Tracker
                        </Link>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            className="hidden h-11 rounded-full px-6 font-semibold text-white hover:bg-white/10 sm:inline-flex"
                        >
                            Testa gratis
                        </Button>
                        <Link href="/sign-up">
                            <Button
                                className="h-11 rounded-full bg-orange-500 px-6 font-semibold text-white shadow-md hover:bg-orange-600 hover:shadow-lg"
                            >
                                Prova gratis
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

