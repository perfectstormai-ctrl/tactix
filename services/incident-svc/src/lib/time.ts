export function durationHours(startsAt: Date | string, endsAt: Date | string): number {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const ms = end.getTime() - start.getTime();
  return ms / (1000 * 60 * 60);
}

export function clampToHorizon(date: Date | string, horizonDays: number, now: Date = new Date()): Date {
  const target = new Date(date);
  const min = new Date(now.getTime() - horizonDays * 24 * 60 * 60 * 1000);
  const max = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  if (target < min) return min;
  if (target > max) return max;
  return target;
}
