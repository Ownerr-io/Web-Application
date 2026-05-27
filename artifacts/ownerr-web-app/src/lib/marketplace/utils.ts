export const PASTEL_COLORS = ['#FFE6F1', '#E6EAFF', '#E6FFE8', '#E6F5FF', '#FFF8E6', '#F0E6FF', '#FFEEE6'];

export function generateMonthlyRevenue(currentMrr: number) {
  const series: { month: string; value: number }[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let val = currentMrr * 0.3;
  for (let i = 0; i < 12; i++) {
    const variance = (Math.random() - 0.2) * 0.25;
    val = val * (1 + variance);
    if (i === 11) val = currentMrr;
    series.push({ month: months[i], value: Math.round(val) });
  }
  return series;
}

export function leaderboardMetricValue(
  s: { revenue: number; peakMrr?: number },
  metric: 'mrr' | 'arr',
  period: 'all_time' | 'current',
): number {
  const mrr = period === 'all_time' ? (s.peakMrr ?? s.revenue) : s.revenue;
  return metric === 'arr' ? mrr * 12 : mrr;
}
