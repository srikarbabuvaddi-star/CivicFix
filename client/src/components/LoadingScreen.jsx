import React from 'react';

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: '1rem',
        color: 'var(--color-navy-700)'
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="spinner"
        style={{
          width: '2.5rem',
          height: '2.5rem',
          borderWidth: '3px',
          borderColor: 'var(--color-slate-300)',
          borderTopColor: 'var(--color-primary)'
        }}
      />
      <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>{message}</p>
    </div>
  );
}

