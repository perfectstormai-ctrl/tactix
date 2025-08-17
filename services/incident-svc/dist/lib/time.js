"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.durationHours = durationHours;
exports.clampToHorizon = clampToHorizon;
function durationHours(startsAt, endsAt) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const ms = end.getTime() - start.getTime();
    return ms / (1000 * 60 * 60);
}
function clampToHorizon(date, horizonDays, now = new Date()) {
    const target = new Date(date);
    const min = new Date(now.getTime() - horizonDays * 24 * 60 * 60 * 1000);
    const max = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
    if (target < min)
        return min;
    if (target > max)
        return max;
    return target;
}
