'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/components/core/theme-provider';

const MIN_VISIBLE_MS = 900;
const MAX_VISIBLE_MS = 2500;

export function AppStartupLoader() {
	const { theme } = useTheme();
	const [visible, setVisible] = useState(true);
	const [fadeOut, setFadeOut] = useState(false);
	const startTimeRef = useRef<number | null>(null);
	const hideTimeoutRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		startTimeRef.current = Date.now();

		let finished = false;

		const finalize = () => {
			if (finished) {
				return;
			}

			finished = true;
			setFadeOut(true);

			hideTimeoutRef.current = window.setTimeout(() => {
				setVisible(false);
			}, 450);
		};

		const maybeFinalize = () => {
			const start = startTimeRef.current ?? Date.now();
			const elapsed = Date.now() - start;

			if (elapsed >= MIN_VISIBLE_MS) {
				finalize();
			} else {
				hideTimeoutRef.current = window.setTimeout(finalize, MIN_VISIBLE_MS - elapsed);
			}
		};

		const handleLoad = () => {
			maybeFinalize();
		};

		if (document.readyState === 'complete') {
			maybeFinalize();
		} else {
			window.addEventListener('load', handleLoad, { once: true });
		}

		const maxTimer = window.setTimeout(() => {
			finalize();
		}, MAX_VISIBLE_MS);

		return () => {
			window.removeEventListener('load', handleLoad);
			window.clearTimeout(maxTimer);
			if (hideTimeoutRef.current) {
				window.clearTimeout(hideTimeoutRef.current);
			}
		};
	}, []);

	const isDarkMode = theme === 'dark';

	const backgroundClass = useMemo(
		() => (isDarkMode ? 'bg-black' : 'bg-white'),
		[isDarkMode],
	);

	if (!visible) {
		return null;
	}

	return (
		<div
			aria-hidden
			className={`fixed inset-0 z-[120] flex items-center justify-center transition-opacity duration-500 ${
				fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
			}`}
		>
			<div className={`absolute inset-0 ${backgroundClass}`} />

			<div className="relative flex h-32 w-32 items-center justify-center">
				<span
					className={`absolute h-full w-full rounded-[32px] ${
						isDarkMode ? 'bg-slate-800/70' : 'bg-white/80'
					} blur-xl`}
				/>

				<span
					className={`absolute h-full w-full rounded-3xl border ${
						isDarkMode ? 'border-slate-700/80' : 'border-slate-200'
					} animate-[spin_2000ms_linear_infinite]`}
				/>

				<span
					className={`absolute h-20 w-20 rounded-full ${
						isDarkMode
							? 'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800'
							: 'bg-gradient-to-br from-blue-100 via-white to-blue-50'
					} animate-pulse`}
				/>

				<div className="relative h-12 w-28 animate-[logoPulse_1600ms_ease-in-out_infinite]">
					<Image
						src="/images/EP-Flat.png"
						alt="EP Tracker"
						fill
						sizes="112px"
						priority
					/>
				</div>
			</div>

			<style jsx>{`
				@keyframes logoPulse {
					0%,
					100% {
						transform: scale(1);
						opacity: 0.92;
					}
					45% {
						transform: scale(1.06);
						opacity: 1;
					}
					80% {
						transform: scale(0.98);
						opacity: 0.9;
					}
				}
			`}</style>
		</div>
	);
}


