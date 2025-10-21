'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, User, Building2 } from 'lucide-react';
import type { SearchResult } from '@/lib/super-admin/search';

export function GlobalSearch() {
	const router = useRouter();
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	useEffect(() => {
		const delayDebounceFn = setTimeout(() => {
			if (query.length >= 2) {
				fetchResults();
			} else {
				setResults([]);
				setIsOpen(false);
			}
		}, 300);

		return () => clearTimeout(delayDebounceFn);
	}, [query]);

	async function fetchResults() {
		setLoading(true);
		try {
			const response = await fetch(`/api/super-admin/support/search?q=${encodeURIComponent(query)}`);
			if (response.ok) {
				const data = await response.json();
				setResults(data.results);
				setIsOpen(true);
			}
		} catch (error) {
			console.error('Error searching:', error);
		} finally {
			setLoading(false);
		}
	}

	function handleSelect(result: SearchResult) {
		if (result.type === 'user') {
			// Navigate to organization page and scroll to user
			if (result.metadata?.org_id) {
				router.push(`/super-admin/organizations/${result.metadata.org_id}`);
			}
		} else if (result.type === 'organization') {
			router.push(`/super-admin/organizations/${result.id}`);
		}
		setIsOpen(false);
		setQuery('');
	}

	return (
		<div ref={wrapperRef} className="relative w-full max-w-md">
			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
				<Input
					type="text"
					placeholder="Sök användare eller organisationer..."
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					className="pl-10"
				/>
			</div>

			{isOpen && results.length > 0 && (
				<div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-950 border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
					{results.map((result) => (
						<button
							key={`${result.type}-${result.id}`}
							onClick={() => handleSelect(result)}
							className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
						>
							{result.type === 'user' ? (
								<User className="w-5 h-5 text-blue-500 flex-shrink-0" />
							) : (
								<Building2 className="w-5 h-5 text-green-500 flex-shrink-0" />
							)}
							<div className="flex-1 min-w-0">
								<div className="font-medium text-sm truncate">{result.title}</div>
								<div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
							</div>
						</button>
					))}
				</div>
			)}

			{isOpen && loading && (
				<div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-950 border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
					Söker...
				</div>
			)}

			{isOpen && !loading && query.length >= 2 && results.length === 0 && (
				<div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-950 border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
					Inga resultat hittades
				</div>
			)}
		</div>
	);
}

