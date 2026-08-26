import { useState } from "react";

/**
 * ActivityFeed — Collapsible real-time event log.
 * Shows recent game events with timestamps.
 */
export default function ActivityFeed({ events = [] }) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) return null;

  const visibleEvents = expanded ? events.slice(0, 20) : events.slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-premium overflow-hidden animate-slide-up">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        aria-expanded={expanded}
      >
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Activity Feed
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">{events.length} events</span>
          <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div className="px-3 pb-2 space-y-1">
        {visibleEvents.map((event, i) => (
          <div key={event.id || i} className="flex items-start gap-2 py-1 border-t border-slate-50 first:border-0">
            <span className="text-sm shrink-0 mt-0.5">{event.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-slate-700 block truncate">{event.text}</span>
            </div>
            <span className="text-[9px] text-slate-400 shrink-0 mt-0.5">{event.time}</span>
          </div>
        ))}
      </div>

      {events.length > 3 && !expanded && (
        <button onClick={() => setExpanded(true)} className="w-full py-1.5 text-[10px] text-blue-600 hover:text-blue-800 font-medium border-t border-slate-100">
          Show {events.length - 3} more...
        </button>
      )}
    </div>
  );
}
