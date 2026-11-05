import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ShieldCheck, PlusCircle, RefreshCw, List, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button.jsx';
import { Alert } from '../components/Alert.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { IssueCard } from '../components/IssueCard.jsx';
import { IssueMapView } from '../components/IssueMapView.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { useAuth } from '../hooks/useAuth.js';
import * as issueService from '../services/issueService.js';
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  ROUTES
} from '../utils/constants.js';

export function ExplorePage() {
  const { isAuthenticated } = useAuth();

  const [issues, setIssues] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [timePeriod, setTimePeriod] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPublicIssues = useCallback(
    async (pageToFetch = 1) => {
      try {
        setIsLoading(true);
        setError(null);

        const limitToFetch = viewMode === 'map' ? 50 : 9;

        const data = await issueService.getPublicIssues({
          page: pageToFetch,
          limit: limitToFetch,
          category: category || undefined,
          status: status || undefined,
          timePeriod: timePeriod !== 'all' ? timePeriod : undefined,
          search: submittedSearch || undefined
        });

        setIssues(data.issues || []);
        setPagination(data.pagination || { page: 1, limit: limitToFetch, total: 0, totalPages: 1 });
      } catch (err) {
        setError(err.message || 'Failed to retrieve public issues');
      } finally {
        setIsLoading(false);
      }
    },
    [category, status, timePeriod, submittedSearch, viewMode]
  );

  useEffect(() => {
    fetchPublicIssues(1);
  }, [fetchPublicIssues]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSubmittedSearch(searchTerm.trim());
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSubmittedSearch('');
    setCategory('');
    setStatus('');
    setTimePeriod('all');
  };

  const hasActiveFilters = Boolean(category || status || (timePeriod && timePeriod !== 'all') || submittedSearch);

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Explorer Page Application Header */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--color-slate-200)',
          padding: '2rem 0',
          marginBottom: '2rem'
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem'
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--color-primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.4rem'
              }}
            >
              <ShieldCheck size={16} />
              <span>Public Transparency Feed</span>
            </div>
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--color-navy-900)',
                letterSpacing: '-0.02em',
                marginBottom: '0.35rem'
              }}
            >
              Civic Issues Explorer & Public Board
            </h1>
            <p
              style={{
                color: 'var(--color-slate-600)',
                fontSize: '0.95rem',
                maxWidth: '680px',
                margin: 0
              }}
            >
              Real-time feed of community-reported infrastructure defects, sanitation requests, and street repairs across the municipality.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link to={ROUTES.CREATE_ISSUE} className="btn btn-primary">
              <PlusCircle size={16} />
              <span>Report a Civic Issue</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Search & Query Controls Bar */}
        <div
          style={{
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--color-slate-200)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {/* Top Row: Search */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-slate-400)'
                }}
              />
              <input
                type="search"
                className="form-input"
                placeholder="Search issues by title, description, or landmark..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  paddingLeft: '2.75rem'
                }}
              />
            </div>
            <Button type="submit" variant="primary">
              Search
            </Button>
            {submittedSearch && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSubmittedSearch('');
                }}
              >
                Clear
              </Button>
            )}
          </form>

          {/* Bottom Row: Filters & View Switcher */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--color-slate-100)'
            }}
          >
            {/* Filter Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-navy-800)', fontWeight: 600, fontSize: '0.85rem' }}>
                <Filter size={15} />
                <span>Filters:</span>
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-input"
                style={{ width: 'auto', minWidth: '150px', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-input"
                style={{ width: 'auto', minWidth: '140px', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>

              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="form-input"
                style={{ width: 'auto', minWidth: '130px', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                aria-label="Filter by time period"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  style={{ color: 'var(--color-slate-500)', fontSize: '0.8rem' }}
                >
                  Reset Filters
                </Button>
              )}
            </div>

            {/* Results Counter & View Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy-800)' }}>
                {pagination.total} {pagination.total === 1 ? 'Report' : 'Reports'}
              </span>

              {/* List / Map switcher */}
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-slate-200)',
                  overflow: 'hidden'
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'list' ? 'var(--color-primary)' : '#ffffff',
                    color: viewMode === 'list' ? '#ffffff' : 'var(--color-slate-600)',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <List size={15} />
                  <span>List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: 'none',
                    borderLeft: '1px solid var(--color-slate-200)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'map' ? 'var(--color-primary)' : '#ffffff',
                    color: viewMode === 'map' ? '#ffffff' : 'var(--color-slate-600)',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <Map size={15} />
                  <span>Map</span>
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPublicIssues(pagination.page)}
                title="Refresh public reports"
              >
                <RefreshCw size={14} />
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="danger" title="Error loading public reports">
            {error}
          </Alert>
        )}

        {isLoading ? (
          <LoadingScreen message="Fetching published civic reports from database..." />
        ) : issues.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={hasActiveFilters ? 'No public issues match your criteria' : 'No public civic reports found'}
            description={
              hasActiveFilters
                ? 'Try broadening your search term or clearing category and status filters.'
                : 'There are currently no issues published on the open board. As citizens report infrastructure defects, they will appear here.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Search & Filters
                </Button>
              ) : isAuthenticated ? (
                <Link to={ROUTES.CREATE_ISSUE} className="btn btn-primary btn-sm">
                  <PlusCircle size={15} />
                  <span>Submit First Issue</span>
                </Link>
              ) : (
                <Link to={ROUTES.CREATE_ISSUE} className="btn btn-primary btn-sm">
                  <PlusCircle size={15} />
                  <span>Report a Civic Issue</span>
                </Link>
              )
            }
          />
        ) : viewMode === 'map' ? (
          <IssueMapView issues={issues} />
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

            <Pagination
              pagination={pagination}
              onPageChange={(p) => {
                fetchPublicIssues(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
