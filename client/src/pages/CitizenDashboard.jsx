import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, PlusCircle, Shield, Clock, MapPin, ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Card } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { IssueCard } from '../components/IssueCard.jsx';
import * as issueService from '../services/issueService.js';
import { getCitizenAnalytics } from '../services/analyticsService.js';
import { ROUTES } from '../utils/constants.js';

export function CitizenDashboard() {
  const { user } = useAuth();
  const [recentIssues, setRecentIssues] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoadingIssues(true);
        const [issuesRes, analyticsRes] = await Promise.allSettled([
          issueService.getMyIssues({ limit: 3 }),
          getCitizenAnalytics()
        ]);

        if (issuesRes.status === 'fulfilled') {
          setRecentIssues(issuesRes.value.issues || []);
          setTotalCount(issuesRes.value.pagination?.total || 0);
        }

        if (analyticsRes.status === 'fulfilled' && analyticsRes.value.success) {
          setAnalytics(analyticsRes.value.data);
        }
      } catch (err) {
        console.warn('Could not load citizen dashboard data:', err);
      } finally {
        setLoadingIssues(false);
      }
    }

    loadDashboardData();
  }, []);

  const activeReportsCount = analytics?.statusBreakdown
    ? (analytics.statusBreakdown.submitted || 0) +
      (analytics.statusBreakdown.assigned || 0) +
      (analytics.statusBreakdown.in_progress || 0) +
      (analytics.statusBreakdown.reopened || 0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Welcome Banner */}
      <div className="dashboard-welcome">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.85rem' }}>Citizen Portal</h1>
            <Badge variant="citizen">Citizen</Badge>
          </div>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '1rem' }}>
            Welcome back, <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>

        <Link to={ROUTES.CREATE_ISSUE} className="btn btn-primary">
          <PlusCircle size={18} />
          <span>Report New Civic Issue</span>
        </Link>
      </div>

      {/* Real Analytics Metrics Strip */}
      {analytics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}
        >
          {/* Card 1: Total Reports */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              border: '1px solid var(--color-slate-200)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-slate-500)', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Total Reports</span>
              <FileText size={18} className="text-blue-500" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-navy-950)', marginTop: '0.4rem' }}>
              {analytics.totalReports}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '0.2rem' }}>
              Lifetime submitted complaints
            </div>
          </div>

          {/* Card 2: Active / In Progress */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              border: '1px solid var(--color-slate-200)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-slate-500)', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Active Investigation</span>
              <Clock size={18} className="text-amber-500" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-navy-950)', marginTop: '0.4rem' }}>
              {activeReportsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '0.2rem' }}>
              Under review or field repair
            </div>
          </div>

          {/* Card 3: Resolved */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              border: '1px solid var(--color-slate-200)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-slate-500)', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Resolved Reports</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-navy-950)', marginTop: '0.4rem' }}>
              {analytics.resolvedReports}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '0.2rem' }}>
              Successfully completed work
            </div>
          </div>

          {/* Card 4: Satisfaction Rating */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              border: '1px solid var(--color-slate-200)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--color-slate-500)', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Your Satisfaction</span>
              <Star size={18} className="text-amber-400 fill-amber-400" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-navy-950)', marginTop: '0.4rem' }}>
              {analytics.averageSatisfactionRating !== null
                ? `${analytics.averageSatisfactionRating} / 5`
                : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '0.2rem' }}>
              {analytics.averageSatisfactionRating !== null
                ? 'Average feedback rating given'
                : 'No reviews submitted yet'}
            </div>
          </div>
        </div>
      )}

      {/* Reports Section: Real Database Backed */}
      <Card
        title="My Civic Reports"
        subtitle={
          totalCount > 0
            ? `You have filed ${totalCount} municipal ${totalCount === 1 ? 'report' : 'reports'}`
            : 'Tracking active and resolved complaints submitted by your account'
        }
        footer={
          totalCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link to={ROUTES.MY_REPORTS} className="btn btn-outline btn-sm">
                <span>View All ({totalCount}) Reports</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )
        }
      >
        {loadingIssues ? (
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', padding: '1rem 0' }}>
            Querying your report history...
          </p>
        ) : recentIssues.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Civic Reports Filed Yet"
            description="You have not submitted any municipal issue reports. When you encounter street defects, drainage issues, or public hazard concerns, submit them here for departmental review."
            action={
              <Link to={ROUTES.CREATE_ISSUE} className="btn btn-outline btn-sm">
                <PlusCircle size={15} />
                <span>Submit Your First Report</span>
              </Link>
            }
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.25rem'
            }}
          >
            {recentIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </Card>

      {/* Guidance and Workflow Information Cards */}
      <div className="dashboard-grid">
        <Card
          title="How Your Report Is Processed"
          subtitle="Transparent Municipal SLA"
        >
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--color-navy-800)', padding: 0 }}>
            <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Clock size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
              <span><strong>Triage:</strong> Issues are acknowledged and assigned to the relevant department within 24 hours.</span>
            </li>
            <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <MapPin size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
              <span><strong>Inspection:</strong> Field staff verify location, severity, and required resources.</span>
            </li>
            <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <Shield size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
              <span><strong>Verification:</strong> Completed work requires photo evidence before final closure.</span>
            </li>
          </ul>
        </Card>

        <Card
          title="Account Security"
          subtitle="Your Identity & Privacy"
        >
          <p style={{ fontSize: '0.9rem', color: 'var(--color-navy-700)', lineHeight: 1.6 }}>
            Your account is authenticated via server-side HttpOnly session tokens protected by Argon2id cryptographic hashing.
            Your email is never shared with third parties or publicly visible on issue boards.
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>Account Status:</span>
            <Badge variant="active">Active</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
