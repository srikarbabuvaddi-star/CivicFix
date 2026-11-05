import React from 'react';

export function Input({
  id,
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error = null,
  hint = null,
  autoComplete,
  disabled = false,
  className = '',
  ...props
}) {
  const inputId = id || name;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <div className={`form-group ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>{label}</span>
          {required && <span className="required" title="Required field">*</span>}
        </label>
      )}

      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className="form-input"
        {...props}
      />

      {error && (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      )}

      {hint && !error && (
        <span id={hintId} className="form-hint">
          {hint}
        </span>
      )}
    </div>
  );
}

