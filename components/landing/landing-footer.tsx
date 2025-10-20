export function LandingFooter() {
    return (
        <footer className="border-t-2 border-gray-800 bg-black">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="text-center">
                    <div className="mb-4 text-2xl font-bold text-white">EP-Tracker</div>
                    <p className="text-base text-gray-300">Byggt för svenska hantverkare</p>
                </div>

                <div className="mt-12 border-t-2 border-gray-800 pt-8">
                    <p className="text-center text-base text-gray-400">
                        © {new Date().getFullYear()} EP-Tracker - en EstimatePro AB produkt – byggt
                        för svenska hantverkare
                    </p>
                </div>
            </div>
        </footer>
    );
}

