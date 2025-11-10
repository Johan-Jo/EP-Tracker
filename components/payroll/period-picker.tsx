'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PeriodPickerValue = { start: string; end: string };

type PeriodPickerProps = {
	value: PeriodPickerValue;
	onChange: (value: PeriodPickerValue) => void;
};

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
	const setMonth = (offset = 0) => {
		const now = new Date();
		const year = now.getFullYear();
		const monthIndex = now.getMonth() + offset;
		const start = new Date(year, monthIndex, 1);
		const end = new Date(year, monthIndex + 1, 0);
		onChange({
			start: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`,
			end: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
		});
	};

	return (
		<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
			<div>
				<Label className='text-xs'>Period från</Label>
				<Input
					type='date'
					className='min-h-[44px]'
					value={value.start}
					onChange={(event) => onChange({ ...value, start: event.target.value })}
				/>
			</div>
			<div>
				<Label className='text-xs'>Period till</Label>
				<Input
					type='date'
					className='min-h-[44px]'
					value={value.end}
					onChange={(event) => onChange({ ...value, end: event.target.value })}
				/>
			</div>
			<div className='col-span-1 flex gap-2 sm:col-span-2'>
				<Button variant='outline' className='min-h-[44px] grow' onClick={() => setMonth(0)}>
					Denna månad
				</Button>
				<Button variant='outline' className='min-h-[44px] grow' onClick={() => setMonth(-1)}>
					Föreg. månad
				</Button>
			</div>
		</div>
	);
}


