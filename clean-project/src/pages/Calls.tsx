import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Headphones, FileText, CheckCircle, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUDIO_API = import.meta.env.VITE_AUDIO_API ?? "http://127.0.0.1:8000";
const CHAT_API  = import.meta.env.VITE_CHAT_API  ?? "http://127.0.0.1:8001";
const AUDIO_EXTENSIONS = ["m4a", "mp3", "wav", "ogg", "flac", "aac", "webm", "mp4"];

type HistoryEntry = {
  file_name: string;
  timestamp: string;
  summary:   string;
  type:      "audio" | "text";
};

function isAudio(filename: string): boolean {
  const ext = (filename ?? "").split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.includes(ext);
}

function isSummaryError(summary: string | undefined): boolean {
  if (!summary) return true;
  const s = summary.toLowerCase();
  return s.startsWith("summary failed") || s.startsWith("no summary") || s.includes("httpsconnectionpool");
}

const Calls = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = () => {
    setLoading(true);
    let done = 0;
    let all: HistoryEntry[] = [];

    const finish = () => {
      done++;
      if (done < 2) return;
      setHistory(all);
      setLoading(false);
    };

    const xhrAudio = new XMLHttpRequest();
    xhrAudio.open("GET", `${AUDIO_API}/history`, true);
    xhrAudio.timeout = 5000;
    xhrAudio.onload = () => {
      try {
        if (xhrAudio.status === 200) {
          const data = JSON.parse(xhrAudio.responseText);
          if (Array.isArray(data)) {
            all = [...all, ...data.map((r: any) => ({ ...r, type: "audio" as const }))];
          }
        }
      } catch {}
      finish();
    };
    xhrAudio.onerror = xhrAudio.ontimeout = finish;
    xhrAudio.send();

    const xhrChat = new XMLHttpRequest();
    xhrChat.open("GET", `${CHAT_API}/history`, true);
    xhrChat.timeout = 5000;
    xhrChat.onload = () => {
      try {
        if (xhrChat.status === 200) {
          const data = JSON.parse(xhrChat.responseText);
          if (Array.isArray(data)) {
            all = [...all, ...data.map((r: any) => ({ ...r, type: "text" as const }))];
          }
        }
      } catch {}
      finish();
    };
    xhrChat.onerror = xhrChat.ontimeout = finish;
    xhrChat.send();
  };

  useEffect(() => { loadHistory(); }, []);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Call History</h1>
            <p className="text-muted-foreground mt-1 text-sm">All uploaded and analyzed calls &amp; chats</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={loadHistory} className="rounded-xl" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setHistory([])}
              className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4 mr-2" /> Clear History
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
            <Headphones className="h-3 w-3 text-primary" /> Audio Call
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
            <FileText className="h-3 w-3 text-chart-4" /> Text Chat
          </span>
        </div>

        {loading ? (
          <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : history.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground text-sm">
            No uploads yet. Go to the Home page to upload a call or chat file.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => {
              const audio = isAudio(entry.file_name);
              return (
                <div key={i} className="glass-card card-hover rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center neon-border ${audio ? "bg-primary/10" : "bg-chart-4/10"}`}>
                      {audio
                        ? <Headphones className="h-5 w-5 text-primary" />
                        : <FileText   className="h-5 w-5 text-chart-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{entry.file_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.timestamp ?? "—"} · <span className={audio ? "text-primary" : "text-chart-4"}>{audio ? "Audio Call" : "Text Chat"}</span>
                      </p>
                      {!isSummaryError(entry.summary) && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[600px] line-clamp-1 italic">{entry.summary}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Ready</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default Calls;
