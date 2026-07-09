export function getDashboardSummaryByScore(score) {
  const value = Number(score);
  if (Number.isNaN(value)) {
    return 'Your interview readiness needs further development. Spend time practicing fundamentals, improving communication, and building confidence before attempting higher-level interviews.';
  }

  if (value < 50) {
    return 'Your interview readiness needs further development. Spend time practicing fundamentals, improving communication, and building confidence before attempting higher-level interviews.';
  }
  if (value < 60) {
    return 'You showed some understanding of the topics, but several areas need improvement. Regular practice and focused preparation will help build confidence and performance.';
  }
  if (value < 70) {
    return 'You have a good foundation but there is room for improvement. Strengthening your weaker areas and practicing more structured responses will help improve your score.';
  }
  if (value < 80) {
    return 'Good performance overall. You demonstrated solid understanding and relevant experience. Focus on improving your weaker areas to become more interview-ready.';
  }
  if (value < 90) {
    return 'You performed very well and showed strong interview readiness. Your answers were clear and relevant. Focus on your weaker areas to reach an advanced level.';
  }
  return 'Excellent performance. You demonstrated strong interview readiness across all areas. Continue refining your answers and maintaining consistency.';
}

export function getReadinessLabel(score) {
  const value = Number(score);
  if (Number.isNaN(value) || value < 50) return 'Needs Development';
  if (value < 60) return 'Building Foundation';
  if (value < 70) return 'Room to Improve';
  if (value < 80) return 'Good Progress';
  if (value < 90) return 'Strong Progress';
  return 'Excellent';
}
