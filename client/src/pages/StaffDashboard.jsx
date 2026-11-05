import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  CheckSquare,
  Play,
  ExternalLink,
  Clock,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Card } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ResolveModal } from '../components/ResolveModal.jsx';
import { getStaffQueue, transitionIssue } from '../services/issueService.js';
import { getStaffAnalytics } from '../services/analyticsService.js';
import { STATUS_LABELS, CATEGORY_LABELS } from '../utils/constants.js';

export function StaffDashboard() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [activeResolveIssue, setActiveResolveIssue] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const [queueRes, analyticsRes] = await Promise.allSettled([
        getStaffQueue(params),
        getStaffAnalytics()
      ]);

      if (queueRes.status === 'fulfilled') {
        setIssues(queueRes.value.issues || []);
      } else {
        throw new Error(queueRes.reason?.message || 'Failed to load staff work queue');
      }

      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.success) {
        setAnalytics(analyticsRes.value.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load staff work queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  async function handleStartWork(issueId) {
    try {
      setActionLoadingId(issueId);
      await transitionIssue(issueId, {
        status: 'in_progress',
        reason: 'Staff technician commenced on-site work'
      });
      await loadDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to start work');
    } finally {
      setActionLoadingId(null);
    }
  }

  function handleResolved() {
    loadDashboardData();
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Municipal Staff Console</h1>
            <Badge variant="staff">Technician</Badge>
          </div>
          <p className="text-slate-300 text-sm">
            Technician: <strong>{user?.name || user?.fullName}</strong> ({user?.email}) · ID: {user?.id}
          </p>
        </div>
        <div className="text-right text-xs text-slate-400">
          Role-Certified by Server Session · Audit-Tracked
        </div>
      </div>

      {/* Staff Operational Metrics Strip */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Assigned Work Orders</span>
              <Wrench size={18} className="text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {analytics.totalAssignedWorkOrders}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Total tickets dispatched to you</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Active Work Orders</span>
              <ClipboardList size={18} className="text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {analytics.activeWorkOrders}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Assigned or in progress</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Completed Resolutions</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {analytics.completedResolutions}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Work resolved or verified closed</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Avg Resolution Time</span>
              <Clock size={18} className="text-indigo-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {analytics.averageResolutionHours > 0
                ? `${analytics.averageResolutionHours} hrs`
                : '—'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">From assignment to resolution</div>
          </div>
        </div>
      )}

      {/* Work Orders List */}
      <Card
        title="Assigned Work Orders"
        subtitle="Active complaints assigned to you for investigation or repair"
      >
        {/* Status Filter */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-wrap text-xs">
          <span className="font-semibold text-slate-600">Filter Status:</span>
          {['', 'assigned', 'in_progress', 'resolved', 'reopened'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === '' ? 'All Work Orders' : STATUS_LABELS[st] || st}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            <div className="inline-block animate-spin h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full mb-2" />
            <p>Loading assigned work queue from MongoDB...</p>
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No Work Orders Assigned"
            description="Your work queue currently has no active repair or investigation tickets. New assignments will appear here once civic reports are assigned by municipal dispatch."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase bg-slate-50">
                  <th className="p-3">Issue Number</th>
                  <th className="p-3">Title & Category</th>
                  <th className="p-3">Current Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((iss) => (
                  <tr key={iss._id || iss.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {iss.issueNumber}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-slate-900">{iss.title}</div>
                      <div className="text-xs text-slate-500">
                        {CATEGORY_LABELS[iss.category] || iss.category}
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          iss.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : iss.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : iss.status === 'reopened'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {STATUS_LABELS[iss.status] || iss.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {new Date(iss.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {['assigned', 'under_review', 'reopened'].includes(iss.status) && (
                          <button
                            onClick={() => handleStartWork(iss._id || iss.id)}
                            disabled={actionLoadingId === (iss._id || iss.id)}
                            className="btn btn-sm btn-outline inline-flex items-center gap-1 text-xs"
                          >
                            <Play size={12} />
                            <span>Start Work</span>
                          </button>
                        )}

                        {iss.status === 'in_progress' && (
                          <button
                            onClick={() => setActiveResolveIssue(iss)}
                            className="btn btn-sm btn-primary inline-flex items-center gap-1 text-xs"
                          >
                            <CheckSquare size={12} />
                            <span>Resolve</span>
                          </button>
                        )}

                        <Link
                          to={`/issues/${iss._id || iss.id}`}
                          className="btn btn-sm btn-ghost inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                        >
                          <ExternalLink size={13} />
                          <span>View</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Resolution Modal */}
      {activeResolveIssue && (
        <ResolveModal
          issue={activeResolveIssue}
          isOpen={Boolean(activeResolveIssue)}
          onClose={() => setActiveResolveIssue(null)}
          onResolved={() => {
            setActiveResolveIssue(null);
            handleResolved();
          }}
        />
      )}
    </div>
  );
}
