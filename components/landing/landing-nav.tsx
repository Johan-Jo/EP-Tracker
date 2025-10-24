'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export function LandingNav() {
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/95 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-20 items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/images/eptrackerfront.png"
                                alt="EP-Tracker"
                                width={200}
                                height={50}
                                className="h-auto w-auto"
                                priority
                            />
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/sign-in">
                            <Button
                                variant="ghost"
                                className="font-semibold text-gray-300 hover:text-orange-500"
                            >
                                Logga in
                            </Button>
                        </Link>
                        <Link href="/sign-up">
                            <Button className="h-11 rounded-full bg-orange-500 px-6 font-semibold text-white shadow-md hover:bg-orange-600 hover:shadow-lg">
                                Prova gratis
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

