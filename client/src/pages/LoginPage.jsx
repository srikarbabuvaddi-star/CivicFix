import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Input } from '../components/Input.jsx';
import { Button } from '../components/Button.jsx';
import { Alert } from '../components/Alert.jsx';
import { ROUTES, getDashboardPathForRole } from '../utils/constants.js';

export function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const user = await login({
        email: formData.email.trim(),
        password: formData.password
      });

      // Redirect to intended route or role-specific dashboard
      const fromPath = location.state?.from?.pathname;
      if (fromPath && fromPath !== ROUTES.LOGIN && fromPath !== ROUTES.REGISTER) {
        navigate(fromPath, { replace: true });
      } else {
        const targetDashboard = getDashboardPathForRole(user.role);
        navigate(targetDashboard, { replace: true });
      }
    } catch (err) {
      setServerError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div
            style={{
              display: 'inline-flex',
              padding: '0.65rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary-dark)'
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h1>CivicFix Sign In</h1>
          <p>Access your municipal reporting or resolution workspace</p>
        </div>

        {serverError && (
          <Alert variant="danger" title="Authentication Error">
            {serverError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="citizen@example.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            autoComplete="email"
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="btn-block"
            style={{ marginTop: '0.75rem' }}
          >
            <LogIn size={18} />
            <span>Sign In to CivicFix</span>
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Do not have an account yet?{' '}
            <Link to={ROUTES.REGISTER} style={{ fontWeight: 600 }}>
              Create Citizen Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
