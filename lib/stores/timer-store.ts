import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimerState {
	isRunning: boolean;
	currentEntry: {
		id: string;
		project_id: string;
		project_name: string;
		phase_id?: string;
		task_label?: string;
		start_at: string;
	} | null;
	startTimer: (entry: {
		id: string;
		project_id: string;
		project_name: string;
		phase_id?: string;
		task_label?: string;
	}) => void;
	stopTimer: () => void;
	switchTask: (entry: {
		id: string;
		project_id: string;
		project_name: string;
		phase_id?: string;
		task_label?: string;
	}) => void;
}

export const useTimerStore = create<TimerState>()(
	persist(
		(set) => ({
			isRunning: false,
			currentEntry: null,
			startTimer: (entry) =>
				set({
					isRunning: true,
					currentEntry: {
						...entry,
						start_at: new Date().toISOString(),
					},
				}),
			stopTimer: () =>
				set({
					isRunning: false,
					currentEntry: null,
				}),
		switchTask: (entry) =>
			set(() => {
				// Stop current timer and start new one
				return {
					isRunning: true,
					currentEntry: {
						...entry,
						start_at: new Date().toISOString(),
					},
				};
			}),
		}),
		{
			name: 'ep-tracker-timer',
		}
	)
);

