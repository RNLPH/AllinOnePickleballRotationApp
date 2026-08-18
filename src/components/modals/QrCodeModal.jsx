import { getQRCodeUrl } from "../../utils/qrCode";

export default function QrCodeModal({ url, title, onClose }) {
  const qrUrl = getQRCodeUrl(url, 280);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head><title>${title} QR Code</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;">
          <h2>${title}</h2>
          <img src="${qrUrl}" width="300" height="300" />
          <p style="font-size:14px;color:#666;margin-top:12px;word-break:break-all;max-width:350px;text-align:center;">${url}</p>
          <script>setTimeout(()=>window.print(),500)<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-4 border-b border-slate-100 text-center">
          <h2 className="text-lg font-bold text-slate-800">📱 {title}</h2>
          <p className="text-xs text-slate-500 mt-1">Scan to open on phone</p>
        </div>

        <div className="p-6 flex flex-col items-center">
          <img
            src={qrUrl}
            alt="QR Code"
            className="w-56 h-56 rounded-lg border border-slate-200"
          />
          <p className="mt-3 text-[11px] text-slate-400 text-center break-all max-w-[280px]">{url}</p>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">
            Close
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(url); }}
            className="flex-1 h-10 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium"
          >
            📋 Copy Link
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 h-10 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 text-sm font-medium"
          >
            🖨 Print
          </button>
        </div>
      </div>
    </div>
  );
}
