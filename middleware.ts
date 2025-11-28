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
	const authRoutes = ['/sign-in', '/sign-up', '/verify-email', '/invite-callback', '/set-password'];
	const superAdminRoutes = ['/super-admin'];
	const publicRoutes = ['/demo']; // Demo routes are public (no auth required)

	const isProtectedRoute = protectedRoutes.some((route) =>
		request.nextUrl.pathname.startsWith(route)
	);
	const isAuthRoute = authRoutes.some((route) =>
		request.nextUrl.pathname.startsWith(route)
	);
	const isSuperAdminRoute = superAdminRoutes.some((route) =>
		request.nextUrl.pathname.startsWith(route)
	);
	const isPublicRoute = publicRoutes.some((route) =>
		request.nextUrl.pathname.startsWith(route)
	);

	// Validate impersonation session if user is on protected route (not super-admin route)
	// This prevents expensive DB queries on every request
	if (isProtectedRoute && !isSuperAdminRoute && user) {
		const impersonationCookie = request.cookies.get('impersonation_session');
		if (impersonationCookie) {
			try {
				const session = JSON.parse(impersonationCookie.value);
				
				// Quick expiry check (no DB query)
				if (new Date(session.expires_at) < new Date()) {
					supabaseResponse.cookies.delete('impersonation_session');
				}
				// Note: Full super admin validation happens in the API route
			} catch (error) {
				// Invalid session cookie, clear it
				supabaseResponse.cookies.delete('impersonation_session');
			}
		}
	}

	// Check if this is a demo route
	const isDemoRoute = request.nextUrl.pathname.startsWith('/demo');
	
	// Handle /demo root route - redirect to /dashboard with cookie set
	if (request.nextUrl.pathname === '/demo') {
		const url = request.nextUrl.clone();
		url.pathname = '/dashboard';
		const redirectResponse = NextResponse.redirect(url);
		redirectResponse.cookies.set('isDemoRoute', 'true', {
			path: '/',
			maxAge: 60 * 60 * 24, // 24 hours
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
		});
		return redirectResponse;
	}
	
	// Handle /demo/* routes - redirect to /dashboard/* with cookie set
	if (isDemoRoute && request.nextUrl.pathname !== '/demo') {
		const demoPath = request.nextUrl.pathname.replace('/demo', '').replace(/^\//, '');
		if (demoPath) {
			const url = request.nextUrl.clone();
			url.pathname = `/dashboard/${demoPath}`;
			const redirectResponse = NextResponse.redirect(url);
			redirectResponse.cookies.set('isDemoRoute', 'true', {
				path: '/',
				maxAge: 60 * 60 * 24, // 24 hours
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
			});
			return redirectResponse;
		}
	}

	// Check if demo cookie exists (even if pathname is /dashboard)
	const hasDemoCookie = request.cookies.get('isDemoRoute')?.value === 'true';
	
	// Redirect to sign-in if accessing protected route without auth
	// (but allow public routes like /demo, all /demo/* routes, and /dashboard with demo cookie)
	if (isProtectedRoute && !isPublicRoute && !isDemoRoute && !hasDemoCookie && !user) {
		const url = request.nextUrl.clone();
		url.pathname = '/sign-in';
		return NextResponse.redirect(url);
	}

	// Set demo route cookie for server-side detection
	// Keep cookie even when redirecting to /dashboard routes (for demo mode)
	if (isDemoRoute) {
		supabaseResponse.cookies.set('isDemoRoute', 'true', {
			path: '/',
			maxAge: 60 * 60 * 24, // 24 hours
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
		});
	} else if (isProtectedRoute) {
		// If we're on a protected route and cookie already exists, keep it
		// This handles the case when redirecting from /demo/* to /dashboard/*
		const existingCookie = request.cookies.get('isDemoRoute');
		if (existingCookie?.value === 'true') {
			supabaseResponse.cookies.set('isDemoRoute', 'true', {
				path: '/',
				maxAge: 60 * 60 * 24, // 24 hours
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
			});
		}
	}
	// Only clear cookie if explicitly leaving demo mode (e.g., going to /sign-in or landing page)
	if (!isDemoRoute && !isProtectedRoute && (request.nextUrl.pathname.startsWith('/sign-in') || request.nextUrl.pathname === '/')) {
		supabaseResponse.cookies.delete('isDemoRoute');
	}

	// Super Admin route protection
	if (isSuperAdminRoute) {
		if (!user) {
			// Not authenticated at all
			const url = request.nextUrl.clone();
			url.pathname = '/sign-in';
			return NextResponse.redirect(url);
		}

		// Check if user is super admin
		const { data: superAdminData } = await supabase
			.from('super_admins')
			.select('id, revoked_at')
			.eq('user_id', user.id)
			.is('revoked_at', null)
			.maybeSingle();

		if (!superAdminData) {
			// User is authenticated but not a super admin - redirect to dashboard
			const url = request.nextUrl.clone();
			url.pathname = '/dashboard';
			return NextResponse.redirect(url);
		}
	}

	// Redirect to home if accessing auth routes while authenticated
	// (except verify-email, invite-callback, and set-password which should be accessible)
	if (
		isAuthRoute && 
		user && 
		!request.nextUrl.pathname.startsWith('/verify-email') &&
		!request.nextUrl.pathname.startsWith('/invite-callback') &&
		!request.nextUrl.pathname.startsWith('/set-password')
	) {
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
		 * - API routes (handled separately)
		 * - firebase-messaging-sw.js (Firebase Cloud Messaging service worker)
		 */
		'/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|firebase-messaging-sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|json)$).*)',
	],
	regions: ['arn1'], // Stockholm - single region to avoid multi-region serverless error
};


