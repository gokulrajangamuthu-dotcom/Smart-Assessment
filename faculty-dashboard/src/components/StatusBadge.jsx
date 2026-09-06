import { getAssessmentStatus, STATUS_COLOR_CLASSES } from '../utils/assessmentStatus';

export default function StatusBadge({ assessment }) {
  const status = getAssessmentStatus(assessment);
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_COLOR_CLASSES[status.color]}`}>
      {status.label}
    </span>
  );
}
