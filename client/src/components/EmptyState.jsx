import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are currently no items to display in this view.',
  action = null,
  className = ''
}) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <div className="empty-state-icon" aria-hidden="true">
        <Icon size={28} />
      </div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-desc">{description}</p>
      {action && <div style={{ marginTop: '0.75rem' }}>{action}</div>}
    </div>
  );
}

