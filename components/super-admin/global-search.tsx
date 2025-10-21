'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Users, Building2, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: 'user' | 'organization';
  id: string;
  title: string;
  subtitle: string;
  status?: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Search functionality
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        // Search users and organizations
        const response = await fetch(`/api/super-admin/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(searchTimeout);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'user') {
      router.push('/super-admin/users');
    } else if (result.type === 'organization') {
      router.push(`/super-admin/organizations/${result.id}`);
    }
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-100"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-300 sm:inline-block">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          setIsOpen(false);
          setQuery('');
        }}
      />

      {/* Search Modal */}
      <div className="fixed left-1/2 top-20 z-50 w-full max-w-2xl -translate-x-1/2 rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search users, organizations..."
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-500 outline-none dark:text-white dark:placeholder-gray-400"
          />
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          <button
            onClick={() => {
              setIsOpen(false);
              setQuery('');
            }}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2" ref={resultsRef}>
          {query.trim().length < 2 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-orange-50 dark:bg-orange-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    result.type === 'user'
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                  )}
                >
                  {result.type === 'user' ? (
                    <Users className="h-5 w-5" />
                  ) : (
                    <Building2 className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{result.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</div>
                </div>
                {result.status && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      result.status === 'active' &&
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                      result.status === 'trial' &&
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                      result.status === 'suspended' &&
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                      result.status === 'deleted' &&
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {result.status}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <div className="flex gap-4">
              <span>
                <kbd className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">↑↓</kbd> Navigate
              </span>
              <span>
                <kbd className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">↵</kbd> Select
              </span>
              <span>
                <kbd className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-800">esc</kbd> Close
              </span>
            </div>
            <span>{results.length} results</span>
          </div>
        )}
      </div>
    </>
  );
}

