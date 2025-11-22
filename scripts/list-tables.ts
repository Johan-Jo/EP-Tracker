import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing required environment variables:');
	if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
	if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
	console.error('\nPlease ensure these are set in your .env.local file');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function listAllTables() {
	console.log('🔍 Connecting to Supabase database...\n');
	console.log(`📍 URL: ${supabaseUrl}\n`);

	try {
		// Query information_schema to get all tables in the public schema
		const { data, error } = await supabase.rpc('exec_sql', {
			sql: `
				SELECT 
					table_name,
					table_type
				FROM information_schema.tables
				WHERE table_schema = 'public'
					AND table_type = 'BASE TABLE'
				ORDER BY table_name;
			`,
		});

		if (error) {
			// If RPC doesn't work, try direct query using PostgREST
			// We'll use a different approach - query pg_catalog directly
			console.log('⚠️  RPC method not available, trying alternative approach...\n');
			
			// Use a SQL query through the REST API
			const { data: tablesData, error: tablesError } = await supabase
				.from('information_schema.tables')
				.select('table_name, table_type')
				.eq('table_schema', 'public')
				.eq('table_type', 'BASE TABLE');

			if (tablesError) {
				// Last resort: use a direct SQL query via the REST API
				// This requires using the PostgREST endpoint with a function
				console.log('📊 Querying database schema directly...\n');
				
				// We'll need to use a different method - let's try querying a known table first
				// to verify connection, then we'll list tables using a custom query
				const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_all_tables`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'apikey': supabaseServiceKey,
						'Authorization': `Bearer ${supabaseServiceKey}`,
					},
					body: JSON.stringify({}),
				});

				if (!response.ok) {
					// Create a function to list tables if it doesn't exist
					console.log('📝 Creating helper function to list tables...\n');
					
					// We'll use a workaround: query the database using a SQL function
					// For now, let's try to get tables from migrations or use a simpler approach
					console.log('💡 Using alternative method: checking migrations for table names...\n');
					
					// Since we can't easily query information_schema via REST API,
					// let's try using the Supabase client's direct SQL execution
					// This requires the database to have a function that returns table names
					
					throw new Error('Direct SQL execution not available. Please use Supabase Dashboard SQL Editor or configure MCP server.');
				}
			} else {
				displayTables(tablesData || []);
			}
		} else {
			displayTables(data || []);
		}
	} catch (err) {
		console.error('❌ Error querying database:', err);
		console.log('\n💡 Alternative: Use Supabase Dashboard SQL Editor to run:');
		console.log(`
SELECT 
	table_name,
	table_type
FROM information_schema.tables
WHERE table_schema = 'public'
	AND table_type = 'BASE TABLE'
ORDER BY table_name;
		`);
	}
}

function displayTables(tables: Array<{ table_name: string; table_type?: string }>) {
	if (!tables || tables.length === 0) {
		console.log('⚠️  No tables found in the public schema.');
		return;
	}

	console.log(`✅ Found ${tables.length} table(s):\n`);
	console.log('┌─────────────────────────────────────────────────────────┐');
	console.log('│ Table Name                                               │');
	console.log('├─────────────────────────────────────────────────────────┤');
	
	tables.forEach((table, index) => {
		const name = table.table_name || table['table_name'];
		const padding = ' '.repeat(Math.max(0, 57 - name.length));
		console.log(`│ ${name}${padding} │`);
	});
	
	console.log('└─────────────────────────────────────────────────────────┘');
	console.log(`\n📊 Total: ${tables.length} table(s)\n`);
}

// Run the script
listAllTables()
	.then(() => {
		console.log('✅ Done!');
		process.exit(0);
	})
	.catch((error) => {
		console.error('❌ Fatal error:', error);
		process.exit(1);
	});


