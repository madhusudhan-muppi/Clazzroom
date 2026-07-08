// The 8 fixed project stages
export const PROJECT_STAGES = [
  { key: 'topic_selection', name: 'Topic Selection', description: 'Choose and register a project topic' },
  { key: 'literature_review', name: 'Literature Review', description: 'Research existing work and references' },
  { key: 'problem_definition', name: 'Problem Definition', description: 'Clearly define the problem statement' },
  { key: 'methodology', name: 'Methodology', description: 'Outline the approach and methods' },
  { key: 'implementation', name: 'Implementation', description: 'Build and execute the project work' },
  { key: 'testing_validation', name: 'Testing & Validation', description: 'Verify results and correctness' },
  { key: 'report_writing', name: 'Report Writing', description: 'Write the final report or paper' },
  { key: 'final_submission', name: 'Final Submission', description: 'Submit the completed project for evaluation' },
];

// Status constants
export const STAGE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Badge sync status
export const SYNC_STATUS = {
  AHEAD: 'ahead',
  ON_TRACK: 'on_track',
  BEHIND: 'behind',
  LATE: 'late',
  NOT_STARTED: 'not_started',
};

/**
 * Create default stages array for a new project
 */
export function createDefaultStages() {
  return PROJECT_STAGES.map((stage) => ({
    key: stage.key,
    name: stage.name,
    status: STAGE_STATUS.PENDING,
    submitted_at: null,
    reviewed_at: null,
    feedback: null,
    file_url: null,
    file_name: null,
  }));
}

/**
 * Calculate per-stage deadlines from project timeline.
 * If customDurations exists on the classroom, use those; otherwise divide equally.
 * 
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {number[]|null} customDurations - array of 8 numbers (days per stage), or null
 * @returns {Date[]} - array of 8 deadline Date objects (end of each stage)
 */
export function calculateStageDeadlines(startDate, endDate, customDurations = null) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalMs = end - start;

  if (customDurations && customDurations.length === 8) {
    const totalCustomDays = customDurations.reduce((a, b) => a + b, 0);
    const deadlines = [];
    let cursor = new Date(start);

    for (let i = 0; i < 8; i++) {
      const stageMs = (customDurations[i] / totalCustomDays) * totalMs;
      cursor = new Date(cursor.getTime() + stageMs);
      deadlines.push(new Date(cursor));
    }
    return deadlines;
  }

  // Equal division
  const stageMs = totalMs / 8;
  return Array.from({ length: 8 }, (_, i) => new Date(start.getTime() + stageMs * (i + 1)));
}

/**
 * Determine the sync status of a student's project.
 * 
 * @param {object[]} stages - the 8 stage objects from the project doc
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @param {number[]|null} customDurations
 * @returns {{ status: string, expectedIndex: number, actualIndex: number }}
 */
export function getTimelineSyncStatus(stages, startDate, endDate, customDurations = null) {
  if (!startDate || !endDate) {
    return { status: SYNC_STATUS.NOT_STARTED, expectedIndex: 0, actualIndex: 0 };
  }

  const deadlines = calculateStageDeadlines(startDate, endDate, customDurations);
  const now = new Date();

  // Find expected stage index (which stage should be done by now)
  let expectedIndex = 0;
  for (let i = 0; i < deadlines.length; i++) {
    if (now >= deadlines[i]) {
      expectedIndex = i + 1;
    }
  }

  // Find actual stage index (number of approved stages)
  const actualIndex = stages.filter(s => s.status === STAGE_STATUS.APPROVED).length;

  const diff = actualIndex - expectedIndex;

  let status;
  if (expectedIndex === 0 && actualIndex === 0) {
    status = SYNC_STATUS.ON_TRACK;
  } else if (diff >= 1) {
    status = SYNC_STATUS.AHEAD;
  } else if (diff === 0) {
    status = SYNC_STATUS.ON_TRACK;
  } else if (diff === -1) {
    status = SYNC_STATUS.BEHIND;
  } else {
    status = SYNC_STATUS.LATE;
  }

  return { status, expectedIndex, actualIndex };
}

/**
 * Get the display config for a sync status
 */
export function getSyncStatusDisplay(status) {
  switch (status) {
    case SYNC_STATUS.AHEAD:
      return { label: 'Ahead', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
    case SYNC_STATUS.ON_TRACK:
      return { label: 'On Track', color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' };
    case SYNC_STATUS.BEHIND:
      return { label: 'Behind', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
    case SYNC_STATUS.LATE:
      return { label: 'Late', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' };
    default:
      return { label: 'Not Started', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  }
}
