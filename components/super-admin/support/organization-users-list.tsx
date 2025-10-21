'use client';

import { ImpersonateButton } from './impersonate-button';
import { User, Mail, Shield, Clock } from 'lucide-react';

interface OrganizationUser {
	id: string;
	email: string;
	full_name: string | null;
	role: string;
	last_sign_in_at: string | null;
}

interface OrganizationUsersListProps {
	users: OrganizationUser[];
}

export function OrganizationUsersList({ users }: OrganizationUsersListProps) {
	if (users.length === 0) {
		return (
			<div className="text-center py-8">
				<User className="mx-auto h-12 w-12 text-gray-400" />
				<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
					No users found in this organization
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
					Organization Members ({users.length})
				</h3>
			</div>

			<div className="space-y-3">
				{users.map((user) => (
					<div
						key={user.id}
						className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
					>
						<div className="flex items-start gap-4 flex-1">
							<div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
								<User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<p className="font-medium text-gray-900 dark:text-white truncate">
										{user.full_name || user.email}
									</p>
									<span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
										{user.role}
									</span>
								</div>

								<div className="mt-1 flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
									<div className="flex items-center gap-1">
										<Mail className="h-3 w-3" />
										<span className="truncate">{user.email}</span>
									</div>
									{user.last_sign_in_at && (
										<div className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											<span>
												Last login: {new Date(user.last_sign_in_at).toLocaleString()}
											</span>
										</div>
									)}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2 ml-4">
							<ImpersonateButton
								userId={user.id}
								userName={user.full_name || user.email}
							/>
						</div>
					</div>
				))}
			</div>

			<div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/50 dark:bg-orange-900/20">
				<div className="flex items-start gap-2">
					<Shield className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
					<div className="text-sm text-orange-700 dark:text-orange-300">
						<p className="font-medium">Impersonation Notice</p>
						<p className="mt-1">
							Clicking &quot;Impersonera&quot; will log you in as that user. All actions during impersonation are logged for security and audit purposes.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

