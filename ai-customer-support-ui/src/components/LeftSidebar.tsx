import { Upload, Clock, CheckCircle2, Loader2, FileAudio, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';

// Define the structure of a history item
interface HistoryItem {
  id: number;
  name: string;
  timestamp: string;
  status: string;
}

function LeftSidebar() {
  const [status, setStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 1. Fetch the processing history from the Python backend
  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  // Load history when the sidebar first appears
  useEffect(() => {
    fetchHistory();
  }, []);

  // 2. Handle the file upload process (Supports Audio and Text)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setStatus("Uploading...");

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setStatus("Analyzed Successfully!");
        
        // Refresh the local history list
        await fetchHistory(); 

        // IMPORTANT: Tell the CenterPanel to reload the new transcript/chat
        window.dispatchEvent(new Event('refreshTranscript'));
      } else {
        setStatus("Upload Failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("Connection Error. Is Python running?");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col p-6 h-screen">
      <h1 className="text-xl font-bold text-white mb-8">Calls & Text Upload</h1>

      {/* Upload Button */}
      <div className="mb-8">
        <label className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
          isProcessing 
            ? "bg-slate-700 text-slate-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}>
          {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
          {isProcessing ? "Processing..." : "Upload File"}
          <input 
            type="file" 
            className="hidden" 
            disabled={isProcessing} 
            onChange={handleFileUpload}
            accept="audio/*, .txt, .csv" 
          />
        </label>
        {status && (
          <p className={`text-[11px] mt-2 text-center font-medium ${
            status.includes('Error') ? 'text-red-400' : 'text-blue-400'
          }`}>
            {status}
          </p>
        )}
      </div>

      {/* Recent Analysis Section */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock size={14} /> Recent Analysis
        </h3>
        
        <div className="space-y-3">
          {history.length > 0 ? (
            history.map((item) => {
              const isTextFile = item.name.endsWith('.txt') || item.name.endsWith('.csv');
              return (
                <div 
                  key={item.id} 
                  className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl hover:border-blue-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-700 rounded-lg group-hover:bg-blue-600/20 transition-colors">
                      {isTextFile ? (
                        <FileText size={18} className="text-slate-400 group-hover:text-blue-400" />
                      ) : (
                        <FileAudio size={18} className="text-slate-400 group-hover:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <CheckCircle2 size={10} /> {item.status}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10">
              <p className="text-xs text-slate-600 italic">No recent analysis found</p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Drop Zone Info */}
      <div className="mt-6 border-2 border-dashed border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-slate-600">
        <div className="bg-slate-800 p-2 rounded-lg mb-2">
          <Upload size={20} />
        </div>
        <p className="text-xs font-medium text-center">Chat logs or Call audio</p>
        <p className="text-[10px]">Supports .m4a, .mp3, .txt, .csv</p>
      </div>
    </div>
  );
}

export default LeftSidebar;