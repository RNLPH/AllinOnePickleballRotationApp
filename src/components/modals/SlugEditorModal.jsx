import { useState } from "react";

export default function SlugEditorModal({ currentSlug, clubId, onSave, onClose }) {
  const [slug, setSlug] = useState(currentSlug || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (trimmed.length < 2) { alert("Slug must be at least 2 characters (letters, numbers, dashes)."); return; }
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
  };

  const baseUrl = window.location.origin;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="force-light bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">🔗 Custom Club URL</h2>
          <p className="text-xs text-slate-500 mt-1">
            Set a short, memorable slug for your public links.
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 shrink-0">{baseUrl}/live/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="my-club"
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                maxLength={30}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Only lowercase letters, numbers, and dashes. 2-30 chars.</p>
          </div>

          {slug && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
              <div><strong>Live Board:</strong> {baseUrl}/live/{slug}</div>
              <div><strong>Check-in:</strong> {baseUrl}/checkin/{slug}</div>
              <div><strong>Challenge:</strong> {baseUrl}/challenge/{slug}</div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || slug.trim().length < 2}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Slug"}
          </button>
        </div>
      </div>
    </div>
  );
}
