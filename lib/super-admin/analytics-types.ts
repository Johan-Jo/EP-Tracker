/**
 * Analytics Types
 * 
 * Type definitions for usage analytics and metrics.
 */

export interface FeatureAdoption {
	feature_name: string;
	total_users: number;
	active_users: number;
	adoption_rate: number; // percentage
	growth_rate: number; // percentage change from previous period
}

export interface EngagementMetrics {
	date: string;
	dau: number; // Daily Active Users
	wau: number; // Weekly Active Users
	mau: number; // Monthly Active Users
	new_users: number;
	returning_users: number;
}

export interface ContentMetrics {
	entity_type: 'time_entries' | 'materials' | 'expenses' | 'projects' | 'ata' | 'diary';
	total_count: number;
	count_this_month: number;
	count_last_month: number;
	growth_rate: number; // percentage
	average_per_user: number;
}

export interface PerformanceMetrics {
	metric_name: string;
	avg_value: number;
	p50: number;
	p95: number;
	p99: number;
	unit: string; // 'ms', 'seconds', etc.
}

export interface CohortData {
	cohort_month: string; // YYYY-MM format
	cohort_size: number;
	retention_rates: {
		month_0: number; // Always 100%
		month_1: number;
		month_2: number;
		month_3: number;
		month_6: number;
		month_12: number;
	};
}

export interface ChurnRisk {
	org_id: string;
	org_name: string;
	risk_score: number; // 0-100, higher = more risk
	risk_factors: string[];
	last_active: string;
	days_inactive: number;
}

export interface AnalyticsSummary {
	period: {
		start: string;
		end: string;
	};
	overview: {
		total_users: number;
		total_organizations: number;
		active_organizations: number;
		dau: number;
		wau: number;
		mau: number;
	};
	growth: {
		users_growth: number; // percentage
		orgs_growth: number; // percentage
		revenue_growth: number; // percentage
	};
	top_features: FeatureAdoption[];
	engagement_trend: EngagementMetrics[];
	content_metrics: ContentMetrics[];
}

export interface DateRange {
	start_date: string;
	end_date: string;
}

export interface AnalyticsFilters extends DateRange {
	org_id?: string;
	plan?: string;
	cohort?: string;
}

