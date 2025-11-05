/**
 * Organization Formatters
 * 
 * Pure formatting functions that can be used in both server and client components.
 * These functions have no dependencies on server-only code.
 */

/**
 * Format storage size for display
 */
export function formatStorageSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Calculate storage usage percentage
 */
export function getStorageUsagePercentage(usedBytes: number, maxGB: number): number {
  const maxBytes = maxGB * 1024 * 1024 * 1024;
  return Math.round((usedBytes / maxBytes) * 100);
}

/**
 * Get organization status color
 */
export function getOrganizationStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    active: 'green',
    trial: 'blue',
    suspended: 'red',
    deleted: 'gray',
  };
  
  return colorMap[status] || 'gray';
}

/**
 * Format organization status for display
 */
export function formatOrganizationStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Active',
    trial: 'Trial',
    suspended: 'Suspended',
    deleted: 'Deleted',
  };
  
  return statusMap[status] || status;
}

