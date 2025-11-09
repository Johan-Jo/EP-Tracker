'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const MIN_VISIBLE_MS = 900;
const MAX_VISIBLE_MS = 2500;

let hasShownStartupLoader = false;

export function AppStartupLoader() {
	const initialVisible =
		typeof window === 'undefined' ? !hasShownStartupLoader : !hasShownStartupLoader;
	const [visible, setVisible] = useState(initialVisible);
	const [fadeOut, setFadeOut] = useState(false);
	const startTimeRef = useRef<number | null>(null);
	const hideTimeoutRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (!visible) {
			return;
		}

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
			hasShownStartupLoader = true;
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
			<div className="absolute inset-0 loader-bg" />

			<div className="relative flex h-32 w-32 items-center justify-center">
				<span className="absolute h-full w-full rounded-[32px] loader-glow blur-xl" />

				<span
					className="absolute h-full w-full rounded-3xl border loader-ring animate-[spin_2000ms_linear_infinite]"
				/>

				<span
					className="absolute h-20 w-20 rounded-full loader-core animate-pulse"
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

				.loader-bg {
					background: #ffffff;
				}

				.loader-glow {
					background: rgba(255, 255, 255, 0.8);
				}

				.loader-ring {
					border-color: rgba(226, 232, 240, 1);
					background: transparent;
				}

				.loader-core {
					background: linear-gradient(
						145deg,
						rgba(191, 219, 254, 0.8),
						#ffffff,
						rgba(191, 219, 254, 0.9)
					);
					box-shadow: 0 0 35px rgba(59, 130, 246, 0.25);
				}

				:global(html.dark) .loader-bg {
					background: #000000;
				}

				:global(html.dark) .loader-glow {
					background: rgba(30, 41, 59, 0.7);
				}

				:global(html.dark) .loader-ring {
					border-color: rgba(51, 65, 85, 0.85);
				}

				:global(html.dark) .loader-core {
					background: linear-gradient(
						150deg,
						rgba(30, 41, 59, 0.9),
						rgba(15, 23, 42, 1),
						rgba(30, 41, 59, 0.85)
					);
					box-shadow: 0 0 40px rgba(59, 130, 246, 0.35);
				}
			`}</style>
		</div>
	);
}


