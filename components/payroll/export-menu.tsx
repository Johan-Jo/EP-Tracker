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
import { Download, Loader2 } from 'lucide-react';

type ExportMenuProps = {
	onExport: (format: 'csv' | 'paxml' | 'pdf', scope: 'all' | 'locked' | 'selected') => void;
	onExportFortnox?: (scope: 'all' | 'locked' | 'selected') => void;
	hasFortnoxConnection?: boolean;
	isExportingToFortnox?: boolean;
};

export function ExportMenu({
	onExport,
	onExportFortnox,
	hasFortnoxConnection = false,
	isExportingToFortnox = false,
}: ExportMenuProps) {
	console.log('[ExportMenu] Render with props:', {
		hasFortnoxConnection,
		hasOnExportFortnox: !!onExportFortnox,
		isExportingToFortnox,
	});

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
				{hasFortnoxConnection && onExportFortnox && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuSub>
							<DropdownMenuSubTrigger className='text-emerald-600 focus:text-emerald-700'>
								Fortnox
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent>
									<DropdownMenuItem
										onClick={() => {
											console.log('[ExportMenu] ==========================================');
											console.log('[ExportMenu] Fortnox export clicked: locked');
											console.log('[ExportMenu] onExportFortnox function:', typeof onExportFortnox);
											console.log('[ExportMenu] isExportingToFortnox:', isExportingToFortnox);
											if (onExportFortnox) {
												console.log('[ExportMenu] Calling onExportFortnox("locked") NOW');
												onExportFortnox('locked');
												console.log('[ExportMenu] onExportFortnox("locked") called successfully');
											} else {
												console.error('[ExportMenu] onExportFortnox is not defined!');
											}
										}}
										disabled={isExportingToFortnox}
									>
										{isExportingToFortnox ? (
											<>
												<Loader2 className='mr-2 h-4 w-4 animate-spin' />
												Exporterar...
											</>
										) : (
											'Endast låsta'
										)}
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => {
											console.log('[ExportMenu] ==========================================');
											console.log('[ExportMenu] Fortnox export clicked: selected');
											console.log('[ExportMenu] onExportFortnox function:', typeof onExportFortnox);
											console.log('[ExportMenu] isExportingToFortnox:', isExportingToFortnox);
											if (onExportFortnox) {
												console.log('[ExportMenu] Calling onExportFortnox("selected") NOW');
												onExportFortnox('selected');
												console.log('[ExportMenu] onExportFortnox("selected") called successfully');
											} else {
												console.error('[ExportMenu] onExportFortnox is not defined!');
											}
										}}
										disabled={isExportingToFortnox}
									>
										{isExportingToFortnox ? (
											<>
												<Loader2 className='mr-2 h-4 w-4 animate-spin' />
												Exporterar...
											</>
										) : (
											'Endast markerade'
										)}
									</DropdownMenuItem>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}


