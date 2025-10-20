import { Clock, Clipboard, ShoppingCart, FileText } from 'lucide-react';

const features = [
    {
        icon: Clock,
        title: 'Tid & frånvaro',
        items: [
            'Start/stop, manuellt',
            'OB/restid/traktamente',
            'Veckogodkännande',
        ],
    },
    {
        icon: Clipboard,
        title: 'Arbetsorder & projekt',
        items: [
            'Checklista, anteckningar och foton',
            'Kundsignatur',
            'Status Planerad → Klar → Fakturerbar',
        ],
    },
    {
        icon: ShoppingCart,
        title: 'Material & kostnader',
        items: ['Kvittoskann', 'Artiklar/antal/pris', 'Prisregister eller import'],
    },
    {
        icon: FileText,
        title: 'Fakturaunderlag',
        items: ['Summering per kund/projekt/typ', 'PDF/CSV', 'Export till Fortnox/Visma'],
    },
];

export function LandingFeatures() {
    return (
        <section className="bg-gray-50 py-20 sm:py-32">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Nyckelfunktioner
                    </h2>
                    <p className="text-xl text-gray-600">
                        Allt du behöver för att driva ditt hantverksföretag
                    </p>
                </div>

                <div className="mx-auto mt-20 grid max-w-6xl gap-8 sm:grid-cols-2">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group rounded-3xl border border-gray-200 bg-white p-10 shadow-lg transition-all hover:border-orange-300 hover:shadow-2xl"
                        >
                            <div className="mb-8 flex items-center gap-5">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg transition-transform group-hover:scale-110">
                                    <feature.icon className="h-8 w-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">{feature.title}</h3>
                            </div>

                            <ul className="space-y-3">
                                {feature.items.map((item, itemIndex) => (
                                    <li key={itemIndex} className="flex items-start gap-3">
                                        <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" />
                                        <span className="text-base text-gray-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

