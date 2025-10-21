import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/super-admin';
import {
  calculateRevenueMetrics,
  calculateGrowthMetrics,
  calculateUsageMetrics,
  calculateSystemHealthMetrics,
  getMRRTrendData,
  getUserGrowthData,
  getOrganizationsByPlan,
  getFeatureUsageStats,
} from '@/lib/super-admin/metrics-calculator';
import { getRecentActivity } from '@/lib/super-admin/activity-feed';

/**
 * GET /api/super-admin/metrics/dashboard
 * 
 * Get all metrics for the super admin dashboard
 * (Combined endpoint for better performance)
 */
export async function GET() {
  try {
    await requireSuperAdmin();
    
    // Fetch all metrics in parallel
    const [
      revenueMetrics,
      growthMetrics,
      usageMetrics,
      systemHealthMetrics,
      mrrTrendData,
      userGrowthData,
      orgsByPlan,
      featureUsageStats,
      recentActivity,
    ] = await Promise.all([
      calculateRevenueMetrics(),
      calculateGrowthMetrics(),
      calculateUsageMetrics(),
      calculateSystemHealthMetrics(),
      getMRRTrendData(),
      getUserGrowthData(),
      getOrganizationsByPlan(),
      getFeatureUsageStats(),
      getRecentActivity(20),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        revenue: revenueMetrics,
        growth: growthMetrics,
        usage: usageMetrics,
        system_health: systemHealthMetrics,
        charts: {
          mrr_trend: mrrTrendData,
          user_growth: userGrowthData,
          orgs_by_plan: orgsByPlan,
          feature_usage: featureUsageStats,
        },
        recent_activity: recentActivity,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

