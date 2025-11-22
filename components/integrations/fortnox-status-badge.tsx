'use client';

import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FortnoxStatusBadgeProps {
	/** Har orgen en aktiv Fortnox-anslutning? */
	hasFortnoxConnection: boolean;
	/** Har tokenet rätt scope (t.ex. salary för löneunderlag)? */
	hasRequiredScope?: boolean;
}

/**
 * Återanvändbar badge-komponent som visar Fortnox-anslutningsstatus
 * Samma design som används på personalsidan
 */
export function FortnoxStatusBadge({ hasFortnoxConnection, hasRequiredScope }: FortnoxStatusBadgeProps) {
	if (hasFortnoxConnection && hasRequiredScope !== false) {
		// Ansluten och har rätt scope (eller scope inte relevant)
		return (
			<Badge variant='outline' className='flex items-center gap-1'>
				<CheckCircle2 className='h-3 w-3 text-emerald-500' />
				Fortnox anslutet
			</Badge>
		);
	} else if (hasFortnoxConnection && hasRequiredScope === false) {
		// Ansluten men saknar rätt scope
		return (
			<Badge variant='outline' className='flex items-center gap-1 text-amber-600 border-amber-300'>
				<Info className='h-3 w-3' />
				Ej anslutet
			</Badge>
		);
	} else {
		// Inte ansluten
		return (
			<Badge variant='outline' className='flex items-center gap-1 text-amber-600 border-amber-300'>
				<XCircle className='h-3 w-3' />
				Ej anslutet
			</Badge>
		);
	}
}

