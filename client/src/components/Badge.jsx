import React from 'react';
import { ROLE_LABELS } from '../utils/constants.js';

export function Badge({ variant = 'citizen', children, className = '' }) {
  const displayLabel = children || ROLE_LABELS[variant] || variant;
  return (
    <span className={`badge badge-${variant} ${className}`.trim()}>
      {displayLabel}
    </span>
  );
}

