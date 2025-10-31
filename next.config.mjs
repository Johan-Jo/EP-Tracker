// PWA plugin REMOVED - using firebase-messaging-sw.js directly for push notifications
// import withPWAInit from '@ducanh2912/next-pwa';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
	outputFileTracingRoot: __dirname,
	
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
	
	// Temporarily allow ESLint warnings during build
	// TODO: Fix all ESLint warnings incrementally
	eslint: {
		ignoreDuringBuilds: false,
	},
	typescript: {
		ignoreBuildErrors: false,
	},
};

export default nextConfig;

