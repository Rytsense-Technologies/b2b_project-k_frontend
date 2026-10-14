'use client';

import InsightsView from '@/components/admin/InsightsView';
import { analyticsApi } from '@/lib/api/analytics';

/** College Admin analytics: the whole college, filterable by department. */
export default function AdminAnalyticsPage() {
  return <InsightsView load={analyticsApi.college} />;
}
