import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Card } from '../components/Card.jsx';
import { Input } from '../components/Input.jsx';
import { Button } from '../components/Button.jsx';
import { Alert } from '../components/Alert.jsx';
import { LocationPicker } from '../components/LocationPicker.jsx';
import * as issueService from '../services/issueService.js';
import {
  ISSUE_CATEGORIES,
  CATEGORY_LABELS,
  ISSUE_VISIBILITY,
  ROUTES
} from '../utils/constants.js';

export function CreateIssuePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ISSUE_CATEGORIES.ROADS,
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716],
      address: ''
    },
    visibility: ISSUE_VISIBILITY.PUBLIC
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters long';
    } else if (formData.title.trim().length > 120) {
      newErrors.title = 'Title cannot exceed 120 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    } else if (formData.description.trim().length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    const [lng, lat] = formData.location.coordinates || [];
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
      newErrors.location = 'Valid coordinates are required';
    } else if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      newErrors.location = 'Coordinates are outside valid geographical bounds';
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

  const handleLocationChange = (newLocation) => {
    setFormData((prev) => ({ ...prev, location: newLocation }));
    if (errors.location) {
      setErrors((prev) => ({ ...prev, location: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const created = await issueService.createIssue({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location: formData.location,
        visibility: formData.visibility
      });

      navigate(`/issues/${created.id}`, {
        state: { message: `Report ${created.issueNumber} filed successfully!` }
      });
    } catch (err) {
      setServerError(err.message || 'Failed to submit issue report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link to={ROUTES.CITIZEN_DASHBOARD} className="btn btn-outline btn-sm">
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </Link>
        <span style={{ color: 'var(--color-slate-400)' }}>/</span>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-slate-500)', fontWeight: 500 }}>
          New Incident Report
        </span>
      </div>

      <Card>
        <div style={{ borderBottom: '1px solid var(--color-slate-200)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <PlusCircle size={22} color="var(--color-primary)" />
            <h1 style={{ fontSize: '1.6rem', color: 'var(--color-navy-900)' }}>Report a Civic Issue</h1>
          </div>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.95rem' }}>
            Submit infrastructural or public safety concerns to municipal departments for tracking and resolution.
          </p>
        </div>

        {serverError && (
          <Alert variant="danger" title="Submission Error">
            {serverError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Issue Title */}
          <Input
            id="issue-title"
            name="title"
            label="Report Title"
            placeholder="e.g. Deep pothole on 4th Main Road"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            hint="Concise summary between 5 and 120 characters"
            required
          />

          {/* Issue Category */}
          <div className="form-group">
            <label htmlFor="issue-category" className="form-label">
              <span>Category</span>
              <span className="required" title="Required field">*</span>
            </label>
            <select
              id="issue-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="form-input"
              required
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.category && <span className="form-error">{errors.category}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="issue-description" className="form-label">
              <span>Detailed Description</span>
              <span className="required" title="Required field">*</span>
            </label>
            <textarea
              id="issue-description"
              name="description"
              rows={5}
              placeholder="Provide exact observations, severity, safety hazards, and any relevant context..."
              value={formData.description}
              onChange={handleChange}
              className="form-input"
              style={{ resize: 'vertical' }}
              required
            />
            {errors.description && <span className="form-error">{errors.description}</span>}
            <span className="form-hint">Minimum 10 characters (Max 2000)</span>
          </div>

          {/* Location Picker */}
          <div style={{ marginBottom: '1.75rem' }}>
            <LocationPicker
              value={formData.location}
              onChange={handleLocationChange}
              error={errors.location}
            />
          </div>

          {/* Visibility Selection */}
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">
              <span>Report Visibility</span>
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginTop: '0.25rem'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  border: `2px solid ${formData.visibility === ISSUE_VISIBILITY.PUBLIC ? 'var(--color-primary)' : 'var(--color-slate-200)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: formData.visibility === ISSUE_VISIBILITY.PUBLIC ? 'var(--color-primary-light)' : 'var(--color-white)'
                }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={ISSUE_VISIBILITY.PUBLIC}
                  checked={formData.visibility === ISSUE_VISIBILITY.PUBLIC}
                  onChange={handleChange}
                  style={{ marginTop: '0.25rem' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <Eye size={16} />
                    <span>Public Report</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', margin: '0.25rem 0 0 0' }}>
                    Visible in Explore feed so neighbors can track progress. Personal contact info is always kept private.
                  </p>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  border: `2px solid ${formData.visibility === ISSUE_VISIBILITY.PRIVATE ? 'var(--color-primary)' : 'var(--color-slate-200)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: formData.visibility === ISSUE_VISIBILITY.PRIVATE ? '#fef2f2' : 'var(--color-white)'
                }}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={ISSUE_VISIBILITY.PRIVATE}
                  checked={formData.visibility === ISSUE_VISIBILITY.PRIVATE}
                  onChange={handleChange}
                  style={{ marginTop: '0.25rem' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <EyeOff size={16} />
                    <span>Private Report</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', margin: '0.25rem 0 0 0' }}>
                    Visible only to you, assigned technicians, and municipal supervisors.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--color-slate-200)', paddingTop: '1.25rem' }}>
            <Link to={ROUTES.CITIZEN_DASHBOARD} className="btn btn-ghost">
              Cancel
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
            >
              <ShieldCheck size={18} />
              <span>Submit Report to Municipality</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

