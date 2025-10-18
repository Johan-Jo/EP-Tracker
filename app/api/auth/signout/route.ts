import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
	try {
		const supabase = await createClient();

		const { error } = await supabase.auth.signOut();

		if (error) {
			return NextResponse.json(
				{ error: error.message },
				{ status: 400 }
			);
		}

		return NextResponse.json({
			message: 'Utloggning lyckades',
		});
	} catch (error) {
		console.error('Signout error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

