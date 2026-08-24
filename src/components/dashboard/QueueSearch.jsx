import { useState, useRef, useEffect } from "react";

/**
 * QueueSearch — Search/filter input for the player queue.
 * Filters players by name in real-time.
 */
export default function QueueSearch({ onSearch, playerCount }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    onSearch(query.trim().toLowerCase());
  }, [query, onSearch]);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative mb-3">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${playerCount} players... (press /)`}
        className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-slate-400"
        aria-label="Search players in queue"
      />
      <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {query && (
        <button
          onClick={() => setQuery("")}
          className="absolute right-2 top-2 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs hover:bg-slate-300"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
