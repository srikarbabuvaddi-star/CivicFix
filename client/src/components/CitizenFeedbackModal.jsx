import { useState } from 'react';
import { Star, X, AlertCircle } from 'lucide-react';
import { Button } from './Button.jsx';
import { submitFeedback } from '../services/feedbackService.js';

export function CitizenFeedbackModal({ issueId, issueNumber, onClose, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [resolutionQuality, setResolutionQuality] = useState('good');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (rating < 1 || rating > 5) {
      setErrorMessage('Please select a star rating between 1 and 5.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submitFeedback(issueId, {
        rating,
        resolutionQuality,
        comment: comment.trim() || undefined
      });

      if (res.success) {
        onSuccess(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit feedback';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 200
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-2xl)',
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-slate-200)',
            backgroundColor: 'var(--color-slate-50)'
          }}
        >
          <div>
            <h3 id="feedback-dialog-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-navy-950)' }}>
              Rate Resolution Quality
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
              Issue #{issueNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-slate-400)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-danger)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                marginBottom: '1.25rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Star Rating */}
          <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-navy-800)',
                marginBottom: '0.5rem'
              }}
            >
              Overall Satisfaction
            </label>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      color: filled ? '#eab308' : 'var(--color-slate-300)',
                      transition: 'transform 0.1s ease, color 0.1s ease'
                    }}
                  >
                    <Star size={32} fill={filled ? '#eab308' : 'none'} />
                  </button>
                );
              })}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '0.25rem', display: 'block' }}>
              {rating === 1 && '1 - Very Dissatisfied'}
              {rating === 2 && '2 - Dissatisfied'}
              {rating === 3 && '3 - Neutral'}
              {rating === 4 && '4 - Satisfied'}
              {rating === 5 && '5 - Extremely Satisfied'}
            </span>
          </div>

          {/* Resolution Quality */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="resolution-quality-select"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-navy-800)',
                marginBottom: '0.35rem'
              }}
            >
              Resolution Workmanship
            </label>
            <select
              id="resolution-quality-select"
              value={resolutionQuality}
              onChange={(e) => setResolutionQuality(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="excellent">Excellent — Exceeded expectations</option>
              <option value="good">Good — Completed satisfactorily</option>
              <option value="acceptable">Acceptable — Addressed bare minimum</option>
              <option value="poor">Poor — Substandard execution</option>
            </select>
          </div>

          {/* Feedback Comment */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="feedback-comment"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-navy-800)',
                marginBottom: '0.35rem'
              }}
            >
              Comments or Observations <span style={{ fontWeight: 400, color: 'var(--color-slate-400)' }}>(optional)</span>
            </label>
            <textarea
              id="feedback-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder="Share your thoughts about the resolution or any remaining issues..."
              className="form-control"
              style={{ width: '100%', resize: 'vertical' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', display: 'block', textAlign: 'right' }}>
              {comment.length}/1000
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit Citizen Feedback
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

