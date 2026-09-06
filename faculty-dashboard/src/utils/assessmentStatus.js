// Derives a display status for an assessment purely from fields that already
// exist on the row (scheduled_date, duration_minutes, is_active). There is no
// "status" column in the database — this is computed the same way the backend
// already gates access in routes/assessments.js (comparing now vs scheduled_date).
export function getAssessmentStatus(assessment) {
  if (assessment?.is_active === false) {
    return { key: 'inactive', label: 'Inactive', color: 'gray' };
  }

  const start = new Date(assessment.scheduled_date).getTime();
  const durationMs = (Number(assessment.duration_minutes) || 0) * 60 * 1000;
  const end = start + durationMs;
  const now = Date.now();

  if (now < start) return { key: 'scheduled', label: 'Scheduled', color: 'blue' };
  if (now <= end) return { key: 'live', label: 'Live', color: 'green' };
  return { key: 'completed', label: 'Completed', color: 'slate' };
}

export const STATUS_COLOR_CLASSES = {
  blue: 'bg-blue-50 text-secondary border-blue-200',
  green: 'bg-green-50 text-success border-green-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  gray: 'bg-gray-100 text-gray-500 border-gray-200',
};
