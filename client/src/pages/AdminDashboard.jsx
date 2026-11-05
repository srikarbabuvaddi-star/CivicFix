import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Server,
  Activity,
  Database,
  CheckCircle,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  ExternalLink,
  ClipboardList,
  BarChart3,
  MapPin,
  TrendingUp,
  Star,
  Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Card } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { Badge } from '../components/Badge.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { AssignModal } from '../components/AssignModal.jsx';
import { getHealth } from '../services/authService.js';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../services/departmentService.js';
import {
  getStaffDirectory,
  assignStaffDepartment,
  updateStaffStatus
} from '../services/adminService.js';
import { getTriageQueue } from '../services/issueService.js';
import { getAdminAnalytics, getGeographicHotspots } from '../services/analyticsService.js';
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  ISSUE_CATEGORIES
} from '../utils/constants.js';

export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('triage'); // 'triage' | 'departments' | 'staff' | 'telemetry'

  // Telemetry state
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);

  // Departments state
  const [departments, setDepartments] = useState([]);
  const [deptsLoading, setDeptsLoading] = useState(false);
  const [deptFormOpen, setDeptFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptCategories, setDeptCategories] = useState([]);
  const [deptServiceArea, setDeptServiceArea] = useState('');
  const [deptError, setDeptError] = useState(null);
  const [deptSaving, setDeptSaving] = useState(false);

  // Staff state
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState(null);
  const [actionLoadingStaffId, setActionLoadingStaffId] = useState(null);

  // Triage state
  const [triageIssues, setTriageIssues] = useState([]);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState(null);
  const [activeAssignIssue, setActiveAssignIssue] = useState(null);

  // Analytics & Hotspots state
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [hotspotCategory, setHotspotCategory] = useState('');
  const [hotspotPeriod, setHotspotPeriod] = useState('all');

  // Analytics fetch
  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      const [analyticsRes, hotspotsRes] = await Promise.all([
        getAdminAnalytics(),
        getGeographicHotspots({
          category: hotspotCategory || undefined,
          timePeriod: hotspotPeriod !== 'all' ? hotspotPeriod : undefined,
          minThreshold: 2
        })
      ]);
      if (analyticsRes.success) setAdminAnalytics(analyticsRes.data);
      if (hotspotsRes.success) setHotspots(hotspotsRes.data);
    } catch (err) {
      setAnalyticsError(err.message || 'Failed to load platform analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [hotspotCategory, hotspotPeriod]);

  // Health fetch
  const fetchHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      setHealthError(null);
      const data = await getHealth();
      setHealthData(data);
    } catch (err) {
      setHealthError(err.message || 'Failed to fetch backend health status');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Departments fetch
  const fetchDepartments = useCallback(async () => {
    try {
      setDeptsLoading(true);
      setDeptError(null);
      const data = await getDepartments();
      setDepartments(data || []);
    } catch (err) {
      setDeptError(err.message || 'Failed to fetch departments');
    } finally {
      setDeptsLoading(false);
    }
  }, []);

  // Staff fetch
  const fetchStaff = useCallback(async () => {
    try {
      setStaffLoading(true);
      setStaffError(null);
      const data = await getStaffDirectory();
      setStaffList(data || []);
    } catch (err) {
      setStaffError(err.message || 'Failed to fetch staff members');
    } finally {
      setStaffLoading(false);
    }
  }, []);

  // Triage fetch
  const fetchTriage = useCallback(async () => {
    try {
      setTriageLoading(true);
      setTriageError(null);
      const data = await getTriageQueue();
      setTriageIssues(data.issues || []);
    } catch (err) {
      setTriageError(err.message || 'Failed to fetch triage issues');
    } finally {
      setTriageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'telemetry') fetchHealth();
    else if (activeTab === 'departments') fetchDepartments();
    else if (activeTab === 'staff') {
      fetchStaff();
      fetchDepartments();
    } else if (activeTab === 'triage') fetchTriage();
    else if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, fetchHealth, fetchDepartments, fetchStaff, fetchTriage, fetchAnalytics]);

  // Handle department form submit
  async function handleSaveDepartment(e) {
    e.preventDefault();
    setDeptError(null);

    if (!deptName.trim()) {
      setDeptError('Department name is required');
      return;
    }
    if (deptCategories.length === 0) {
      setDeptError('Please select at least one handled category');
      return;
    }

    try {
      setDeptSaving(true);
      const payload = {
        name: deptName.trim(),
        description: deptDesc.trim(),
        categoriesHandled: deptCategories,
        serviceArea: deptServiceArea.trim() || undefined
      };

      if (editingDept) {
        await updateDepartment(editingDept.id, payload);
      } else {
        await createDepartment(payload);
      }

      setDeptFormOpen(false);
      setEditingDept(null);
      setDeptName('');
      setDeptDesc('');
      setDeptCategories([]);
      setDeptServiceArea('');
      await fetchDepartments();
    } catch (err) {
      setDeptError(err.message || 'Failed to save department');
    } finally {
      setDeptSaving(false);
    }
  }

  // Handle deactivation toggle
  async function handleToggleDeptStatus(dept) {
    try {
      await updateDepartment(dept.id, { isActive: !dept.isActive });
      await fetchDepartments();
    } catch (err) {
      alert(err.message || 'Failed to update department status');
    }
  }

  // Handle delete department
  async function handleDeleteDept(deptId) {
    if (!window.confirm('Are you sure you want to delete this department? Deletion will be rejected if referenced by reports or staff.')) {
      return;
    }
    try {
      await deleteDepartment(deptId);
      await fetchDepartments();
    } catch (err) {
      alert(err.message || 'Failed to delete department');
    }
  }

  // Handle staff status toggle
  async function handleToggleStaffStatus(staff) {
    const nextStatus = staff.status === 'active' ? 'suspended' : 'active';
    try {
      setActionLoadingStaffId(staff.id);
      await updateStaffStatus(staff.id, nextStatus);
      await fetchStaff();
    } catch (err) {
      alert(err.message || 'Failed to update staff status');
    } finally {
      setActionLoadingStaffId(null);
    }
  }

  // Handle staff department change
  async function handleStaffDeptChange(staffId, newDeptId) {
    try {
      setActionLoadingStaffId(staffId);
      await assignStaffDepartment(staffId, newDeptId || null);
      await fetchStaff();
    } catch (err) {
      alert(err.message || 'Failed to change staff department');
    } finally {
      setActionLoadingStaffId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Administrator Operations Console</h1>
            <Badge variant="admin">Civic Administrator</Badge>
          </div>
          <p className="text-slate-300 text-sm">
            Administrator: <strong>{user?.name || user?.fullName}</strong> ({user?.email}) · Security Tier 1
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'telemetry' && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchHealth}
              isLoading={healthLoading}
            >
              <RefreshCw size={14} />
              <span>Refresh Telemetry</span>
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-sm font-medium space-x-6">
        <button
          onClick={() => setActiveTab('triage')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'triage'
              ? 'border-teal-600 text-teal-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Issue Triage & Assignments ({triageIssues.length})
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'departments'
              ? 'border-teal-600 text-teal-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Department Management ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'staff'
              ? 'border-teal-600 text-teal-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff Directory ({staffList.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? 'border-teal-600 text-teal-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Analytics & Hotspots
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'telemetry'
              ? 'border-teal-600 text-teal-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          System Telemetry & Health
        </button>
      </div>

      {/* TAB 1: TRIAGE & ASSIGNMENTS */}
      {activeTab === 'triage' && (
        <Card
          title="Civic Issue Triage & Routing Queue"
          subtitle="Real reports submitted by citizens requiring municipal department assignment"
        >
          {triageError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {triageError}
            </div>
          )}

          {triageLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <div className="inline-block animate-spin h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full mb-2" />
              <p>Loading triage queue from database...</p>
            </div>
          ) : triageIssues.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No Pending Triage Tickets"
              description="There are currently no civic reports waiting for departmental assignment. All active issues have been routed."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold uppercase">
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Title & Citizen</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Department / Assignee</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {triageIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-semibold text-teal-800 text-xs">
                        {issue.issueNumber}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-slate-900 truncate">{issue.title}</p>
                        <p className="text-xs text-slate-500">
                          Reporter: {issue.reporterId?.name || issue.reporterId?.fullName || 'Citizen'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {CATEGORY_LABELS[issue.category] || issue.category}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {issue.departmentId?.name ? (
                          <div>
                            <p className="font-medium text-slate-800">{issue.departmentId.name}</p>
                            <p className="text-slate-500">
                              {issue.assigneeId?.name || issue.assigneeId?.fullName || 'Unassigned'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-medium">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                          {STATUS_LABELS[issue.status] || issue.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setActiveAssignIssue(issue)}
                          className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700"
                        >
                          {issue.assigneeId ? 'Reassign' : 'Assign'}
                        </button>
                        <Link
                          to={`/issues/${issue.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-100"
                        >
                          <ExternalLink size={12} />
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: DEPARTMENT MANAGEMENT */}
      {activeTab === 'departments' && (
        <Card
          title="Municipal Departments"
          subtitle="Configure operational divisions, category responsibilities, and service zones"
        >
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-slate-500">
              Unique normalized names enforced. Deletion blocked if referenced by tickets or staff.
            </p>
            <button
              onClick={() => {
                setEditingDept(null);
                setDeptName('');
                setDeptDesc('');
                setDeptCategories([]);
                setDeptServiceArea('Municipality-Wide');
                setDeptFormOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700"
            >
              <Plus size={14} />
              Add Department
            </button>
          </div>

          {/* Department Creation / Edit Form Modal */}
          {deptFormOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">
                    {editingDept ? 'Edit Department' : 'Create New Department'}
                  </h3>
                  <button
                    onClick={() => setDeptFormOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                  >
                    &times;
                  </button>
                </div>
                <form onSubmit={handleSaveDepartment} className="p-6 space-y-4">
                  {deptError && (
                    <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                      {deptError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      placeholder="e.g. Roads & Infrastructure"
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Service Area Zone
                    </label>
                    <input
                      type="text"
                      value={deptServiceArea}
                      onChange={(e) => setDeptServiceArea(e.target.value)}
                      placeholder="e.g. Municipality-Wide or Ward 1-5"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={deptDesc}
                      onChange={(e) => setDeptDesc(e.target.value)}
                      placeholder="Operational mission, scope of work..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Categories Handled *
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.values(ISSUE_CATEGORIES).map((cat) => (
                        <label key={cat} className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={deptCategories.includes(cat)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDeptCategories([...deptCategories, cat]);
                              } else {
                                setDeptCategories(deptCategories.filter((c) => c !== cat));
                              }
                            }}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>{CATEGORY_LABELS[cat] || cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeptFormOpen(false)}
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={deptSaving}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                    >
                      {deptSaving ? 'Saving...' : 'Save Department'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {deptsLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <div className="inline-block animate-spin h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full mb-2" />
              <p>Loading departments...</p>
            </div>
          ) : departments.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm italic">
              No departments configured yet. Click &apos;Add Department&apos; to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold uppercase">
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Service Area</th>
                    <th className="py-3 px-4">Categories Handled</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{dept.name}</p>
                        {dept.description && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">{dept.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {dept.serviceArea || 'Municipality-Wide'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {dept.categoriesHandled?.map((cat) => (
                            <span key={cat} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            dept.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {dept.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingDept(dept);
                            setDeptName(dept.name);
                            setDeptDesc(dept.description || '');
                            setDeptCategories(dept.categoriesHandled || []);
                            setDeptServiceArea(dept.serviceArea || '');
                            setDeptFormOpen(true);
                          }}
                          className="p-1 text-slate-600 hover:text-teal-600"
                          title="Edit Department"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleDeptStatus(dept)}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            dept.isActive
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {dept.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteDept(dept.id)}
                          className="p-1 text-rose-500 hover:text-rose-700"
                          title="Delete Department"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 3: STAFF DIRECTORY */}
      {activeTab === 'staff' && (
        <Card
          title="Municipal Staff Directory"
          subtitle="Manage technician assignments to departments and toggle account status"
        >
          {staffError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {staffError}
            </div>
          )}

          {staffLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              <div className="inline-block animate-spin h-6 w-6 border-2 border-teal-600 border-t-transparent rounded-full mb-2" />
              <p>Loading staff directory...</p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm italic">
              No staff members registered in the database. Provision staff users using the CLI seed command.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold uppercase">
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Department Membership</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {staff.name || staff.fullName}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                        {staff.email}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={staff.departmentId?.id || staff.departmentId?._id || ''}
                          onChange={(e) => handleStaffDeptChange(staff.id, e.target.value)}
                          disabled={actionLoadingStaffId === staff.id || staff.status !== 'active'}
                          className="px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                        >
                          <option value="">-- Unassigned --</option>
                          {departments
                            .filter((d) => d.isActive)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            staff.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {staff.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleStaffStatus(staff)}
                          disabled={actionLoadingStaffId === staff.id}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded text-xs font-medium ${
                            staff.status === 'active'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {staff.status === 'active' ? (
                            <>
                              <UserX size={12} /> Suspend
                            </>
                          ) : (
                            <>
                              <UserCheck size={12} /> Activate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB 4: ANALYTICS & HOTSPOTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {analyticsError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
              {analyticsError}
            </div>
          )}

          {analyticsLoading && !adminAnalytics ? (
            <p className="text-slate-500 text-sm">Aggregating platform metrics and geospatial hotspots from MongoDB...</p>
          ) : adminAnalytics ? (
            <>
              {/* Executive Metrics Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Total Platform Reports</span>
                    <BarChart3 size={18} className="text-blue-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {adminAnalytics.totalIssues}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">All complaints filed in database</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Platform Resolution Rate</span>
                    <TrendingUp size={18} className="text-emerald-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {adminAnalytics.resolutionRatePercent}%
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Tickets resolved or closed</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Citizen Satisfaction</span>
                    <Star size={18} className="text-amber-400 fill-amber-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {adminAnalytics.averageCitizenRating !== null ? `${adminAnalytics.averageCitizenRating} / 5` : '—'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Based on verified citizen feedback</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Active Work Orders</span>
                    <ClipboardList size={18} className="text-indigo-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {(adminAnalytics.statusBreakdown?.submitted || 0) +
                      (adminAnalytics.statusBreakdown?.assigned || 0) +
                      (adminAnalytics.statusBreakdown?.in_progress || 0) +
                      (adminAnalytics.statusBreakdown?.reopened || 0)}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Requiring departmental action</div>
                </div>
              </div>

              {/* Department Workloads & Category Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Department Workload & Performance" subtitle="Real-time ticket load across active bureaus">
                  {adminAnalytics.departmentWorkload?.length === 0 ? (
                    <p className="text-slate-500 text-sm">No department assignments recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {adminAnalytics.departmentWorkload.map((dept) => (
                        <div key={dept.departmentId} className="py-2.5 flex items-center justify-between text-sm">
                          <div>
                            <div className="font-semibold text-slate-900">{dept.departmentName}</div>
                            <div className="text-xs text-slate-500">
                              Active: {dept.activeCount} · Resolved: {dept.resolvedCount}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                            {dept.totalAssigned} assigned
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card title="Category Distribution" subtitle="Volume of civic reports by infrastructure domain">
                  <div className="space-y-2.5 text-sm">
                    {Object.entries(adminAnalytics.categoryBreakdown || {}).map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium capitalize">{CATEGORY_LABELS[cat] || cat}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-teal-600 h-2 rounded-full"
                              style={{
                                width: `${adminAnalytics.totalIssues > 0 ? (count / adminAnalytics.totalIssues) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <span className="font-mono text-xs font-semibold text-slate-600 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Geographic Hotspots with Location Privacy Policy */}
              <Card
                title="Geographic Issue Hotspots"
                subtitle="Aggregated spatial clusters with minimum privacy threshold (>= 2 reports)"
              >
                {/* Privacy Warning Banner */}
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 mb-4">
                  <Shield size={16} className="text-blue-600 flex-shrink-0" />
                  <span>
                    <strong>Location Privacy Policy:</strong> Coordinates are clustered into neighborhood grid cells (~1.1km). Single isolated reports are omitted to protect citizen anonymity.
                  </span>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mb-4 text-xs flex-wrap">
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <MapPin size={14} />
                    <span>Filter Hotspots:</span>
                  </div>
                  <select
                    value={hotspotCategory}
                    onChange={(e) => setHotspotCategory(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 bg-white"
                  >
                    <option value="">All Categories</option>
                    {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                      <option key={k} value={k}>{l}</option>
                    ))}
                  </select>
                  <select
                    value={hotspotPeriod}
                    onChange={(e) => setHotspotPeriod(e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 bg-white"
                  >
                    <option value="all">All Time</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={fetchAnalytics}>
                    <RefreshCw size={12} />
                    <span>Refresh</span>
                  </Button>
                </div>

                {hotspots.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm bg-slate-50 rounded-lg">
                    <MapPin size={28} className="mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">No Geographic Clusters Identified</p>
                    <p className="text-xs text-slate-500 mt-1">
                      No neighborhood grid cell meets the minimum threshold of 2 civic reports for the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase bg-slate-50">
                          <th className="p-3">Grid Coordinates</th>
                          <th className="p-3">Report Count</th>
                          <th className="p-3">Dominant Category</th>
                          <th className="p-3">Cluster Density</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {hotspots.map((h, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono text-xs text-slate-800">
                              [{h.coordinates[1].toFixed(2)}° N, {h.coordinates[0].toFixed(2)}° E]
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-900 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-xs">
                                {h.count} reports
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-xs font-semibold capitalize text-slate-700">
                                {CATEGORY_LABELS[h.primaryCategory] || h.primaryCategory}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  h.count >= 5
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-50 text-amber-800'
                                }`}
                              >
                                {h.count >= 5 ? 'High Density' : 'Moderate Cluster'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 5: TELEMETRY & HEALTH */}
      {activeTab === 'telemetry' && (
        <Card
          title="Live Backend & Database Health"
          subtitle="Real-time telemetry reported by Express & MongoDB Mongoose connection"
        >
          {healthLoading && !healthData ? (
            <p className="text-slate-500 text-sm">Querying backend service diagnostics...</p>
          ) : healthError ? (
            <p className="text-rose-600 text-sm">{healthError}</p>
          ) : healthData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase mb-1">
                  <Server size={14} />
                  <span>Service Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-600" />
                  <strong className="text-lg uppercase text-slate-800">{healthData.status}</strong>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase mb-1">
                  <Database size={14} />
                  <span>Database Connectivity</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-600" />
                  <strong className="text-lg capitalize text-slate-800">{healthData.database}</strong>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 text-xs uppercase mb-1">
                  <Activity size={14} />
                  <span>Service Uptime</span>
                </div>
                <strong className="text-lg text-slate-800">{healthData.uptimeSeconds} seconds</strong>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 text-xs uppercase mb-1">Environment</div>
                <strong className="text-lg capitalize text-slate-800">{healthData.environment}</strong>
              </div>
            </div>
          ) : null}
        </Card>
      )}

      {/* Assignment Modal */}
      {activeAssignIssue && (
        <AssignModal
          issue={activeAssignIssue}
          isOpen={Boolean(activeAssignIssue)}
          onClose={() => setActiveAssignIssue(null)}
          onAssigned={() => fetchTriage()}
        />
      )}
    </div>
  );
}
