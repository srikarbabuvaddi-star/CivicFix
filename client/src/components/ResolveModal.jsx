import { useState } from 'react';
import PropTypes from 'prop-types';
import { resolveIssue } from '../services/issueService.js';

export function ResolveModal({ issue, isOpen, onClose, onResolved }) {
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !issue) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!resolutionNotes || resolutionNotes.trim().length < 10) {
      setError('Please provide detailed resolution notes (minimum 10 characters)');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await resolveIssue(issue.id || issue._id, {
        resolutionNotes: resolutionNotes.trim(),
        evidenceNotes: evidenceNotes.trim() || undefined
      });
      onResolved(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit resolution');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-emerald-900">
            Submit Issue Resolution
          </h3>
          <button
            onClick={onClose}
            className="text-emerald-500 hover:text-emerald-700 text-xl font-bold p-1 leading-none"
            type="button"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
            <p className="font-semibold text-slate-800">{issue.issueNumber}: {issue.title}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Work Completed / Resolution Summary *
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe repairs, materials used, inspection findings (min 10 characters)..."
              rows={4}
              required
              disabled={submitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              {resolutionNotes.length}/2000 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Evidence Notes / Verification Ref (Optional)
            </label>
            <input
              type="text"
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="e.g. Work Order #8821, Inspected by Supervisor Singh"
              disabled={submitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || resolutionNotes.trim().length < 10}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Mark as Resolved'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ResolveModal.propTypes = {
  issue: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onResolved: PropTypes.func.isRequired
};

