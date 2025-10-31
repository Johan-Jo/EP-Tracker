'use client';

export function Footer() {
    return (
        <footer className="border-t-2 border-gray-200 bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="text-center">
                    <div className="mb-4 text-2xl font-bold text-gray-900">
                        EP-Tracker
                    </div>
                    <p className="mb-8 text-base text-gray-700">
                        Allt ni behöver för tid, planering och projekt i fält – byggt för Sverige
                    </p>

                    {/* Internal Links */}
                    <div className="mb-8 flex flex-wrap items-center justify-center gap-6 text-base text-gray-600">
                        <a href="#tid" className="transition-colors hover:text-orange-600">Tid</a>
                        <span className="text-gray-400">•</span>
                        <a href="#planering" className="transition-colors hover:text-orange-600">Planering</a>
                        <span className="text-gray-400">•</span>
                        <a href="#dagbok" className="transition-colors hover:text-orange-600">Dagbok</a>
                        <span className="text-gray-400">•</span>
                        <a href="#attest" className="transition-colors hover:text-orange-600">Attest</a>
                        <span className="text-gray-400">•</span>
                        <a href="#export" className="transition-colors hover:text-orange-600">Export</a>
                    </div>
                </div>
                
                <div className="mt-12 border-t-2 border-gray-200 pt-8">
                    <p className="text-center text-base text-gray-600">
                        © {new Date().getFullYear()} EP-Tracker - en EstimatePro AB produkt
                    </p>
                </div>
            </div>
        </footer>
    );
}

