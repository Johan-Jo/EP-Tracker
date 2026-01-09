'use client';

import { Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useDemoMode } from '@/lib/demo/demo-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DemoBanner() {
	const { mode, setMode } = useDemoMode();
	const [dismissed, setDismissed] = useState(false);
	const [isToggling, setIsToggling] = useState(false);
	const router = useRouter();

	// Don't show if not in demo mode or dismissed
	if (mode === 'none' || dismissed) {
		return null;
	}

	const isExampleMode = mode === 'exampleOrg';

	const handleBackToAccount = async () => {
		if (isToggling) return;
		
		setIsToggling(true);
		try {
			const res = await fetch('/api/demo/toggle-example-mode', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ enabled: false }),
			});

			if (res.ok) {
				setMode('none');
				router.refresh();
			} else {
				console.error('Failed to toggle example mode');
			}
		} catch (error) {
			console.error('Error toggling example mode:', error);
		} finally {
			setIsToggling(false);
		}
	};

	return (
		<div className="fixed top-0 left-0 right-0 z-[9998] bg-blue-600 text-white py-2 px-4 shadow-md">
			<div className="container mx-auto flex items-center justify-between gap-4">
				<div className="flex items-center gap-2 flex-1">
					<Info className="w-5 h-5 flex-shrink-0" />
					<span className="font-medium text-sm md:text-base">
						{isExampleMode
							? 'Du visar exempeldata – inte ditt riktiga konto'
							: 'Du använder nu demo-läge. All data är exempeldata.'}
					</span>
				</div>
				<div className="flex items-center gap-2">
					{isExampleMode ? (
						<Button
							onClick={handleBackToAccount}
							disabled={isToggling}
							variant="outline"
							size="sm"
							className="bg-white text-blue-600 hover:bg-gray-100"
						>
							{isToggling ? 'Växlar...' : 'Tillbaka till mitt konto'}
						</Button>
					) : (
						<Button
							asChild
							variant="outline"
							size="sm"
							className="bg-white text-blue-600 hover:bg-gray-100"
						>
							<Link href="/sign-up">
								Redo att prova med dina egna projekt? Skapa konto gratis.
							</Link>
						</Button>
					)}
					<Button
						onClick={() => setDismissed(true)}
						variant="ghost"
						size="sm"
						className="text-white hover:bg-blue-700"
						aria-label="Stäng"
					>
						<X className="w-4 h-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}

