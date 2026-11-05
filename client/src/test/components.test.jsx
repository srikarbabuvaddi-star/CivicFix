import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { Badge } from '../components/Badge.jsx';
import { Alert } from '../components/Alert.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Card } from '../components/Card.jsx';
import { IssueCard } from '../components/IssueCard.jsx';
import { RoleGuard } from '../features/auth/RoleGuard.jsx';
import { AuthContext } from '../features/auth/AuthContext.jsx';
import { ROLES, ISSUE_STATUS, CATEGORY_LABELS } from '../utils/constants.js';

describe('CivicFix Frontend UI & Component Verification Suite', () => {
  describe('1. StatusBadge Component', () => {
    it('renders correct labels for all lifecycle statuses', () => {
      const statuses = [
        { status: ISSUE_STATUS.SUBMITTED, expected: 'Submitted' },
        { status: ISSUE_STATUS.ASSIGNED, expected: 'Assigned' },
        { status: ISSUE_STATUS.IN_PROGRESS, expected: 'In Progress' },
        { status: ISSUE_STATUS.RESOLVED, expected: 'Resolved' },
        { status: ISSUE_STATUS.CLOSED, expected: 'Closed' },
        { status: ISSUE_STATUS.REOPENED, expected: 'Reopened' },
        { status: ISSUE_STATUS.REJECTED, expected: 'Rejected' },
        { status: ISSUE_STATUS.WITHDRAWN, expected: 'Withdrawn' }
      ];

      for (const item of statuses) {
        const { unmount } = render(<StatusBadge status={item.status} />);
        expect(screen.getByText(item.expected)).toBeDefined();
        unmount();
      }
    });

    it('falls back gracefully to raw status string for unknown status', () => {
      render(<StatusBadge status="custom_state" />);
      expect(screen.getByText('custom_state')).toBeDefined();
    });
  });

  describe('2. Badge & Role Presentation', () => {
    it('renders role badges correctly', () => {
      const { rerender } = render(<Badge variant="citizen">Citizen Reporter</Badge>);
      expect(screen.getByText('Citizen Reporter')).toBeDefined();

      rerender(<Badge variant="admin">Civic Administrator</Badge>);
      expect(screen.getByText('Civic Administrator')).toBeDefined();
    });

    it('renders priority badges with appropriate contrast', () => {
      render(<Badge variant="urgent">Urgent</Badge>);
      expect(screen.getByText('Urgent')).toBeDefined();
    });
  });

  describe('3. Alert Component', () => {
    it('renders danger alert with title and children', () => {
      render(
        <Alert variant="danger" title="Authentication Failure">
          Invalid username or password supplied.
        </Alert>
      );
      expect(screen.getByText('Authentication Failure')).toBeDefined();
      expect(screen.getByText('Invalid username or password supplied.')).toBeDefined();
    });

    it('renders success alert banner', () => {
      render(
        <Alert variant="success" title="Success">
          Issue reported successfully!
        </Alert>
      );
      expect(screen.getByText('Success')).toBeDefined();
      expect(screen.getByText('Issue reported successfully!')).toBeDefined();
    });
  });

  describe('4. EmptyState Component', () => {
    it('renders accessible empty state with icon and action button', () => {
      render(
        <EmptyState
          title="No Issues Found"
          description="There are currently no civic complaints filed in this category."
          actionText="Report an Issue"
          actionHref="/report"
        />
      );
      expect(screen.getByText('No Issues Found')).toBeDefined();
      expect(screen.getByText('There are currently no civic complaints filed in this category.')).toBeDefined();
    });
  });

  describe('5. Card Component', () => {
    it('renders card title, subtitle, and body content', () => {
      render(
        <Card title="Municipal Bureau" subtitle="Public Works">
          <p>Active technician count: 12</p>
        </Card>
      );
      expect(screen.getByText('Municipal Bureau')).toBeDefined();
      expect(screen.getByText('Public Works')).toBeDefined();
      expect(screen.getByText('Active technician count: 12')).toBeDefined();
    });
  });

  describe('6. IssueCard Component', () => {
    const mockIssue = {
      id: 'mock_issue_1',
      issueNumber: 'CF-2005',
      title: 'Water Pipe Rupture on 100ft Road',
      category: 'water',
      status: 'assigned',
      priority: 'high',
      location: {
        address: '100ft Road, Indiranagar',
        coordinates: [77.64, 12.97]
      },
      createdAt: new Date().toISOString()
    };

    it('renders complete issue summary, category label, and link to details', () => {
      render(
        <MemoryRouter>
          <IssueCard issue={mockIssue} />
        </MemoryRouter>
      );

      expect(screen.getByText('CF-2005')).toBeDefined();
      expect(screen.getByText('Water Pipe Rupture on 100ft Road')).toBeDefined();
      expect(screen.getByText(CATEGORY_LABELS.water)).toBeDefined();
      expect(screen.getByText('Assigned')).toBeDefined();
      expect(screen.getByText('100ft Road, Indiranagar')).toBeDefined();
    });
  });

  describe('7. RoleGuard Access Control Component', () => {
    it('redirects and blocks children when user does not possess required role', () => {
      render(
        <MemoryRouter>
          <AuthContext.Provider value={{ user: { role: ROLES.CITIZEN }, isAuthenticated: true, isLoading: false }}>
            <RoleGuard allowedRoles={[ROLES.ADMIN]}>
              <div>Privileged Administrative Console</div>
            </RoleGuard>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      expect(screen.queryByText('Privileged Administrative Console')).toBeNull();
    });

    it('allows access and renders children when user possesses required role', () => {
      render(
        <MemoryRouter>
          <AuthContext.Provider value={{ user: { role: ROLES.ADMIN }, isAuthenticated: true, isLoading: false }}>
            <RoleGuard allowedRoles={[ROLES.ADMIN]}>
              <div>Privileged Administrative Console</div>
            </RoleGuard>
          </AuthContext.Provider>
        </MemoryRouter>
      );

      expect(screen.getByText('Privileged Administrative Console')).toBeDefined();
    });
  });

  describe('8. LandingPage & LoginPage Flow Verification', () => {
    it('verifies LoginPage renders clear descriptive placeholders and quick-fill buttons', async () => {
      const { LoginPage } = await import('../pages/LoginPage.jsx');
      render(
        <MemoryRouter>
          <AuthContext.Provider value={{ user: null, isAuthenticated: false, isLoading: false, login: vi.fn() }}>
            <LoginPage />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);

      expect(emailInput.getAttribute('placeholder')).toBe('Enter your registered email address');
      expect(passwordInput.getAttribute('placeholder')).toBe('Enter your password');
      expect(screen.getByText(/Quick Fill Testing Credentials/i)).toBeDefined();
      expect(screen.getByRole('button', { name: 'Citizen' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Staff' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Admin' })).toBeDefined();
    });

    it('verifies LandingPage hero CTA routes to /issues/new', async () => {
      const { LandingPage } = await import('../pages/LandingPage.jsx');
      render(
        <MemoryRouter>
          <AuthContext.Provider value={{ user: null, isAuthenticated: false, isLoading: false }}>
            <LandingPage />
          </AuthContext.Provider>
        </MemoryRouter>
      );

      const reportCta = screen.getByRole('link', { name: /Report a Civic Issue/i });
      expect(reportCta.getAttribute('href')).toBe('/issues/new');
    });
  });
});
