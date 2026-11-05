import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

export function Pagination({ pagination, onPageChange, className = '' }) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { page, totalPages, total } = pagination;

  return (
    <nav
      className={`pagination ${className}`.trim()}
      aria-label="Pagination Navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 0',
        marginTop: '1.5rem',
        borderTop: '1px solid var(--color-slate-200)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}
    >
      <div style={{ fontSize: '0.875rem', color: 'var(--color-slate-500)' }}>
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total reports)
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </Button>
      </div>
    </nav>
  );
}

