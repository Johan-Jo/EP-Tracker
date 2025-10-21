import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/get-session';
import { createClient } from '@/lib/supabase/server';
import JSZip from 'jszip';

export async function GET(request: NextRequest) {
	try {
		const { user, membership } = await getSession();

		if (!user || !membership) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Only admin and foreman can export attachments
		if (membership.role !== 'admin' && membership.role !== 'foreman') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const startDate = searchParams.get('start');
		const endDate = searchParams.get('end');

		if (!startDate || !endDate) {
			return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
		}

		const supabase = await createClient();
		const zip = new JSZip();

		// Track stats
		let totalFiles = 0;

		// 1. Fetch material photos
		const { data: materials } = await supabase
			.from('materials')
			.select(`
				id,
				description,
				photo_url,
				created_at,
				project:projects(name, project_number)
			`)
			.eq('org_id', membership.org_id)
			.eq('status', 'approved')
			.gte('created_at', startDate)
			.lte('created_at', endDate)
			.not('photo_url', 'is', null);

		if (materials && materials.length > 0) {
			const materialFolder = zip.folder('material');
			if (materialFolder) {
				for (const material of materials) {
					if (material.photo_url) {
						try {
							const imageData = await downloadImage(material.photo_url);
							const fileName = getFileName(
								material.photo_url,
								`${material.project?.project_number || 'unknown'}_${material.description}`
							);
							materialFolder.file(fileName, imageData);
							totalFiles++;
						} catch (error) {
							console.error(`Failed to download material photo ${material.photo_url}:`, error);
						}
					}
				}
			}
		}

		// 2. Fetch expense photos (receipts)
		const { data: expenses } = await supabase
			.from('expenses')
			.select(`
				id,
				description,
				receipt_url,
				created_at,
				project:projects(name, project_number)
			`)
			.eq('org_id', membership.org_id)
			.eq('status', 'approved')
			.gte('created_at', startDate)
			.lte('created_at', endDate)
			.not('receipt_url', 'is', null);

		if (expenses && expenses.length > 0) {
			const expenseFolder = zip.folder('utlagg');
			if (expenseFolder) {
				for (const expense of expenses) {
					if (expense.receipt_url) {
						try {
							const imageData = await downloadImage(expense.receipt_url);
							const fileName = getFileName(
								expense.receipt_url,
								`kvitto_${expense.project?.project_number || 'unknown'}_${expense.description}`
							);
							expenseFolder.file(fileName, imageData);
							totalFiles++;
						} catch (error) {
							console.error(`Failed to download expense receipt ${expense.receipt_url}:`, error);
						}
					}
				}
			}
		}

		// 3. Fetch diary photos
		const { data: diaries } = await supabase
			.from('diary_entries')
			.select(`
				id,
				entry_date,
				project:projects(name, project_number)
			`)
			.eq('org_id', membership.org_id)
			.gte('entry_date', startDate)
			.lte('entry_date', endDate);

		if (diaries && diaries.length > 0) {
			const diaryFolder = zip.folder('dagbok');
			if (diaryFolder) {
				for (const diary of diaries) {
					// Fetch photos for this diary entry
					const { data: photos } = await supabase
						.from('diary_photos')
						.select('photo_url, caption')
						.eq('diary_id', diary.id);

					if (photos && photos.length > 0) {
						for (const photo of photos) {
							if (photo.photo_url) {
								try {
									const imageData = await downloadImage(photo.photo_url);
									const fileName = getFileName(
										photo.photo_url,
										`${diary.entry_date}_${photo.caption || 'foto'}`
									);
									diaryFolder.file(fileName, imageData);
									totalFiles++;
								} catch (error) {
									console.error(`Failed to download diary photo ${photo.photo_url}:`, error);
								}
							}
						}
					}
				}
			}
		}

		// 4. Fetch ÄTA photos
		const { data: atas } = await supabase
			.from('ata')
			.select(`
				id,
				ata_number,
				description,
				project:projects(name, project_number)
			`)
			.eq('org_id', membership.org_id)
			.eq('status', 'approved')
			.gte('created_at', startDate)
			.lte('created_at', endDate);

		if (atas && atas.length > 0) {
			const ataFolder = zip.folder('ata');
			if (ataFolder) {
				for (const ata of atas) {
					// Fetch photos for this ÄTA
					const { data: photos } = await supabase
						.from('ata_photos')
						.select('photo_url, caption')
						.eq('ata_id', ata.id);

					if (photos && photos.length > 0) {
						for (const photo of photos) {
							if (photo.photo_url) {
								try {
									const imageData = await downloadImage(photo.photo_url);
									const fileName = getFileName(
										photo.photo_url,
										`ata${ata.ata_number}_${photo.caption || 'foto'}`
									);
									ataFolder.file(fileName, imageData);
									totalFiles++;
								} catch (error) {
									console.error(`Failed to download ÄTA photo ${photo.photo_url}:`, error);
								}
							}
						}
					}
				}
			}
		}

		// If no files found, return error
		if (totalFiles === 0) {
			return NextResponse.json({ error: 'No attachments found for this period' }, { status: 404 });
		}

		// Generate ZIP
		const zipBuffer = await zip.generateAsync({
			type: 'nodebuffer',
			compression: 'DEFLATE',
			compressionOptions: { level: 6 },
		});

		// Track export in database
		await supabase.from('integration_batches').insert({
			org_id: membership.org_id,
			batch_type: 'attachments_zip',
			period_start: startDate,
			period_end: endDate,
			item_count: totalFiles,
			file_size: zipBuffer.length,
			created_by: user.id,
		});

		// Return ZIP file
		const fileName = `bilagor_${startDate}_${endDate}.zip`;
		return new NextResponse(zipBuffer, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="${fileName}"`,
				'Content-Length': zipBuffer.length.toString(),
			},
		});
	} catch (error) {
		console.error('Error generating attachments ZIP:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * Download image from URL (Supabase Storage or external)
 */
async function downloadImage(url: string): Promise<Buffer> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to download image: ${response.statusText}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

/**
 * Generate safe filename from URL and description
 */
function getFileName(url: string, description: string): string {
	// Get extension from URL
	const urlParts = url.split('?')[0].split('/');
	const fileName = urlParts[urlParts.length - 1];
	const extension = fileName.split('.').pop() || 'jpg';

	// Sanitize description for filename
	const sanitized = description
		.replace(/[^a-zA-Z0-9åäöÅÄÖ\s_-]/g, '')
		.replace(/\s+/g, '_')
		.substring(0, 50);

	return `${sanitized}.${extension}`;
}

