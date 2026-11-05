import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  Workflow,
  CheckCircle2,
  Users,
  Building2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Card } from '../components/Card.jsx';
import { ROUTES, getDashboardPathForRole } from '../utils/constants.js';

export function LandingPage() {
  const { user, isAuthenticated } = useAuth();

  const reportLink = isAuthenticated
    ? getDashboardPathForRole(user.role)
    : ROUTES.REGISTER;

  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 70%, #0a0f1d 100%)',
          color: 'var(--color-white)',
          padding: '5rem 0 6rem 0',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div className="container" style={{ textAlign: 'center', maxWidth: '860px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(13, 148, 136, 0.15)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              color: '#2dd4bf',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '1.75rem'
            }}
          >
            <ShieldCheck size={16} />
            <span>Civic Issue Reporting & Resolution Platform</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
              color: '#ffffff'
            }}
          >
            Bridging Citizens & Municipalities for Faster Urban Resolution
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              color: '#cbd5e1',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
              fontWeight: 400
            }}
          >
            Traditional civic grievance systems suffer from lost complaint records, zero status visibility,
            and fragmented departmental communication. CivicFix introduces end-to-end accountability,
            verifiable progress tracking, and structured municipal workflows.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <Link to={reportLink} className="btn btn-primary btn-lg">
              <FileText size={18} />
              <span>Report a Civic Issue</span>
            </Link>

            <a href="#how-it-works" className="btn btn-outline btn-lg" style={{ color: '#fff', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
              <span>Explore Platform Workflow</span>
              <ArrowRight size={18} />
            </a>
          </div>

          <div
            style={{
              marginTop: '3.5rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '2.5rem',
              fontSize: '0.875rem',
              color: '#94a3b8'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={16} color="#2dd4bf" />
              <span>Argon2id Encrypted Security</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#2dd4bf" />
              <span>Zero Fabricated Data</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={16} color="#2dd4bf" />
              <span>Role-Aware Municipal Architecture</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Solved Section */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--color-white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3.5rem auto' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>The Civic Problem We Solve</h2>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '1.05rem' }}>
              Urban governance often breaks down when public complaints get routed to improper departments
              or forgotten in unmonitored queues.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}
          >
            <Card
              title="Black Box Reporting"
              subtitle="The Traditional Flaw"
            >
              <p style={{ color: 'var(--color-navy-700)', fontSize: '0.95rem' }}>
                Citizens report broken streetlights, water pipeline leaks, or pothole hazards but receive
                no confirmation number, no resolution timeline, and no departmental accountability.
              </p>
            </Card>

            <Card
              title="Departmental Silos"
              subtitle="The Coordination Gap"
            >
              <p style={{ color: 'var(--color-navy-700)', fontSize: '0.95rem' }}>
                Roads, sanitation, and electrical departments operate independently without unified status
                synchronization, causing complaints to bounce indefinitely between administrative desks.
              </p>
            </Card>

            <Card
              title="Lack of Verification"
              subtitle="The Integrity Issue"
            >
              <p style={{ color: 'var(--color-navy-700)', fontSize: '0.95rem' }}>
                Complaints are frequently marked as &ldquo;resolved&rdquo; without on-site photographic proof or citizen
                acknowledgment, degrading public trust in municipal infrastructure.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Reporting Workflow Section */}
      <section id="how-it-works" style={{ padding: '5rem 0', backgroundColor: 'var(--color-slate-100)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3.5rem auto' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--color-primary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem'
              }}
            >
              <Workflow size={16} />
              <span>Reporting Workflow</span>
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>How CivicFix Resolves Issues</h2>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '1.05rem' }}>
              A 4-step verifiable pipeline designed for maximum civic transparency and speed.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.75rem'
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                padding: '2rem 1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-slate-200)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: 'var(--color-primary-light)',
                  color: 'var(--color-primary-dark)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  marginBottom: '1.25rem'
                }}
              >
                1
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Citizen Submits Issue</h3>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>
                Citizen logs into their secure portal, selects the issue category, pins the location, and provides
                descriptive notes.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                padding: '2rem 1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-slate-200)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: '#ede9fe',
                  color: '#6d28d9',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  marginBottom: '1.25rem'
                }}
              >
                2
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Departmental Routing</h3>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>
                The platform assigns the issue to the relevant department based on issue category and municipal jurisdiction.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                padding: '2rem 1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-slate-200)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  marginBottom: '1.25rem'
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Field Staff Action</h3>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>
                Assigned municipal staff update progress notes, execute repairs, and submit verification evidence.
              </p>
            </div>

            {/* Step 4 */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                padding: '2rem 1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-slate-200)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  backgroundColor: 'var(--color-success-bg)',
                  color: 'var(--color-success)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  marginBottom: '1.25rem'
                }}
              >
                4
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Audited Closure</h3>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>
                The resolution is certified and archived in the immutable civic audit log, accessible to both citizen and administrators.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Portals Overview */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--color-white)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 3rem auto' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Multi-Role Architecture</h2>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '1.05rem' }}>
              Built specifically for distinct responsibilities across the municipal civic ecosystem.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}
          >
            <div
              style={{
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                backgroundColor: 'var(--color-slate-50)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Users size={20} color="var(--color-primary)" />
                <h3 style={{ fontSize: '1.2rem' }}>Citizen Portal</h3>
              </div>
              <p style={{ color: 'var(--color-navy-700)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Public registration provides every resident with a voice. Submit local infrastructure issues,
                track live repair states, and verify completions.
              </p>
              <Link to={ROUTES.REGISTER} className="btn btn-outline btn-sm btn-block">
                Register as Citizen
              </Link>
            </div>

            <div
              style={{
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                backgroundColor: 'var(--color-slate-50)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Building2 size={20} color="#0284c7" />
                <h3 style={{ fontSize: '1.2rem' }}>Staff Portal</h3>
              </div>
              <p style={{ color: 'var(--color-navy-700)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Municipal field technicians and inspectors view assigned departmental tickets, update dispatch
                notes, and mark repairs.
              </p>
              <Link to={ROUTES.LOGIN} className="btn btn-outline btn-sm btn-block">
                Staff Authentication
              </Link>
            </div>

            <div
              style={{
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                backgroundColor: 'var(--color-slate-50)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <ShieldCheck size={20} color="#7c3aed" />
                <h3 style={{ fontSize: '1.2rem' }}>Admin Command</h3>
              </div>
              <p style={{ color: 'var(--color-navy-700)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                City administrators inspect system health, manage department rosters, review escalation
                triggers, and oversee audit records.
              </p>
              <Link to={ROUTES.LOGIN} className="btn btn-outline btn-sm btn-block">
                Administrator Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section
        style={{
          backgroundColor: 'var(--color-navy-900)',
          color: 'var(--color-white)',
          padding: '4rem 0',
          textAlign: 'center'
        }}
      >
        <div className="container" style={{ maxWidth: '640px' }}>
          <h2 style={{ color: '#fff', fontSize: '2rem', marginBottom: '1rem' }}>Ready to Report an Issue?</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', marginBottom: '2rem' }}>
            Help build a cleaner, safer, more responsive neighborhood. Your real-world reports initiate immediate accountability.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to={ROUTES.REGISTER} className="btn btn-primary btn-lg">
              Create Citizen Account
            </Link>
            <Link to={ROUTES.LOGIN} className="btn btn-outline btn-lg" style={{ color: '#fff', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
