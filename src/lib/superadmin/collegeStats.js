/**
 * Normalise the college fields the API returns under different names.
 * `students` is the student total (student_count); `seats` is what counts against the cap
 * (seats_used: active + pending, deactivated excluded), and `pct` follows seats.
 */
export function collegeStats(c) {
  const students = Number(c?.students ?? c?.student_count ?? 0);
  const seats = Number(c?.seats_used ?? students);
  const cap = Number(c?.student_seat_cap ?? c?.student_limit ?? c?.seat_cap ?? 0);
  const admins = Array.isArray(c?.admins) ? c.admins.length : (c?.admin_count ?? c?.admins ?? 0);
  const pct = cap > 0 ? Math.min(100, Math.round((seats / cap) * 100)) : 0;
  return {
    students,
    seats,
    cap,
    admins: Number(admins) || 0,
    depts: c?.department_count,
    pct,
    active: c?.is_active !== false,
    university: c?.university || c?.university_name || '',
    // City and state only; district usually repeats the city.
    location: [c?.city || c?.district, c?.state].filter(Boolean).join(', '),
  };
}
