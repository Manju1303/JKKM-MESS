/**
 * Helper to get the start and end of "today" in Indian Standard Time (IST) timezone (Asia/Kolkata).
 * Useful for querying Postgres databases where DateTimes are stored in UTC.
 * Ensures timezone consistency regardless of server location.
 */
export function getTodayRangeIST(): { start: Date; end: Date } {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const month = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1; // 0-indexed
  const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

  // 00:00:00 IST is UTC minus 5.5 hours (330 minutes)
  const startMs = Date.UTC(year, month, day, 0, 0, 0) - 5.5 * 60 * 60 * 1000;
  const start = new Date(startMs);
  const end = new Date(startMs + 24 * 60 * 60 * 1000);

  return { start, end };
}
