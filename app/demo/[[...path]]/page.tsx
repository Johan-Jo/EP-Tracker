/**
 * Catch-all route for /demo/* paths
 * Middleware handles redirect to /dashboard/* with cookie set
 * This page should never be reached, but exists as fallback
 */
export default async function DemoCatchAllPage() {
	// This should never be reached since middleware redirects /demo/* to /dashboard/*
	// But if it is, return null
	return null;
}

