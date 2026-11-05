import { useState } from 'react';
import PropTypes from 'prop-types';
import { reopenIssue } from '../services/issueService.js';

export function ReopenModal({ issue, isOpen, onClose, onReopened }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !issue) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!reason || reason.trim().length < 10) {
      setError('Please provide a detailed reason why this issue remains unresolved (minimum 10 characters)');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await reopenIssue(issue.id || issue._id, {
        reason: reason.trim()
      });
      onReopened(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reopen issue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-amber-900">
            Reopen Civic Issue Report
          </h3>
          <button
            onClick={onClose}
            className="text-amber-500 hover:text-amber-700 text-xl font-bold p-1 leading-none"
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
              Reason for Reopening *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why the reported problem is not fixed or requires additional work (min 10 chars)..."
              rows={4}
              required
              disabled={submitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              {reason.length}/1000 characters
            </p>
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
              disabled={submitting || reason.trim().length < 10}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {submitting ? 'Reopening...' : 'Confirm Reopen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ReopenModal.propTypes = {
  issue: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onReopened: PropTypes.func.isRequired
};

