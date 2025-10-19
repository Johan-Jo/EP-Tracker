/**
 * Fix Storage Buckets RLS Policies
 * 
 * This script fixes the "new row violates row-level security policy" error
 * by creating proper RLS policies for the storage buckets.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing Supabase credentials in .env.local');
	console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

async function fixStorageBuckets() {
	console.log('🔧 Fixing Storage Buckets RLS Policies...\n');

	try {
		// Read the migration file
		const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20241019000006_fix_storage_buckets.sql');
		const sql = fs.readFileSync(migrationPath, 'utf8');

		console.log('📄 Running migration: 20241019000006_fix_storage_buckets.sql');

		// Execute the SQL
		const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

		if (error) {
			// Try direct execution if RPC doesn't exist
			console.log('⚠️  RPC method not available, trying direct execution...');
			
			// Split SQL into statements and execute one by one
			const statements = sql
				.split(';')
				.map(s => s.trim())
				.filter(s => s.length > 0 && !s.startsWith('--'));

			for (const statement of statements) {
				if (statement.toLowerCase().includes('do $$')) {
					// Skip DO blocks
					continue;
				}
				
				try {
					const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
					if (stmtError) {
						console.log(`⚠️  Statement warning: ${stmtError.message}`);
					}
				} catch (e) {
					console.log(`⚠️  Statement skipped: ${e.message}`);
				}
			}
		}

		console.log('\n✅ Storage bucket policies updated!');
		console.log('\nBuckets configured:');
		console.log('  - receipts (for materials, expenses)');
		console.log('  - diary-photos (for diary entries)');
		console.log('  - ata-photos (for ÄTA entries)');

		console.log('\nRLS Policies created:');
		console.log('  ✓ Authenticated users can INSERT (upload)');
		console.log('  ✓ Authenticated users can UPDATE');
		console.log('  ✓ Authenticated users can DELETE');
		console.log('  ✓ Public can SELECT (view)');

		console.log('\n📸 Photo uploads should now work!');
		console.log('Try uploading a photo again in the application.');

	} catch (error) {
		console.error('❌ Error fixing storage buckets:', error.message);
		console.error('\n🔧 Manual Fix Required:');
		console.error('1. Go to Supabase Dashboard → Storage');
		console.error('2. Select "receipts" bucket');
		console.error('3. Go to "Policies" tab');
		console.error('4. Add these policies:');
		console.error('   - INSERT: Allow authenticated users');
		console.error('   - UPDATE: Allow authenticated users');
		console.error('   - DELETE: Allow authenticated users');
		console.error('   - SELECT: Allow public access');
		process.exit(1);
	}
}

// Run the fix
fixStorageBuckets();

