'use client';

const audiences = [
    'Byggföretag (SMB → större)',
    'Arbetsledare & Platschefer',
    'Ekonomiansvariga',
    'Fältarbetare',
    'Måleri & Golv',
    'VVS & El',
    'Byggservice',
    'Entreprenörer med underleverantörer'
];

export function AudienceChips() {
    return (
        <section className="bg-gray-50 py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <h3 className="mb-10 text-center text-2xl font-bold text-gray-900">
                    För vem?
                </h3>
                
                <div className="flex flex-wrap items-center justify-center gap-4">
                    {audiences.map((audience, index) => (
                        <div 
                            key={index}
                            className="rounded-2xl border-2 border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-800 shadow-sm transition-all hover:border-orange-300 hover:shadow-md"
                        >
                            {audience}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}







