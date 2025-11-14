'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';

interface GeoapifyResult {
	properties: {
		formatted: string;
		address_line1: string;
		address_line2?: string;
		postcode: string;
		city: string;
		country: string;
		lat: number;
		lon: number;
	};
}

interface AddressAutocompleteProps {
	value: string;
	onChange: (value: string) => void;
	onSelect: (address: {
		address_line1: string;
		address_line2?: string;
		postal_code: string;
		city: string;
		country: string;
		lat: number;
		lon: number;
	}) => void;
	placeholder?: string;
	disabled?: boolean;
	id?: string;
	name?: string;
	autoComplete?: string;
}

function getGeoapifyKey() {
	if (typeof window !== 'undefined') {
		// Client-side: read from env (injected at build time)
		return process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
	}
	return process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
}

export function AddressAutocomplete({
	value,
	onChange,
	onSelect,
	placeholder = 'Sök adress...',
	disabled,
	id,
	name,
	autoComplete,
}: AddressAutocompleteProps) {
	const [suggestions, setSuggestions] = useState<GeoapifyResult[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [loading, setLoading] = useState(false);
	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const containerRef = useRef<HTMLDivElement>(null);
	const suggestionsRef = useRef<GeoapifyResult[]>([]);
	const isFocusedRef = useRef(false);

	// Sync suggestionsRef with suggestions state
	useEffect(() => {
		suggestionsRef.current = suggestions;
	}, [suggestions]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setShowSuggestions(false);
				isFocusedRef.current = false;
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const fetchSuggestions = async (query: string) => {
		if (!query || query.length < 3) {
			setSuggestions([]);
			suggestionsRef.current = [];
			setShowSuggestions(false);
			return;
		}

		const apiKey = getGeoapifyKey();
		if (!apiKey) {
			console.error('Geoapify API key is missing. Make sure NEXT_PUBLIC_GEOAPIFY_API_KEY is set in .env.local');
			return;
		}

		setLoading(true);
		// Keep suggestions visible while loading new ones
		const hadSuggestions = suggestionsRef.current.length > 0;
		try {
			const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${apiKey}&limit=5&countrycodes=se,no,dk,fi&lang=sv`;
			const response = await fetch(url);
			const data = await response.json();
			if (data.features && Array.isArray(data.features) && data.features.length > 0) {
				setSuggestions(data.features);
				suggestionsRef.current = data.features;
				setShowSuggestions(true);
			} else {
				// If no results, keep previous suggestions visible if they exist and input is focused
				if (hadSuggestions && isFocusedRef.current) {
					setShowSuggestions(true);
				} else {
					setShowSuggestions(false);
				}
			}
		} catch (error) {
			console.error('Geoapify error:', error);
			// On error, keep previous suggestions visible if they exist and input is focused
			if (hadSuggestions && isFocusedRef.current) {
				setShowSuggestions(true);
			} else {
				setShowSuggestions(false);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		onChange(newValue);

		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		// If query is too short, clear suggestions immediately
		if (newValue.length < 3) {
			setSuggestions([]);
			suggestionsRef.current = [];
			setShowSuggestions(false);
			return;
		}

		// Keep suggestions visible while typing (if we have any)
		if (suggestionsRef.current.length > 0 && isFocusedRef.current) {
			setShowSuggestions(true);
		}

		// Debounce the API call but keep suggestions visible while typing
		timeoutRef.current = setTimeout(() => {
			fetchSuggestions(newValue);
		}, 200);
	};

	const handleSelect = (result: GeoapifyResult) => {
		const props = result.properties;
		onChange(props.formatted);
		onSelect({
			address_line1: props.address_line1 || props.formatted.split(',')[0] || '',
			address_line2: props.address_line2 || undefined,
			postal_code: props.postcode || '',
			city: props.city || '',
			country: props.country || 'Sverige',
			lat: props.lat,
			lon: props.lon,
		});
		setShowSuggestions(false);
		setSuggestions([]);
		suggestionsRef.current = [];
	};

	return (
		<div ref={containerRef} className='relative w-full'>
			<div className='relative'>
				<Input
					id={id}
					name={name}
					autoComplete={autoComplete}
					value={value}
					onChange={handleInputChange}
					onFocus={() => {
						isFocusedRef.current = true;
						if (suggestionsRef.current.length > 0) {
							setShowSuggestions(true);
						}
					}}
					onBlur={() => {
						// Don't hide immediately on blur - let click handler do it
						// This allows clicking on suggestions
						setTimeout(() => {
							if (!containerRef.current?.contains(document.activeElement)) {
								isFocusedRef.current = false;
							}
						}, 200);
					}}
					placeholder={placeholder}
					disabled={disabled}
				/>
				{loading && (
					<div className='absolute right-3 top-1/2 -translate-y-1/2'>
						<Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
					</div>
				)}
			</div>
			{((showSuggestions && suggestions.length > 0) || (isFocusedRef.current && suggestionsRef.current.length > 0)) && (
				<ul className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border/60 bg-[var(--color-card)] shadow-lg dark:border-[#3a251d] dark:bg-[#1f140d]'>
					{(suggestions.length > 0 ? suggestions : suggestionsRef.current).map((result, idx) => (
						<li
							key={idx}
							className='flex cursor-pointer items-start gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted dark:text-white dark:hover:bg-white/10'
							onClick={() => handleSelect(result)}
						>
							<MapPin className='mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground dark:text-white/70' />
							<span>{result.properties.formatted}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
