import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, LogOut, LayoutDashboard, User, Compass, PlusCircle, FileText } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from './Button.jsx';
import { Badge } from './Badge.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { ROUTES, ROLES, getDashboardPathForRole } from '../utils/constants.js';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  const dashboardPath = user ? getDashboardPathForRole(user.role) : ROUTES.LOGIN;

  return (
    <header
      style={{
        backgroundColor: 'var(--color-navy-950)',
        color: 'var(--color-white)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 'var(--nav-height)'
        }}
      >
        {/* Brand */}
        <Link
          to={ROUTES.HOME}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: 'var(--color-white)',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em'
          }}
          aria-label="CivicFix Home"
        >
          <div
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-white)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <span>Civic<span style={{ color: '#2dd4bf' }}>Fix</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '1.5rem'
          }}
          className="desktop-nav"
        >
          <Link
            to={ROUTES.EXPLORE}
            style={{
              color: location.pathname === ROUTES.EXPLORE ? '#2dd4bf' : '#cbd5e1',
              fontWeight: location.pathname === ROUTES.EXPLORE ? 700 : 500,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.6rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: location.pathname === ROUTES.EXPLORE ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <Compass size={16} />
            <span>Explore Issues</span>
          </Link>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {user?.role === ROLES.CITIZEN && (
                <>
                  <Link
                    to={ROUTES.MY_REPORTS}
                    style={{
                      color: '#cbd5e1',
                      fontWeight: 500,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <FileText size={16} />
                    <span>My Reports</span>
                  </Link>

                  <Link
                    to={ROUTES.CREATE_ISSUE}
                    className="btn btn-primary btn-sm"
                    style={{ gap: '0.35rem' }}
                  >
                    <PlusCircle size={15} />
                    <span>Report Issue</span>
                  </Link>
                </>
              )}

              <NotificationBell />

              <Badge variant={user.role} />

              <Link
                to={dashboardPath}
                className="btn btn-outline btn-sm"
                style={{
                  color: 'var(--color-white)',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                }}
              >
                <LayoutDashboard size={15} />
                <span>Console</span>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                style={{ color: '#fda4af', borderColor: 'transparent' }}
                aria-label="Log out of account"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                to={ROUTES.LOGIN}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-white)' }}
              >
                <User size={16} />
                <span>Sign In</span>
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="btn btn-primary btn-sm"
              >
                Register Citizen Account
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-toggle"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-white)',
            padding: '0.5rem',
            cursor: 'pointer'
          }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--color-navy-900)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <Link
            to={ROUTES.HOME}
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#cbd5e1', padding: '0.4rem 0' }}
          >
            Platform Overview
          </Link>

          <Link
            to={ROUTES.EXPLORE}
            onClick={() => setMobileMenuOpen(false)}
            style={{
              color: location.pathname === ROUTES.EXPLORE ? '#2dd4bf' : '#cbd5e1',
              fontWeight: location.pathname === ROUTES.EXPLORE ? 700 : 500,
              padding: '0.4rem 0'
            }}
          >
            Explore Public Issues
          </Link>

          {isAuthenticated ? (
            <>
              {user?.role === ROLES.CITIZEN && (
                <>
                  <Link
                    to={ROUTES.MY_REPORTS}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ color: '#cbd5e1', padding: '0.4rem 0' }}
                  >
                    My Reports
                  </Link>
                  <Link
                    to={ROUTES.CREATE_ISSUE}
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-primary btn-block"
                  >
                    <PlusCircle size={16} />
                    Report New Issue
                  </Link>
                </>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>User:</span>
                <strong style={{ color: '#fff' }}>{user.name}</strong>
                <NotificationBell />

              <Badge variant={user.role} />
              </div>

              <Link
                to={dashboardPath}
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-outline btn-block"
                style={{ color: '#fff', borderColor: 'rgba(255, 255, 255, 0.3)' }}
              >
                <LayoutDashboard size={16} />
                Open Console
              </Link>

              <Button
                variant="danger"
                className="btn-block"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
              >
                <LogOut size={16} />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link
                to={ROUTES.LOGIN}
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-outline btn-block"
                style={{ color: '#fff', borderColor: 'rgba(255, 255, 255, 0.3)' }}
              >
                Sign In
              </Link>
              <Link
                to={ROUTES.REGISTER}
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary btn-block"
              >
                Register Citizen Account
              </Link>
            </>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
