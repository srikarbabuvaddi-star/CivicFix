import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, Lock } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { CATEGORY_LABELS, ISSUE_VISIBILITY } from '../utils/constants.js';

export function IssueCard({ issue }) {
  const categoryLabel = CATEGORY_LABELS[issue.category] || issue.category;
  const isPrivate = issue.visibility === ISSUE_VISIBILITY.PRIVATE;

  const formattedDate = issue.createdAt
    ? new Date(issue.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '';

  const locationDisplay =
    issue.location?.address ||
    (issue.location?.coordinates
      ? `${issue.location.coordinates[1].toFixed(4)}, ${issue.location.coordinates[0].toFixed(4)}`
      : 'Location unspecified');

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        border: '1px solid var(--color-slate-200)'
      }}
    >
      <div>
        {/* Top Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            marginBottom: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: 'var(--color-navy-700)',
                backgroundColor: 'var(--color-slate-100)',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {issue.issueNumber}
            </span>

            {isPrivate && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#991b1b',
                  backgroundColor: '#fee2e2',
                  padding: '0.15rem 0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600
                }}
              >
                <Lock size={12} />
                Private
              </span>
            )}
          </div>

          <StatusBadge status={issue.status} />
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '1.15rem',
            marginBottom: '0.5rem',
            color: 'var(--color-navy-900)',
            lineHeight: 1.35
          }}
        >
          <Link
            to={`/issues/${issue.id}`}
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            {issue.title}
          </Link>
        </h3>

        {/* Excerpt */}
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--color-slate-500)',
            marginBottom: '1rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {issue.description}
        </p>
      </div>

      {/* Meta Footer */}
      <div
        style={{
          borderTop: '1px solid var(--color-slate-100)',
          paddingTop: '0.85rem',
          marginTop: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.825rem',
          color: 'var(--color-slate-500)',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
            {categoryLabel}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={13} />
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {locationDisplay}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={13} />
            <span>{formattedDate}</span>
          </div>

          <Link
            to={`/issues/${issue.id}`}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.25rem 0.5rem', color: 'var(--color-primary)' }}
            aria-label={`View issue details for ${issue.issueNumber}`}
          >
            <span>Details</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

