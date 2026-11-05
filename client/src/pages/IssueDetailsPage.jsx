import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Lock,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  Check,
  Building,
  User,
  Wrench,
  Star
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Card } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { Alert } from '../components/Alert.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { LocationPicker } from '../components/LocationPicker.jsx';
import { IssueTimeline } from '../components/IssueTimeline.jsx';
import { AssignModal } from '../components/AssignModal.jsx';
import { ResolveModal } from '../components/ResolveModal.jsx';
import { ReopenModal } from '../components/ReopenModal.jsx';
import { CitizenFeedbackModal } from '../components/CitizenFeedbackModal.jsx';
import * as issueService from '../services/issueService.js';
import * as feedbackService from '../services/feedbackService.js';
import {
  CATEGORY_LABELS,
  ISSUE_VISIBILITY,
  ROLES,
  ROUTES
} from '../utils/constants.js';

export function IssueDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [issue, setIssue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(location.state?.message || null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    location: { coordinates: [0, 0], address: '' },
    visibility: ''
  });
  const [editErrors, setEditErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Withdraw Confirmation
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Milestone 03 & 04 State & Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [startingWork, setStartingWork] = useState(false);

  const fetchIssue = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await issueService.getIssueById(id);
      setIssue(data);
      setEditForm({
        title: data.title,
        description: data.description,
        category: data.category,
        location: data.location,
        visibility: data.visibility
      });

      if (['resolved', 'closed'].includes(data.status)) {
        try {
          const fbRes = await feedbackService.getIssueFeedback(data.id || data._id);
          if (fbRes.success) {
            setFeedback(fbRes.data);
          }
        } catch {
          // If 404 or 403 (e.g. unprivileged viewer), feedback remains null
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to load report details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  const validateEdit = () => {
    const errs = {};
    if (!editForm.title.trim() || editForm.title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters';
    }
    if (!editForm.description.trim() || editForm.description.trim().length < 10) {
      errs.description = 'Description must be at least 10 characters';
    }
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!validateEdit()) return;

    setIsSaving(true);
    try {
      const updated = await issueService.updateIssue(id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        location: editForm.location,
        visibility: editForm.visibility
      });

      setIssue(updated);
      setIsEditing(false);
      setSuccessMessage('Report updated successfully!');
    } catch (err) {
      setEditErrors({ form: err.message || 'Failed to update report' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const updated = await issueService.withdrawIssue(id);
      setIssue(updated);
      setWithdrawModalOpen(false);
      setSuccessMessage('Report withdrawn successfully. Record is archived in municipal logs.');
    } catch (err) {
      setError(err.message || 'Failed to withdraw report');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Citizen verify & close
  const handleVerifyClose = async () => {
    if (!window.confirm('Confirm that the civic issue is resolved to your satisfaction?')) {
      return;
    }
    try {
      setVerifying(true);
      const updated = await issueService.verifyIssue(id);
      setIssue(updated);
      setSuccessMessage('Resolution confirmed! Thank you for helping keep our city functioning.');
    } catch (err) {
      alert(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // Staff start work
  const handleStartWork = async () => {
    try {
      setStartingWork(true);
      const updated = await issueService.transitionIssue(id, {
        status: 'in_progress',
        reason: 'Staff commenced on-site maintenance work'
      });
      setIssue(updated);
      setSuccessMessage('Ticket status advanced to In Progress.');
    } catch (err) {
      alert(err.message || 'Failed to start work');
    } finally {
      setStartingWork(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading report specifications..." />;
  }

  if (error || !issue) {
    return (
      <div style={{ maxWidth: '640px', margin: '3rem auto' }}>
        <Alert variant="danger" title="Unable to Access Issue">
          {error || 'This report may be private or does not exist.'}
        </Alert>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <Link to={ROUTES.EXPLORE} className="btn btn-outline">
            <ArrowLeft size={16} />
            <span>Browse Public Reports</span>
          </Link>
          {user && (
            <Link to={ROUTES.MY_REPORTS} className="btn btn-primary">
              <span>View My Reports</span>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[issue.category] || issue.category;
  const isPrivilegedUser = user && [ROLES.STAFF, ROLES.ADMIN].includes(user.role);
  const isAdmin = user && user.role === ROLES.ADMIN;
  const isAssignedStaff = user && user.role === ROLES.STAFF && issue.assigneeId && (issue.assigneeId.id === user.id || issue.assigneeId._id === user.id);

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '3rem' }} className="space-y-6">
      {/* Back breadcrumb & actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          to={
            !user
              ? ROUTES.EXPLORE
              : user.role === ROLES.CITIZEN
              ? ROUTES.MY_REPORTS
              : user.role === ROLES.STAFF
              ? ROUTES.STAFF_DASHBOARD
              : ROUTES.ADMIN_DASHBOARD
          }
          className="btn btn-outline btn-sm inline-flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          <span>
            {!user
              ? 'Back to Explore'
              : user.role === ROLES.CITIZEN
              ? 'Back to My Reports'
              : user.role === ROLES.STAFF
              ? 'Back to Staff Queue'
              : 'Back to Admin Console'}
          </span>
        </Link>

        {/* Action buttons if user is authorized */}
        {!isEditing && (
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && !['closed', 'rejected', 'withdrawn'].includes(issue.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignModalOpen(true)}
              >
                <Wrench size={14} />
                <span>{issue.assigneeId ? 'Reassign Dispatch' : 'Assign Department'}</span>
              </Button>
            )}

            {(isAssignedStaff || isAdmin) && ['assigned', 'under_review', 'reopened'].includes(issue.status) && (
              <Button
                variant="primary"
                size="sm"
                isLoading={startingWork}
                onClick={handleStartWork}
              >
                <span>Start Work</span>
              </Button>
            )}

            {(isAssignedStaff || isAdmin) && issue.status === 'in_progress' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setResolveModalOpen(true)}
              >
                <Check size={14} />
                <span>Submit Resolution</span>
              </Button>
            )}

            {issue.canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={14} />
                <span>Edit Report</span>
              </Button>
            )}

            {issue.canWithdraw && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setWithdrawModalOpen(true)}
              >
                <Trash2 size={14} />
                <span>Withdraw</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {successMessage && (
        <Alert variant="success" title="Success">
          {successMessage}
        </Alert>
      )}

      {/* Resolution Callout Banner for Resolved Tickets */}
      {issue.resolutionNotes && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-baseline flex-wrap gap-2">
                <h3 className="text-lg font-bold text-emerald-950">
                  {issue.status === 'closed' ? 'Issue Verified & Closed' : 'Field Resolution Completed'}
                </h3>
                {issue.resolvedAt && (
                  <span className="text-xs text-emerald-700">
                    Resolved: {new Date(issue.resolvedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="mt-2 text-sm text-emerald-900 bg-white/70 p-3 rounded-lg border border-emerald-200">
                <p className="font-semibold text-emerald-950 mb-1">Work Description:</p>
                <p className="whitespace-pre-wrap">{issue.resolutionNotes}</p>
                {issue.evidenceNotes && (
                  <p className="mt-2 text-xs text-emerald-800 italic">
                    Verification Note / Reference: {issue.evidenceNotes}
                  </p>
                )}
              </div>

              {/* Citizen Actions on Resolved Ticket */}
              {issue.status === 'resolved' && (issue.canVerify || isAdmin) && (
                <div className="mt-4 pt-3 border-t border-emerald-200 flex items-center justify-between flex-wrap gap-3">
                  <p className="text-xs text-emerald-800 font-medium">
                    As the citizen reporter, please verify whether this issue has been resolved.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReopenModalOpen(true)}
                    >
                      <RotateCcw size={14} />
                      <span>Reopen Issue</span>
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={verifying}
                      onClick={handleVerifyClose}
                    >
                      <Check size={14} />
                      <span>Confirm & Close</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Citizen Feedback Section for Resolved / Closed Issues */}
      {feedback && (
        <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h4 className="font-bold text-sky-950 flex items-center gap-2">
                <Star size={18} className="text-amber-500 fill-amber-500" />
                Citizen Resolution Feedback
              </h4>
              <p className="text-xs text-sky-700 mt-0.5">
                Submitted by reporting citizen
              </p>
            </div>
            <div className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-sky-200">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  className={star <= feedback.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}
                />
              ))}
              <span className="text-xs font-bold text-slate-700 ml-1">
                {feedback.rating}/5 ({feedback.resolutionQuality})
              </span>
            </div>
          </div>
          {feedback.comment && (
            <p className="mt-3 text-sm text-sky-900 bg-white/80 p-3 rounded-lg border border-sky-200 italic">
              "{feedback.comment}"
            </p>
          )}
        </div>
      )}

      {/* Button to prompt citizen feedback if not submitted yet */}
      {!feedback && ['resolved', 'closed'].includes(issue.status) && (issue.canVerify || (user && user.id === (issue.reporterId?.id || issue.reporterId?._id || issue.reporterId))) && (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h5 className="font-semibold text-slate-800 text-sm">Have a moment to rate this resolution?</h5>
            <p className="text-xs text-slate-500">Your feedback helps municipal departments improve service delivery.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFeedbackModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Star size={15} className="text-amber-500 fill-amber-500" />
            <span>Rate Resolution Quality</span>
          </Button>
        </div>
      )}

      {/* Reopened Banner */}
      {issue.status === 'reopened' && issue.reopenedReason && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-950">
          <h4 className="font-bold flex items-center gap-2">
            <RotateCcw size={18} className="text-amber-600" />
            Ticket Reopened by Reporter
          </h4>
          <p className="text-sm mt-1 bg-white/80 p-2.5 rounded border border-amber-200">
            {issue.reopenedReason}
          </p>
        </div>
      )}

      {/* Withdraw confirmation dialog */}
      {withdrawModalOpen && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-5 mb-4">
          <div className="flex gap-3 items-start">
            <ShieldAlert size={24} className="text-rose-600 flex-shrink-0" />
            <div>
              <h3 className="text-base font-bold text-rose-900">Confirm Report Withdrawal</h3>
              <p className="text-sm text-rose-800 mt-1 mb-4">
                Are you sure you want to withdraw <strong>{issue.issueNumber}</strong>? Once withdrawn,
                municipal inspection will be halted. The record remains in your history with a withdrawn status.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWithdrawModalOpen(false)}
                  disabled={isWithdrawing}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isWithdrawing}
                  onClick={handleConfirmWithdraw}
                >
                  Yes, Withdraw Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editing Form OR View Display */}
      {isEditing ? (
        <Card title={`Edit Report: ${issue.issueNumber}`}>
          {editErrors.form && (
            <Alert variant="danger">{editErrors.form}</Alert>
          )}

          <form onSubmit={handleSaveEdit}>
            <div className="form-group">
              <label htmlFor="edit-title" className="form-label">Title</label>
              <input
                id="edit-title"
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="form-input"
                required
              />
              {editErrors.title && <span className="form-error">{editErrors.title}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="edit-category" className="form-label">Category</label>
              <select
                id="edit-category"
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="form-input"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-description" className="form-label">Description</label>
              <textarea
                id="edit-description"
                rows={5}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="form-input"
                required
              />
              {editErrors.description && <span className="form-error">{editErrors.description}</span>}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <LocationPicker
                value={editForm.location}
                onChange={(loc) => setEditForm({ ...editForm, location: loc })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Visibility</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="edit-visibility"
                    value={ISSUE_VISIBILITY.PUBLIC}
                    checked={editForm.visibility === ISSUE_VISIBILITY.PUBLIC}
                    onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                  />
                  <span>Public</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="edit-visibility"
                    value={ISSUE_VISIBILITY.PRIVATE}
                    checked={editForm.visibility === ISSUE_VISIBILITY.PRIVATE}
                    onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                  />
                  <span>Private</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--color-slate-200)', paddingTop: '1rem' }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          {/* Header Info */}
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-200 mb-6 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono font-bold text-sm bg-slate-100 text-slate-800 px-2.5 py-1 rounded">
                  {issue.issueNumber}
                </span>

                <span className="bg-teal-50 text-teal-800 font-semibold text-xs px-2.5 py-1 rounded">
                  {categoryLabel}
                </span>

                {issue.visibility === ISSUE_VISIBILITY.PRIVATE ? (
                  <span className="inline-flex items-center gap-1 text-xs text-rose-800 bg-rose-50 px-2 py-0.5 rounded font-semibold">
                    <Lock size={12} />
                    Private Report
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                    <Eye size={12} />
                    Public Report
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-900 mt-2">
                {issue.title}
              </h1>
            </div>

            <div className="text-right">
              <StatusBadge status={issue.status} />
              {isPrivilegedUser && issue.priority && (
                <div className="mt-1 text-xs text-slate-500">
                  Priority: <strong className="uppercase">{issue.priority}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Department & Staff Assignment Badge Card */}
          {(issue.departmentId || issue.assigneeId || issue.department) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                  <Building size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-semibold">Department Responsible</p>
                  <p className="text-sm font-bold text-slate-900">
                    {issue.departmentId?.name || issue.department?.name || 'General Municipal Works'}
                  </p>
                </div>
              </div>

              {issue.assigneeId && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">Assigned Technician</p>
                    <p className="text-sm font-bold text-slate-900">
                      {issue.assigneeId?.name || issue.assigneeId?.fullName || 'Technician'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description Section */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">
              Incident Description
            </h2>
            <div className="bg-slate-50 p-4 rounded-xl text-slate-900 leading-relaxed text-sm whitespace-pre-wrap border border-slate-200">
              {issue.description}
            </div>
          </div>

          {/* Location Section */}
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">
              Incident Location
            </h2>
            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={18} className="text-teal-600" />
                <strong className="text-sm text-slate-900">{issue.location?.address || 'Street Address Not Provided'}</strong>
              </div>

              {issue.location?.coordinates && (
                <div className="text-xs text-slate-500 font-mono pl-6">
                  Coordinates: Lat {issue.location.coordinates[1].toFixed(5)}, Lng {issue.location.coordinates[0].toFixed(5)}
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Metadata Footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              <span>Reported: <strong>{new Date(issue.createdAt).toLocaleDateString()}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <Clock size={14} />
              <span>Updated: <strong>{new Date(issue.updatedAt).toLocaleDateString()}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-teal-600" />
              <span>Record ID: <strong className="font-mono">{issue.id}</strong></span>
            </div>
          </div>
        </Card>
      )}

      {/* Append-Only Issue Audit Trail Component */}
      <Card
        title="Audit Trail & Lifecycle Provenance"
        subtitle="Chronological log of submissions, assignments, technician field work, and verification"
      >
        <IssueTimeline issueId={issue.id} />
      </Card>

      {/* Milestone 03 Modals */}
      {assignModalOpen && (
        <AssignModal
          issue={issue}
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onAssigned={(updated) => {
            setIssue(updated);
            setSuccessMessage('Ticket assignment successfully updated in database!');
          }}
        />
      )}

      {resolveModalOpen && (
        <ResolveModal
          issue={issue}
          isOpen={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          onResolved={(updated) => {
            setIssue(updated);
            setSuccessMessage('Resolution submitted successfully! Report is awaiting citizen verification.');
          }}
        />
      )}

      {reopenModalOpen && (
        <ReopenModal
          issue={issue}
          isOpen={reopenModalOpen}
          onClose={() => setReopenModalOpen(false)}
          onReopened={(updated) => {
            setIssue(updated);
            setSuccessMessage('Issue has been reopened with your stated reason.');
          }}
        />
      )}

      {/* Citizen Feedback Modal */}
      {feedbackModalOpen && (
        <CitizenFeedbackModal
          issueId={issue.id || issue._id}
          issueNumber={issue.issueNumber}
          onClose={() => setFeedbackModalOpen(false)}
          onSuccess={(newFeedback) => {
            setFeedback(newFeedback);
            setFeedbackModalOpen(false);
            setSuccessMessage('Thank you! Your feedback has been recorded.');
          }}
        />
      )}
    </div>
  );
}
