import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getIssueTimeline } from '../services/issueService.js';
import { AUDIT_EVENT_LABELS, STATUS_LABELS } from '../utils/constants.js';

export function IssueTimeline({ issueId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTimeline() {
      try {
        setLoading(true);
        setError(null);
        const data = await getIssueTimeline(issueId);
        if (isMounted) {
          setEvents(data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load timeline events');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (issueId) {
      loadTimeline();
    }

    return () => {
      isMounted = false;
    };
  }, [issueId]);

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        <div className="inline-block animate-spin h-5 w-5 border-2 border-teal-600 border-t-transparent rounded-full mb-2" />
        <p>Loading audit timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded text-sm">
        <p>{error}</p>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="p-4 text-slate-500 text-sm italic">
        No audit history recorded for this report.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => {
          const isLast = eventIdx === events.length - 1;
          const label = AUDIT_EVENT_LABELS[event.eventType] || event.eventType;
          const actorName = event.actorId?.name || event.actorId?.fullName || 'Municipal System';
          const actorRole = event.actorId?.role ? `(${event.actorId.role})` : '';

          return (
            <li key={event.id || eventIdx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3 items-start">
                  <div>
                    <span
                      className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white text-white text-xs font-bold ${
                        event.eventType === 'created'
                          ? 'bg-blue-600'
                          : event.eventType === 'assigned' || event.eventType === 'reassigned'
                          ? 'bg-indigo-600'
                          : event.eventType === 'resolved'
                          ? 'bg-emerald-600'
                          : event.eventType === 'closed'
                          ? 'bg-teal-700'
                          : event.eventType === 'reopened'
                          ? 'bg-amber-600'
                          : event.eventType === 'rejected'
                          ? 'bg-rose-600'
                          : 'bg-slate-500'
                      }`}
                    >
                      {event.eventType === 'created'
                        ? '★'
                        : event.eventType === 'assigned'
                        ? '→'
                        : event.eventType === 'resolved'
                        ? '✓'
                        : event.eventType === 'closed'
                        ? '✔'
                        : event.eventType === 'reopened'
                        ? '↺'
                        : '•'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex justify-between items-baseline">
                      <p className="text-sm font-semibold text-slate-900">
                        {label}
                        {event.newStatus && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                            {STATUS_LABELS[event.newStatus] || event.newStatus}
                          </span>
                        )}
                      </p>
                      <time
                        dateTime={event.createdAt}
                        className="text-xs text-slate-500"
                      >
                        {new Date(event.createdAt).toLocaleString()}
                      </time>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5">
                      Actor: <span className="font-medium text-slate-800">{actorName}</span>{' '}
                      <span className="text-slate-500 uppercase text-[10px]">{actorRole}</span>
                    </p>

                    {event.reason && (
                      <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                        <span className="font-medium">Note / Reason:</span> {event.reason}
                      </p>
                    )}

                    {event.details?.resolutionNotes && (
                      <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900">
                        <p className="font-semibold mb-0.5">Work Done / Resolution Notes:</p>
                        <p className="whitespace-pre-wrap">{event.details.resolutionNotes}</p>
                        {event.details.evidenceNotes && (
                          <p className="mt-1 text-emerald-800 italic">
                            Evidence: {event.details.evidenceNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

IssueTimeline.propTypes = {
  issueId: PropTypes.string.isRequired
};

