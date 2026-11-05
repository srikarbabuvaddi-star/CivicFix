import React from 'react';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--color-navy-950)',
        color: '#94a3b8',
        padding: '3.5rem 0 2rem 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        marginTop: 'auto'
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2.5rem',
            paddingBottom: '2.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Col 1 */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.2rem',
                marginBottom: '1rem'
              }}
            >
              <ShieldCheck size={20} color="#2dd4bf" />
              <span>CivicFix Platform</span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              A transparent civic issue reporting and municipal resolution platform connecting residents,
              field staff, and city administration.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Security & Privacy
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={15} color="#2dd4bf" />
                <span>Argon2id Salted Password Hashing</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="#2dd4bf" />
                <span>Encrypted HttpOnly Sessions</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="#2dd4bf" />
                <span>Synchronizer CSRF Protection</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={15} color="#2dd4bf" />
                <span>Strict Role Separation</span>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Platform Governance
            </h4>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              CivicFix enforces that public registrations only create citizen accounts. Staff and administrator
              credentials are restricted to authenticated municipal provisioning workflows.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.85rem'
          }}
        >
          <p>© {new Date().getFullYear()} CivicFix Platform. Major Academic Project Foundation.</p>
          <p style={{ color: '#64748b' }}>
            Production-Minded Architecture · Milestone 01
          </p>
        </div>
      </div>
    </footer>
  );
}

