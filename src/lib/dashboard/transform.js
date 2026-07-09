const SKILL_LABELS = {
  technical_knowledge: 'Technical Knowledge',
  communication: 'Communication',
  confidence: 'Confidence',
  answer_structure: 'Answer Structure',
  problem_solving: 'Problem Solving',
  behavioral_readiness: 'Behavioral Readiness',
};

function toDisplayScore(score) {
  const num = Number(score);
  if (Number.isNaN(num)) return 0;
  if (num <= 10) return Math.round(num * 10);
  return Math.round(num);
}

function formatTrendDate(date) {
  if (!date) return '';
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildTrendAxisLabel(item, index, items) {
  const dayLabel = formatTrendDate(item.date);
  const sameDayCount = items.filter((entry) => entry.date === item.date).length;
  if (sameDayCount > 1) {
    const sameDayIndex = items
      .slice(0, index + 1)
      .filter((entry) => entry.date === item.date).length;
    return `${dayLabel} (${sameDayIndex})`;
  }
  return dayLabel;
}

function sortTrendItems(items = []) {
  return [...items].sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return String(a.session_id || '').localeCompare(String(b.session_id || ''));
  });
}

export function transformDashboardResponse(data) {
  if (!data) return null;

  const readiness = Number(data.overall_full_interview_score) || 0;
  const kpi = data.kpi ?? {};
  const skillBreakdown = data.skill_breakdown ?? {};

  const categories = Object.entries(skillBreakdown).map(([key, score]) => ({
    label: SKILL_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    score: toDisplayScore(score),
  }));

  const sortedTrend = sortTrendItems(data.performance_trend ?? []);
  const lastFiveTrend = sortedTrend.slice(-5);
  const trendItems = lastFiveTrend.map((item, index) => ({
    label: buildTrendAxisLabel(item, index, lastFiveTrend),
    score: Number(item.overall_score) || 0,
    position: item.position,
    interviewType: item.interview_type,
    date: item.date,
    summaryTitle: item.summary_title,
  }));

  const interviews = (data.recent_interviews ?? []).map((item) => ({
    id: item.session_id,
    role: item.position,
    mode: String(item.interview_type ?? '').toLowerCase(),
    score: Number(item.overall_score) || 0,
    completedAt: item.started_at,
  }));

  return {
    readiness,
    kpi: {
      totalMockInterviews: kpi.total_mock_interviews ?? 0,
      totalFullInterviews: kpi.total_full_interviews ?? 0,
      bestCategory: kpi.best_category
        ? { label: kpi.best_category.name, score: toDisplayScore(kpi.best_category.score) }
        : null,
      weakestArea: kpi.weakest_area
        ? { label: kpi.weakest_area.name, score: toDisplayScore(kpi.weakest_area.score) }
        : null,
    },
    trend: { items: trendItems },
    skills: { categories },
    recent: { interviews },
  };
}
