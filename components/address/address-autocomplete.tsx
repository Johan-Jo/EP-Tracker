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

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setShowSuggestions(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const fetchSuggestions = async (query: string) => {
		if (!query || query.length < 3) {
			setSuggestions([]);
			setShowSuggestions(false);
			return;
		}

		const apiKey = getGeoapifyKey();
		if (!apiKey) {
			console.error('Geoapify API key is missing. Make sure NEXT_PUBLIC_GEOAPIFY_API_KEY is set in .env.local');
			return;
		}

		setLoading(true);
		try {
			const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&apiKey=${apiKey}&limit=5&countrycodes=se,no,dk,fi&lang=sv`;
			const response = await fetch(url);
			const data = await response.json();
			if (data.features && Array.isArray(data.features)) {
				setSuggestions(data.features);
				setShowSuggestions(true);
			}
		} catch (error) {
			console.error('Geoapify error:', error);
			setSuggestions([]);
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

		timeoutRef.current = setTimeout(() => {
			fetchSuggestions(newValue);
		}, 300);
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
						if (suggestions.length > 0) setShowSuggestions(true);
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
			{showSuggestions && suggestions.length > 0 && (
				<ul className='absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto'>
					{suggestions.map((result, idx) => (
						<li
							key={idx}
							className='px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-start gap-2'
							onClick={() => handleSelect(result)}
						>
							<MapPin className='h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0' />
							<span className='text-sm'>{result.properties.formatted}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
