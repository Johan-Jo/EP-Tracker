'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveInitialTheme(): Theme {
	if (typeof window === 'undefined') {
		return 'light';
	}

	const stored = window.localStorage.getItem('theme');
	if (stored === 'light' || stored === 'dark') {
		return stored;
	}

	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());

	useEffect(() => {
		const root = document.documentElement;
		const isDark = theme === 'dark';

		root.classList.toggle('dark', isDark);
		root.style.colorScheme = isDark ? 'dark' : 'light';
		window.localStorage.setItem('theme', theme);
	}, [theme]);

	useEffect(() => {
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const listener = (event: MediaQueryListEvent) => {
			const stored = window.localStorage.getItem('theme');
			if (stored !== 'light' && stored !== 'dark') {
				setThemeState(event.matches ? 'dark' : 'light');
			}
		};

		media.addEventListener('change', listener);
		return () => media.removeEventListener('change', listener);
	}, []);

	const value = useMemo<ThemeContextValue>(
		() => ({
			theme,
			setTheme: (next) => setThemeState(next),
			toggleTheme: () =>
				setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
		}),
		[theme],
	);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeContext);

	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}

	return context;
}

