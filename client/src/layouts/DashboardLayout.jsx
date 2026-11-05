import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Badge } from '../components/Badge.jsx';
import { Button } from '../components/Button.jsx';
import { Footer } from '../components/Footer.jsx';
import { NotificationBell } from '../components/NotificationBell.jsx';
import { ROUTES } from '../utils/constants.js';

export function DashboardLayout({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="dashboard-layout">
      {/* Top Bar */}
      <header className="dashboard-header">
        <div className="container dashboard-header-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              to={ROUTES.HOME}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--color-navy-900)',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '1.2rem'
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.35rem',
                  display: 'flex'
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <span>Civic<span style={{ color: 'var(--color-primary)' }}>Fix</span></span>
            </Link>

            <span style={{ color: 'var(--color-slate-300)' }}>|</span>

            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-navy-700)' }}>
              {title || 'Dashboard'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <NotificationBell />
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    backgroundColor: 'var(--color-slate-100)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <UserIcon size={16} color="var(--color-navy-700)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-navy-900)' }}>
                    {user.name}
                  </span>
                  <Badge variant={user.role} />
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-slate-300)' }}
            >
              <LogOut size={15} />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}

