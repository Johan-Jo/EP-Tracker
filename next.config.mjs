import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
	dest: 'public',
	disable: process.env.NODE_ENV === 'development',
	register: true,
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
	
	// Performance optimizations
	experimental: {
		optimizePackageImports: [
			'lucide-react',
			'@radix-ui/react-dialog',
			'@radix-ui/react-dropdown-menu',
			'@radix-ui/react-select',
			'@radix-ui/react-tabs',
			'date-fns',
		],
	},
	
	// Reduce server-side processing
	serverExternalPackages: ['@supabase/supabase-js'],
	
	// Improve build performance
	swcMinify: true,
	
	// Enable modularizeImports for better tree-shaking
	modularizeImports: {
		'lucide-react': {
			transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
		},
	},
};

export default withPWA(nextConfig);

