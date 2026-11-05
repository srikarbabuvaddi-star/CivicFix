import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getDepartments, suggestDepartment } from '../services/departmentService.js';
import { getStaffDirectory } from '../services/adminService.js';
import { assignIssue, reassignIssue } from '../services/issueService.js';

export function AssignModal({ issue, isOpen, onClose, onAssigned }) {
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [reason, setReason] = useState('');
  const [suggestedDept, setSuggestedDept] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isReassignment = Boolean(issue?.assigneeId);

  useEffect(() => {
    if (!isOpen || !issue) return;

    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch active departments
        const deptsData = await getDepartments({ activeOnly: true });
        if (isMounted) setDepartments(deptsData || []);

        // 2. Fetch category suggestion
        if (issue.category) {
          try {
            const suggestion = await suggestDepartment(issue.category);
            if (isMounted && suggestion) {
              setSuggestedDept(suggestion);
              if (!issue.departmentId) {
                setSelectedDeptId(suggestion.id);
              }
            }
          } catch {
            // Suggestion is best-effort
          }
        }

        if (issue.departmentId) {
          const deptIdStr = typeof issue.departmentId === 'object' ? issue.departmentId.id || issue.departmentId._id : issue.departmentId;
          setSelectedDeptId(deptIdStr);
        }

        if (issue.assigneeId) {
          const staffIdStr = typeof issue.assigneeId === 'object' ? issue.assigneeId.id || issue.assigneeId._id : issue.assigneeId;
          setSelectedStaffId(staffIdStr);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load assignment options');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, issue]);

  // When selectedDeptId changes, load staff members belonging to that department
  useEffect(() => {
    if (!selectedDeptId) {
      setStaffList([]);
      return;
    }

    let isMounted = true;
    async function loadStaff() {
      try {
        const staff = await getStaffDirectory({ departmentId: selectedDeptId, status: 'active' });
        if (isMounted) {
          setStaffList(staff || []);
          if (!staff.some((s) => s.id === selectedStaffId)) {
            setSelectedStaffId('');
          }
        }
      } catch {
        if (isMounted) setStaffList([]);
      }
    }

    loadStaff();

    return () => {
      isMounted = false;
    };
  }, [selectedDeptId, selectedStaffId]);

  if (!isOpen || !issue) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!selectedDeptId) {
      setError('Please select a department');
      return;
    }
    if (!selectedStaffId) {
      setError('Please select a staff technician');
      return;
    }
    if (isReassignment && (!reason || reason.trim().length < 5)) {
      setError('A reassignment reason (at least 5 characters) is required');
      return;
    }

    try {
      setSubmitting(true);
      const actionFn = isReassignment ? reassignIssue : assignIssue;
      const updatedIssue = await actionFn(issue.id || issue._id, {
        departmentId: selectedDeptId,
        assigneeId: selectedStaffId,
        reason: reason.trim() || undefined
      });

      onAssigned(updatedIssue);
      onClose();
    } catch (err) {
      setError(err.message || 'Assignment failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            {isReassignment ? 'Reassign Civic Issue' : 'Assign Civic Issue'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
            type="button"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm">
            <p className="font-semibold text-slate-800">{issue.issueNumber}: {issue.title}</p>
            <p className="text-xs text-slate-500 capitalize mt-0.5">Category: {issue.category}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          {suggestedDept && !selectedDeptId && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded text-xs text-teal-800 flex justify-between items-center">
              <span>Suggested Department: <strong>{suggestedDept.name}</strong></span>
              <button
                type="button"
                onClick={() => setSelectedDeptId(suggestedDept.id)}
                className="ml-2 px-2 py-1 bg-teal-600 text-white rounded text-xs hover:bg-teal-700"
              >
                Apply
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Responsible Department *
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              disabled={loading || submitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            >
              <option value="">-- Select Active Department --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.serviceArea ? `(${d.serviceArea})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assigned Staff Technician *
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              disabled={!selectedDeptId || loading || submitting}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              required
            >
              <option value="">
                {!selectedDeptId
                  ? '-- Select department first --'
                  : staffList.length === 0
                  ? '-- No active staff in this department --'
                  : '-- Select Staff Member --'}
              </option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.fullName} ({s.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assignment Notes / Reason {isReassignment ? '*' : '(Optional)'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isReassignment
                  ? 'State why this ticket is being transferred (min 5 chars)...'
                  : 'Optional instructions or urgency notes for the technician...'
              }
              rows={3}
              required={isReassignment}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
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
              disabled={submitting || loading || !selectedDeptId || !selectedStaffId}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? 'Assigning...' : isReassignment ? 'Confirm Reassignment' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

AssignModal.propTypes = {
  issue: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAssigned: PropTypes.func.isRequired
};

