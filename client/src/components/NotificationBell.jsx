import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../services/notificationService.js';
import { useAuth } from '../hooks/useAuth.js';

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Poll unread count
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    const fetchCount = async () => {
      try {
        const res = await getUnreadCount();
        if (isMounted && res.success) {
          setUnreadCount(res.data.unreadCount);
        }
      } catch {
        // Silently fail if unauthenticated or network hiccup
      }
    };

    fetchCount();
    const interval = window.setInterval(fetchCount, 30000); // 30s polling
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications({ page: 1, limit: 10 });
      if (res.success) {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleItemClick = async (notif) => {
    if (!notif.readAt) {
      try {
        await markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.warn('Failed to mark notification as read:', err);
      }
    }

    setIsOpen(false);
    if (notif.relatedIssueId) {
      navigate(`/issues/${notif.relatedIssueId}`);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.4rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'inherit',
          position: 'relative'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: 'var(--color-danger)',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 700,
              borderRadius: '9999px',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              lineHeight: 1
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            backgroundColor: '#ffffff',
            color: 'var(--color-navy-900)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--color-slate-200)',
            zIndex: 100,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--color-slate-200)',
              backgroundColor: 'var(--color-slate-50)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--color-danger)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.4rem',
                    borderRadius: '9999px'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto'
            }}
          >
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-slate-500)', fontSize: '0.85rem' }}>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                <Bell size={28} style={{ color: 'var(--color-slate-300)', marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-navy-800)' }}>
                  No notifications yet
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                  Updates on your civic issues and assignments will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.readAt;
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleItemClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleItemClick(notif);
                      }
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: '1px solid var(--color-slate-100)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      backgroundColor: isUnread ? 'rgba(59, 130, 246, 0.05)' : '#ffffff',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* Unread indicator dot */}
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '9999px',
                        backgroundColor: isUnread ? 'var(--color-primary)' : 'transparent',
                        marginTop: '0.35rem',
                        flexShrink: 0
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: isUnread ? 700 : 600,
                          color: 'var(--color-navy-900)',
                          marginBottom: '0.2rem'
                        }}
                      >
                        {notif.title}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--color-slate-600)',
                          lineHeight: 1.35,
                          marginBottom: '0.35rem',
                          wordBreak: 'break-word'
                        }}
                      >
                        {notif.message}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.7rem',
                          color: 'var(--color-slate-400)'
                        }}
                      >
                        <span>{new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {notif.relatedIssueId && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--color-primary)', fontWeight: 500 }}>
                            View <ExternalLink size={10} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
