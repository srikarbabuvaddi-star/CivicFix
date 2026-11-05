import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export function Alert({ variant = 'danger', title, children, className = '' }) {
  const icons = {
    danger: <AlertCircle size={20} className="alert-icon" aria-hidden="true" />,
    success: <CheckCircle size={20} className="alert-icon" aria-hidden="true" />,
    warning: <AlertTriangle size={20} className="alert-icon" aria-hidden="true" />,
    info: <Info size={20} className="alert-icon" aria-hidden="true" />
  };

  return (
    <div className={`alert alert-${variant} ${className}`.trim()} role="alert">
      {icons[variant] || icons.info}
      <div style={{ flex: 1 }}>
        {title && <strong style={{ display: 'block', marginBottom: '0.2rem' }}>{title}</strong>}
        {children}
      </div>
    </div>
  );
}

