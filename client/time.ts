const UNITS: [label: string, seconds: number][] = [
  ["y", 365 * 24 * 3600],
  ["mo", 30 * 24 * 3600],
  ["d", 24 * 3600],
  ["h", 3600],
  ["m", 60],
];

/** "3d", "2h", "now": the age of an ISO timestamp, short enough for a list row. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  const unit = UNITS.find(([, span]) => seconds >= span);
  return unit ? `${Math.floor(seconds / unit[1])}${unit[0]}` : "now";
}
