import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { ROUTES } from '../utils/constants.js';

export function NotFoundPage() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-slate-100)',
          color: 'var(--color-slate-500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem'
        }}
      >
        <FileQuestion size={36} />
      </div>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>404 - Page Not Found</h1>
      <p style={{ color: 'var(--color-slate-500)', maxWidth: '420px', marginBottom: '1.75rem' }}>
        The page you requested does not exist or may have been relocated within the CivicFix platform.
      </p>
      <Link to={ROUTES.HOME} className="btn btn-primary">
        <ArrowLeft size={16} />
        <span>Return to Platform Home</span>
      </Link>
    </div>
  );
}
