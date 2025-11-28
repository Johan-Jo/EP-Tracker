'use client';

/**
 * Demo Mode Context
 * 
 * Manages demo mode state for both anonymous demo access and example org mode.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type DemoMode = 'anonymous' | 'exampleOrg' | 'none';

interface DemoContextValue {
	mode: DemoMode;
	demoOrgId: string | null;
	setMode: (mode: DemoMode) => void;
	isDemoMode: boolean;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

const EXAMPLE_MODE_STORAGE_KEY = 'exampleModeEnabled';

interface DemoProviderProps {
	children: React.ReactNode;
	demoOrgId: string | null;
	initialMode?: DemoMode;
}

export function DemoProvider({ children, demoOrgId, initialMode = 'none' }: DemoProviderProps) {
	const [mode, setModeState] = useState<DemoMode>(initialMode);
	const [isExampleModeEnabled, setIsExampleModeEnabled] = useState(false);

	// Load example mode from localStorage on mount
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem(EXAMPLE_MODE_STORAGE_KEY);
			if (stored === 'true' && demoOrgId) {
				setIsExampleModeEnabled(true);
				setModeState('exampleOrg');
			}
		}
	}, [demoOrgId]);

	const setMode = useCallback((newMode: DemoMode) => {
		setModeState(newMode);
		
		if (typeof window !== 'undefined') {
			if (newMode === 'exampleOrg') {
				localStorage.setItem(EXAMPLE_MODE_STORAGE_KEY, 'true');
				setIsExampleModeEnabled(true);
			} else {
				localStorage.removeItem(EXAMPLE_MODE_STORAGE_KEY);
				setIsExampleModeEnabled(false);
			}
		}
	}, []);

	const value: DemoContextValue = {
		mode,
		demoOrgId,
		setMode,
		isDemoMode: mode !== 'none',
	};

	return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

/**
 * Hook to access demo mode context
 */
export function useDemoMode(): DemoContextValue {
	const context = useContext(DemoContext);
	if (context === undefined) {
		// Return default values when not in demo context
		return {
			mode: 'none',
			demoOrgId: null,
			setMode: () => {},
			isDemoMode: false,
		};
	}
	return context;
}

