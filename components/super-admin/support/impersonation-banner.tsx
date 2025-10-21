'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { ImpersonationSession } from '@/lib/super-admin/impersonation';

interface ImpersonationBannerProps {
	session: ImpersonationSession;
}

export function ImpersonationBanner({ session }: ImpersonationBannerProps) {
	const [loading, setLoading] = useState(false);

	async function handleExit() {
		setLoading(true);
		try {
			const response = await fetch('/api/super-admin/support/exit-impersonate', {
				method: 'POST',
			});

			if (!response.ok) {
				throw new Error('Kunde inte avsluta impersonation');
			}

			const data = await response.json();
			toast.success('Impersonation avslutad');

			// Redirect back to super admin
			window.location.href = data.redirect || '/super-admin';
		} catch (error) {
			console.error('Error exiting impersonation:', error);
			toast.error('Kunde inte avsluta impersonation');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="fixed top-0 left-0 right-0 z-[9999] bg-orange-600 text-white py-2 px-4">
			<div className="container mx-auto flex items-center justify-between">
				<div className="flex items-center gap-2">
					<AlertTriangle className="w-5 h-5" />
					<span className="font-medium">
						Impersonation Mode: Du är inloggad som {session.user_name} ({session.user_email}) från {session.org_name}
					</span>
				</div>
				<Button
					onClick={handleExit}
					disabled={loading}
					variant="outline"
					size="sm"
					className="bg-white text-orange-600 hover:bg-gray-100"
				>
					<X className="w-4 h-4 mr-2" />
					{loading ? 'Avslutar...' : 'Avsluta Impersonation'}
				</Button>
			</div>
		</div>
	);
}

