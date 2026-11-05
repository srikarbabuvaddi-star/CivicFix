import React from 'react';

export function Card({ children, title, subtitle, footer, className = '', ...props }) {
  return (
    <div className={`card ${className}`.trim()} {...props}>
      {(title || subtitle) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="form-hint" style={{ marginTop: '0.25rem' }}>{subtitle}</p>}
          </div>
        </div>
      )}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

