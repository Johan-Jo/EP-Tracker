'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/core/theme-provider';

export function DarkModeToggle() {
	const { theme, toggleTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const isDark = mounted ? theme === 'dark' : false;
	const ariaLabel = mounted
		? isDark
			? 'Växla till ljust läge'
			: 'Växla till mörkt läge'
		: 'Växla tema';

	return (
		<Button
			variant='ghost'
			size='icon'
			onClick={toggleTheme}
			className='relative h-10 w-10 rounded-full transition-colors hover:bg-white/10 dark:hover:bg-white/10'
			aria-label={ariaLabel}
		>
			<Sun className='h-5 w-5 rotate-0 scale-100 text-orange-400 transition-all dark:-rotate-90 dark:scale-0' />
			<Moon className='absolute h-5 w-5 rotate-90 scale-0 text-gray-400 transition-all dark:rotate-0 dark:scale-100' />
		</Button>
	);
}

export default DarkModeToggle;

