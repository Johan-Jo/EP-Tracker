'use client';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';

type ExportMenuProps = {
	onExport: (format: 'csv' | 'paxml' | 'pdf', scope: 'all' | 'locked' | 'selected') => void;
};

export function ExportMenu({ onExport }: ExportMenuProps) {
	return (
		<DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='flex items-center gap-2 min-h-[44px]'>
					<Download className='w-4 h-4' />
					Exportera
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuLabel>Format</DropdownMenuLabel>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>CSV</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent>
							<DropdownMenuItem onClick={() => onExport('csv', 'all')}>Alla</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onExport('csv', 'locked')}>Endast låsta</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onExport('csv', 'selected')}>Endast markerade</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuPortal>
				</DropdownMenuSub>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>PAXml</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent>
							<DropdownMenuItem onClick={() => onExport('paxml', 'all')}>Alla</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onExport('paxml', 'locked')}>Endast låsta</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onExport('paxml', 'selected')}>Endast markerade</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuPortal>
				</DropdownMenuSub>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => onExport('pdf', 'locked')}>PDF (endast låsta)</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}


