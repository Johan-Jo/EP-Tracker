'use client';

import { useEffect } from 'react';
import { setSwedishErrorMap } from '@/lib/validation/swedish-error-map';

/**
 * Initialize Zod with Swedish error messages
 * This component should be placed once at the root layout
 */
export function ZodInit() {
	useEffect(() => {
		// Set Swedish error map globally
		setSwedishErrorMap();
	}, []);

	return null;
}

