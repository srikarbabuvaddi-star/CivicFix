export const ROLES = {
  CITIZEN: 'citizen',
  STAFF: 'staff',
  ADMIN: 'admin'
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

export const ISSUE_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

export const ISSUE_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private'
};

export const AUDIT_EVENT_TYPE = {
  CREATED: 'created',
  STATUS_CHANGED: 'status_changed',
  ASSIGNED: 'assigned',
  REASSIGNED: 'reassigned',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  VERIFIED_CLOSED: 'closed',
  REOPENED: 'reopened',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
  UPDATED: 'updated'
};

export const NOTIFICATION_TYPES = {
  ISSUE_SUBMITTED: 'issue_submitted',
  ISSUE_ASSIGNED: 'issue_assigned',
  ISSUE_REASSIGNED: 'issue_reassigned',
  STATUS_CHANGED: 'status_changed',
  ISSUE_RESOLVED: 'issue_resolved',
  ISSUE_CLOSED: 'issue_closed',
  ISSUE_REOPENED: 'issue_reopened',
  ISSUE_REJECTED: 'issue_rejected',
  FEEDBACK_RECEIVED: 'feedback_received'
};

export const RESOLUTION_QUALITY = {
  POOR: 'poor',
  ACCEPTABLE: 'acceptable',
  GOOD: 'good',
  EXCELLENT: 'excellent'
};

export const TIME_PERIODS = {
  ALL: 'all',
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d'
};

export const VALID_ROLES = Object.values(ROLES);
export const VALID_ACCOUNT_STATUSES = Object.values(ACCOUNT_STATUS);
export const VALID_ISSUE_CATEGORIES = Object.values(ISSUE_CATEGORIES);
export const VALID_ISSUE_STATUSES = Object.values(ISSUE_STATUS);
export const VALID_ISSUE_PRIORITIES = Object.values(ISSUE_PRIORITY);
export const VALID_ISSUE_VISIBILITIES = Object.values(ISSUE_VISIBILITY);
export const VALID_AUDIT_EVENT_TYPES = Object.values(AUDIT_EVENT_TYPE);
export const VALID_NOTIFICATION_TYPES = Object.values(NOTIFICATION_TYPES);
export const VALID_RESOLUTION_QUALITIES = Object.values(RESOLUTION_QUALITY);
export const VALID_TIME_PERIODS = Object.values(TIME_PERIODS);
