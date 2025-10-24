import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
	try {
		const { currentPassword, newPassword } = await request.json();

		// Validate input
		if (!currentPassword || !newPassword) {
			return NextResponse.json(
				{ error: 'Nuvarande och nytt lösenord krävs' },
				{ status: 400 }
			);
		}

		if (newPassword.length < 8) {
			return NextResponse.json(
				{ error: 'Nytt lösenord måste vara minst 8 tecken långt' },
				{ status: 400 }
			);
		}

		const supabase = await createClient();

		// Get current user
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return NextResponse.json(
				{ error: 'Användare inte inloggad' },
				{ status: 401 }
			);
		}

		// Verify current password by attempting to sign in
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email: user.email!,
			password: currentPassword,
		});

		if (signInError) {
			return NextResponse.json(
				{ error: 'Nuvarande lösenord är felaktigt' },
				{ status: 400 }
			);
		}

		// Update password
		const { error: updateError } = await supabase.auth.updateUser({
			password: newPassword,
		});

		if (updateError) {
			console.error('Password update error:', updateError);
			return NextResponse.json(
				{ error: 'Kunde inte uppdatera lösenord: ' + updateError.message },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			message: 'Lösenordet har uppdaterats',
		});
	} catch (error) {
		console.error('Change password error:', error);
		return NextResponse.json(
			{ error: 'Ett oväntat fel uppstod' },
			{ status: 500 }
		);
	}
}

