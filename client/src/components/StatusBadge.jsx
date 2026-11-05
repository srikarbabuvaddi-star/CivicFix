import { STATUS_LABELS } from '../utils/constants.js';

export function StatusBadge({ status, className = '' }) {
  const displayLabel = STATUS_LABELS[status] || status;

  const styleMap = {
    submitted: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    under_review: { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    assigned: { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
    in_progress: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    resolved: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    closed: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
    reopened: { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
    rejected: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    withdrawn: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
  };

  const style = styleMap[status] || styleMap.submitted;

  return (
    <span
      className={`badge ${className}`.trim()}
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        fontWeight: 700,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '0.2rem 0.6rem',
        borderRadius: 'var(--radius-full)'
      }}
    >
      {displayLabel}
    </span>
  );
}

