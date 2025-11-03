import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TimerEntry {
	id: string;
	project_id: string;
	project_name: string;
	phase_id?: string;
	phase_name?: string;
	work_order_id?: string;
	task_label?: string;
	start_at: string;
}

interface TimerState {
	isRunning: boolean;
	currentEntry: TimerEntry | null;
	recentEntries: TimerEntry[];
	startTimer: (entry: Omit<TimerEntry, 'start_at'>) => void;
	stopTimer: () => void;
	switchTask: (entry: Omit<TimerEntry, 'start_at'>) => Promise<void>;
	addRecentEntry: (entry: TimerEntry) => void;
	clearRecentEntries: () => void;
	getElapsedSeconds: () => number;
}

export const useTimerStore = create<TimerState>()(
	persist(
		(set, get) => ({
			isRunning: false,
			currentEntry: null,
			recentEntries: [],

			startTimer: (entry) => {
				const startTime = new Date().toISOString();
				const fullEntry = {
					...entry,
					start_at: startTime,
				};
				
				set({
					isRunning: true,
					currentEntry: fullEntry,
				});

				// Add to recent entries
				get().addRecentEntry(fullEntry);
			},

			stopTimer: () => {
				const current = get().currentEntry;
				if (current) {
					// Keep in recent entries when stopped
					get().addRecentEntry(current);
				}
				
				set({
					isRunning: false,
					currentEntry: null,
				});
			},

			switchTask: async (entry) => {
				const current = get().currentEntry;
				
				// Stop current timer if running
				if (current && get().isRunning) {
					get().stopTimer();
					
					// Small delay to ensure stop is processed
					await new Promise(resolve => setTimeout(resolve, 100));
				}

				// Start new timer
				get().startTimer(entry);
			},

			addRecentEntry: (entry) => {
				set((state) => {
					// Keep only unique entries (by project_id + phase_id combination)
					const filtered = state.recentEntries.filter(
						e => !(e.project_id === entry.project_id && e.phase_id === entry.phase_id)
					);
					
					// Add new entry at the start, keep max 10
					return {
						recentEntries: [entry, ...filtered].slice(0, 10),
					};
				});
			},

			clearRecentEntries: () => set({ recentEntries: [] }),

			getElapsedSeconds: () => {
				const { isRunning, currentEntry } = get();
				if (!isRunning || !currentEntry) return 0;

				const start = new Date(currentEntry.start_at);
				const now = new Date();
				return Math.floor((now.getTime() - start.getTime()) / 1000);
			},
		}),
		{
			name: 'ep-tracker-timer',
		}
	)
);


