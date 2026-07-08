import { getTimelineSyncStatus, getSyncStatusDisplay } from '../lib/stages';

/**
 * Color-coded badge showing whether a student's project is ahead, on-track, behind, or late.
 */
export default function TimelineBadge({ stages, startDate, endDate, customDurations = null, size = 'sm' }) {
  const { status } = getTimelineSyncStatus(stages, startDate, endDate, customDurations);
  const display = getSyncStatusDisplay(status);

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${display.color} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${display.dot}`}></span>
      {display.label}
    </span>
  );
}
