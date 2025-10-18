import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		console.error('Missing Supabase environment variables');
		return supabaseResponse;
	}

	const supabase = createServerClient(
		supabaseUrl,
		supabaseKey,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					for (const { name, value } of cookiesToSet) {
						request.cookies.set(name, value);
					}
					supabaseResponse = NextResponse.next({
						request,
					});
					for (const { name, value, options } of cookiesToSet) {
						supabaseResponse.cookies.set(name, value, options);
					}
				},
			},
		}
	);

	// Refresh session if expired
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Protected routes
	const protectedRoutes = ['/dashboard', '/projects', '/time', '/approvals', '/settings'];
	const authRoutes = ['/sign-in', '/sign-up', '/verify-email'];

	const isProtectedRoute = protectedRoutes.some((route) =>
		request.nextUrl.pathname.startsWith(route)
	);
	const isAuthRoute = authRoutes.some((route) =>
		request.nextUrl.pathname.startsWith(route)
	);

	// Redirect to sign-in if accessing protected route without auth
	if (isProtectedRoute && !user) {
		const url = request.nextUrl.clone();
		url.pathname = '/sign-in';
		return NextResponse.redirect(url);
	}

	// Redirect to home if accessing auth routes while authenticated
	// (except verify-email which should be accessible)
	if (isAuthRoute && user && !request.nextUrl.pathname.startsWith('/verify-email')) {
		const url = request.nextUrl.clone();
		url.pathname = '/';
		return NextResponse.redirect(url);
	}

	return supabaseResponse;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files (public folder)
		 */
		'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};

