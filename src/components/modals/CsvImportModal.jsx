import { useState, useRef } from "react";
import { parseCSV, readFileAsText } from "../../utils/csvImport";

export default function CsvImportModal({ onImport, onClose, existingNames }) {
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await readFileAsText(file);
    const { players, errors: parseErrors } = parseCSV(text);

    // Filter out duplicates
    const existingSet = new Set(existingNames.map((n) => n.toLowerCase()));
    const unique = players.filter((p) => !existingSet.has(p.name.toLowerCase()));
    const dupes = players.length - unique.length;

    if (dupes > 0) {
      parseErrors.push(`${dupes} duplicate(s) skipped (already in queue/court)`);
    }

    setPreview(unique);
    setErrors(parseErrors);
  };

  const handleImport = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    await onImport(preview);
    setImporting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="force-light bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">📥 Bulk Import Players</h2>
          <p className="text-xs text-slate-500 mt-1">
            Upload a CSV file with player names. Format: Name, Tier (optional)
          </p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {/* File picker */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFile}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <span className="text-2xl">📄</span>
              <span className="text-xs text-slate-500 mt-1">Click to select CSV file</span>
            </button>
          </div>

          {/* Example format */}
          {!preview && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
              <div className="font-semibold mb-1">CSV Format:</div>
              <code className="block bg-white rounded p-2 text-[11px] font-mono">
                Name, Tier<br />
                John Smith, king<br />
                Jane Doe, knight<br />
                Bob, squire
              </code>
              <p className="mt-2 text-slate-400">Tier is optional (defaults to squire). You can also just list names, one per line.</p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3">
              <div className="text-xs font-semibold text-amber-700 mb-1">⚠️ Warnings:</div>
              {errors.map((err, i) => (
                <div key={i} className="text-[11px] text-amber-600">{err}</div>
              ))}
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-2">
                Ready to import: {preview.length} player{preview.length !== 1 ? "s" : ""}
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                {preview.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-700">{p.name}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">{p.tier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!preview || preview.length === 0 || importing}
            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {importing ? "Importing..." : `Import ${preview?.length || 0} Players`}
          </button>
        </div>
      </div>
    </div>
  );
}
