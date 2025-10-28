import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
	dest: 'public',
	disable: true, // Disabled - using firebase-messaging-sw.js for push notifications instead
	register: false,
	skipWaiting: true,
	sw: 'sw.js',
	cacheOnNavigation: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**.supabase.co',
			},
		],
	},
	reactStrictMode: true,
	
	// Fix workspace root detection (multiple lockfiles warning)
	outputFileTracingRoot: import.meta.dirname,
	
	// Performance optimizations
	experimental: {
		optimizePackageImports: [
			'lucide-react',
			'@radix-ui/react-dialog',
			'@radix-ui/react-dropdown-menu',
			'@radix-ui/react-select',
			'@radix-ui/react-tabs',
		],
	},
	
	// Disable webpack tracing to avoid EPERM errors on Windows
	webpack: (config, { isServer }) => {
		config.infrastructureLogging = {
			level: 'error',
		};
		return config;
	},
	
	// Reduce server-side processing
	serverExternalPackages: ['@supabase/supabase-js'],
	
	// Enable modularizeImports for better tree-shaking
	modularizeImports: {
		'lucide-react': {
			transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
		},
	},
};

export default withPWA(nextConfig);

