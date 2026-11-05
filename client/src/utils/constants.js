export const ROLES = {
  CITIZEN: 'citizen',
  STAFF: 'staff',
  ADMIN: 'admin'
};

export const ROLE_LABELS = {
  citizen: 'Citizen Reporter',
  staff: 'Municipal Staff',
  admin: 'Civic Administrator'
};

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
};

export const ISSUE_CATEGORIES = {
  ROADS: 'roads',
  WASTE: 'waste',
  STREETLIGHT: 'streetlight',
  WATER: 'water',
  DRAINAGE: 'drainage',
  OTHER: 'other'
};

export const CATEGORY_LABELS = {
  roads: 'Roads & Pavements',
  waste: 'Waste & Sanitation',
  streetlight: 'Streetlighting',
  water: 'Water Supply',
  drainage: 'Drainage & Sewage',
  other: 'Other Civic Concern'
};

export const ISSUE_STATUS = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REOPENED: 'reopened',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

export const ISSUE_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private'
};

export const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn'
};

export const AUDIT_EVENT_TYPE = {
  CREATED: 'created',
  STATUS_CHANGED: 'status_changed',
  ASSIGNED: 'assigned',
  REASSIGNED: 'reassigned',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REOPENED: 'reopened',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

export const AUDIT_EVENT_LABELS = {
  created: 'Report Submitted',
  status_changed: 'Status Updated',
  assigned: 'Assigned to Staff',
  reassigned: 'Reassigned',
  resolved: 'Resolution Completed',
  closed: 'Verified & Closed',
  reopened: 'Report Reopened',
  rejected: 'Report Rejected',
  withdrawn: 'Report Withdrawn'
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  CITIZEN_DASHBOARD: '/dashboard/citizen',
  STAFF_DASHBOARD: '/dashboard/staff',
  ADMIN_DASHBOARD: '/dashboard/admin',
  EXPLORE: '/explore',
  CREATE_ISSUE: '/issues/new',
  MY_REPORTS: '/my-reports',
  ISSUE_DETAILS: '/issues/:id'
};

export function getDashboardPathForRole(role) {
  switch (role) {
    case ROLES.ADMIN:
      return ROUTES.ADMIN_DASHBOARD;
    case ROLES.STAFF:
      return ROUTES.STAFF_DASHBOARD;
    case ROLES.CITIZEN:
    default:
      return ROUTES.CITIZEN_DASHBOARD;
  }
}
