/** True at most once per `minGapMs`: collapses event bursts into one refresh. */
export function createRefreshGate(minGapMs, now = Date.now) {
  let last = -Infinity;
  return () => {
    const t = now();
    if (t - last < minGapMs) return false;
    last = t;
    return true;
  };
}
