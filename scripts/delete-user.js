#!/usr/bin/env node

/**
 * Delete User Script for EP Tracker
 * 
 * This script safely deletes a user from the Supabase database.
 * It removes:
 * - User profile
 * - Organization memberships
 * - Auth user (if using service role key)
 * 
 * Usage:
 *   node scripts/delete-user.js johan270511@gmail.com
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseServiceKey;

if (fs.existsSync(envPath)) {
	const envContent = fs.readFileSync(envPath, 'utf8');
	const envVars = {};
	envContent.split('\n').forEach(line => {
		const [key, ...valueParts] = line.split('=');
		if (key && valueParts.length) {
			envVars[key.trim()] = valueParts.join('=').trim();
		}
	});
	supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
	supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
} else {
	console.error('❌ .env.local file not found');
	process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUser(email) {
	console.log(`\n🗑️  Deleting user: ${email}\n`);

	try {
		// 1. Find the user profile
		console.log('1️⃣ Finding user profile...');
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('id, full_name, email')
			.eq('email', email)
			.single();

		if (profileError || !profile) {
			console.log('⚠️  User profile not found in profiles table');
			console.log('   This might mean the user was already deleted or never existed.');
			
			// Try to find in auth.users
			console.log('\n2️⃣ Checking auth.users...');
			const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
			
			if (!authError && authUsers) {
				const authUser = authUsers.users.find(u => u.email === email);
				if (authUser) {
					console.log(`   Found in auth.users: ${authUser.id}`);
					console.log('\n⚠️  User exists in auth.users but not in profiles.');
					console.log('   You may need to delete from Supabase Dashboard → Authentication → Users');
					return;
				}
			}
			
			console.log('   User not found in auth.users either.');
			return;
		}

		console.log(`✅ Found profile: ${profile.full_name} (${profile.email})`);
		console.log(`   Profile ID: ${profile.id}`);

		// 2. Find and delete memberships
		console.log('\n2️⃣ Finding organization memberships...');
		const { data: memberships, error: membershipsError } = await supabase
			.from('memberships')
			.select('id, org_id, role')
			.eq('user_id', profile.id);

		if (membershipsError) {
			console.error('❌ Error fetching memberships:', membershipsError.message);
		} else if (memberships && memberships.length > 0) {
			console.log(`   Found ${memberships.length} membership(s):`);
			memberships.forEach(m => {
				console.log(`   - Org ID: ${m.org_id}, Role: ${m.role}`);
			});

			console.log('\n3️⃣ Deleting memberships...');
			const { error: deleteMembershipsError } = await supabase
				.from('memberships')
				.delete()
				.eq('user_id', profile.id);

			if (deleteMembershipsError) {
				console.error('❌ Error deleting memberships:', deleteMembershipsError.message);
				return;
			}
			console.log('✅ Memberships deleted');
		} else {
			console.log('   No memberships found');
		}

		// 3. Delete profile
		console.log('\n4️⃣ Deleting profile...');
		const { error: deleteProfileError } = await supabase
			.from('profiles')
			.delete()
			.eq('id', profile.id);

		if (deleteProfileError) {
			console.error('❌ Error deleting profile:', deleteProfileError.message);
			return;
		}
		console.log('✅ Profile deleted');

		// 4. Delete auth user (requires service role key)
		console.log('\n5️⃣ Deleting auth user...');
		try {
			// Get auth user ID
			const { data: authUsers } = await supabase.auth.admin.listUsers();
			const authUser = authUsers?.users.find(u => u.email === email);
			
			if (authUser) {
				const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUser.id);
				if (deleteAuthError) {
					console.error('❌ Error deleting auth user:', deleteAuthError.message);
					console.log('   You may need to delete manually from Supabase Dashboard');
				} else {
					console.log('✅ Auth user deleted');
				}
			} else {
				console.log('⚠️  Auth user not found (may have been already deleted)');
			}
		} catch (error) {
			console.log('⚠️  Could not delete auth user:', error.message);
			console.log('   You may need to delete manually from Supabase Dashboard → Authentication → Users');
		}

		console.log('\n✅ User deletion complete!');
		console.log(`\n📋 Summary:`);
		console.log(`   • Email: ${email}`);
		console.log(`   • Profile: Deleted`);
		console.log(`   • Memberships: Deleted`);
		console.log(`   • Auth user: Check Supabase Dashboard if needed`);

	} catch (error) {
		console.error('\n❌ Error:', error.message);
		console.error(error);
	}
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
	console.error('❌ Please provide an email address');
	console.error('Usage: node scripts/delete-user.js <email>');
	console.error('Example: node scripts/delete-user.js johan270511@gmail.com');
	process.exit(1);
}

deleteUser(email).catch(console.error);

