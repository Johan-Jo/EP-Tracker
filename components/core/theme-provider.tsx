'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveInitialTheme(): Theme {
	if (typeof window === 'undefined') {
		// På servern vet vi inte användarens preferens ännu – defaulta till light.
		return 'light';
	}

	const stored = window.localStorage.getItem('theme');
	if (stored === 'light' || stored === 'dark') {
		return stored;
	}

	// Om inget är sparat ännu – följ systemets preferens.
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(() => resolveInitialTheme());
	const [hasHydrated, setHasHydrated] = useState(false);

	// Efter första client-render: läs tema från profil (om inloggad) och synka med localStorage
	useEffect(() => {
		let cancelled = false;

		async function loadProfileTheme() {
			try {
				const res = await fetch('/api/profile/theme', { cache: 'no-store' });
				if (!res.ok) return;
				const data = await res.json().catch(() => ({}));
				if (cancelled) return;

				if (data?.theme === 'light' || data?.theme === 'dark') {
					setThemeState(data.theme);
					window.localStorage.setItem('theme', data.theme);
				}
			} catch (error) {
				console.error('Failed to load profile theme', error);
			} finally {
				if (!cancelled) {
					setHasHydrated(true);
				}
			}
		}

		loadProfileTheme();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		const isDark = theme === 'dark';

		root.classList.toggle('dark', isDark);
		root.style.colorScheme = isDark ? 'dark' : 'light';
		window.localStorage.setItem('theme', theme);

		// När vi är hydratiserade: spara också temat till profilen i bakgrunden
		if (hasHydrated) {
			void fetch('/api/profile/theme', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ theme }),
			}).catch((err) => console.error('Failed to save profile theme', err));
		}
	}, [theme, hasHydrated]);

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

