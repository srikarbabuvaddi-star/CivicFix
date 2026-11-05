import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PlusCircle, Filter, RefreshCw } from 'lucide-react';
import { Button } from '../components/Button.jsx';
import { Alert } from '../components/Alert.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { IssueCard } from '../components/IssueCard.jsx';
import { Pagination } from '../components/Pagination.jsx';
import * as issueService from '../services/issueService.js';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  ROUTES
} from '../utils/constants.js';

export function MyReportsPage() {
  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(
    async (pageToFetch = 1) => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await issueService.getMyIssues({
          page: pageToFetch,
          limit: pagination.limit,
          category: category || undefined,
          status: status || undefined
        });

        setIssues(data.issues || []);
        setPagination(data.pagination || { page: 1, limit: 9, total: 0, totalPages: 1 });
      } catch (err) {
        setError(err.message || 'Failed to load your submitted reports');
      } finally {
        setIsLoading(false);
      }
    },
    [category, status, pagination.limit]
  );

  useEffect(() => {
    fetchReports(1);
  }, [fetchReports]);

  const handlePageChange = (newPage) => {
    fetchReports(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setCategory('');
    setStatus('');
  };

  const hasActiveFilters = Boolean(category || status);

  return (
    <div>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--color-navy-900)' }}>My Civic Reports</h1>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Track progress, inspect resolution evidence, or withdraw submitted complaints.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReports(pagination.page)}
            title="Refresh list"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </Button>

          <Link to={ROUTES.CREATE_ISSUE} className="btn btn-primary btn-sm">
            <PlusCircle size={16} />
            <span>Report New Issue</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: 'var(--color-white)',
          border: '1px solid var(--color-slate-200)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-navy-800)', fontWeight: 600, fontSize: '0.9rem' }}>
            <Filter size={16} />
            <span>Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-input"
            style={{ width: 'auto', minWidth: '180px' }}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="form-input"
            style={{ width: 'auto', minWidth: '160px' }}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              style={{ color: 'var(--color-slate-500)', fontSize: '0.85rem' }}
            >
              Reset Filters
            </Button>
          )}
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
          {pagination.total} {pagination.total === 1 ? 'report' : 'reports'} found
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="danger" title="Unable to retrieve reports">
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {isLoading ? (
        <LoadingScreen message="Retrieving your submitted reports..." />
      ) : issues.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={hasActiveFilters ? 'No reports match your filters' : 'No civic reports submitted yet'}
          description={
            hasActiveFilters
              ? 'Try adjusting your category or status filter parameters.'
              : 'You have not submitted any complaints yet. When you notice infrastructure hazards or municipal issues, report them here.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Active Filters
              </Button>
            ) : (
              <Link to={ROUTES.CREATE_ISSUE} className="btn btn-primary btn-sm">
                <PlusCircle size={15} />
                <span>Submit Your First Report</span>
              </Link>
            )
          }
        />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem'
            }}
          >
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>

          <Pagination pagination={pagination} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  );
}

