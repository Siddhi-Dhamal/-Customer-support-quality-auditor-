import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Upload, Mic, Search, User, Headphones } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { mockTranscript } from "@/lib/mock-data";

const Index = () => {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [searchTranscript, setSearchTranscript] = useState("");

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const filteredTranscript = mockTranscript.filter((entry) =>
    entry.text.toLowerCase().includes(searchTranscript.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Home Page</h1>
          <p className="text-muted-foreground mt-1 text-sm">Upload, transcribe and analyze customer calls</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card card-hover rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Total Files</span>
            </div>
            <div className="text-4xl font-heading font-black">{files.length > 0 ? files.length : 4}</div>
            <p className="text-xs text-muted-foreground mt-1">uploaded</p>
          </div>
          <div className="glass-card card-hover rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Avg Satisfaction</span>
            </div>
            <div className="text-4xl font-heading font-black">—</div>
            <p className="text-xs text-muted-foreground mt-1">last {files.length > 0 ? files.length : 4} files</p>
          </div>
          <div className="glass-card card-hover rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-chart-4" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Avg Emotion</span>
            </div>
            <div className="text-4xl font-heading font-black">—</div>
            <p className="text-xs text-muted-foreground mt-1">no data yet</p>
          </div>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "audio/*,.txt,.json,.csv";
            input.multiple = true;
            input.onchange = () => {
              if (input.files) setFiles((prev) => [...prev, ...Array.from(input.files!)]);
            };
            input.click();
          }}
          className={`glass-card rounded-2xl p-12 md:p-20 text-center cursor-pointer transition-all border-2 border-dashed ${
            dragOver ? "border-primary bg-primary/5 glow-primary" : "border-border/30 hover:border-primary/40"
          }`}
        >
          <div className="flex flex-col items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center glow-primary animate-glow-pulse">
              <Upload className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-heading font-bold">Upload Your Call</h3>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Drag and drop or click to browse • .M4A .MP3 .WAV .TXT .CSV
            </p>
          </div>
        </div>

        {/* Live Transcript */}
        <div className="rounded-2xl overflow-hidden bg-[hsl(210_20%_95%)] text-[hsl(222_47%_11%)]">
          <div className="px-6 pt-6 pb-4 flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-heading font-bold uppercase tracking-[0.15em] text-primary">Live Transcript</h3>
          </div>
          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transcript..."
                value={searchTranscript}
                onChange={(e) => setSearchTranscript(e.target.value)}
                className="pl-10 bg-white border-[hsl(220_13%_85%)] rounded-xl text-[hsl(222_47%_11%)]"
              />
            </div>
          </div>
          <ScrollArea className="h-[420px]">
            <div className="px-6 pb-6 space-y-6">
              {filteredTranscript.map((entry, i) => (
                <div key={i} className={`flex flex-col ${entry.speaker === "customer" ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {entry.speaker === "agent" ? (
                      <>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Agent</span>
                        <span className="text-[11px] text-[hsl(220_13%_55%)]">{entry.timestamp}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-[hsl(220_13%_55%)]">{entry.timestamp}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-chart-4">Customer</span>
                      </>
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                      entry.speaker === "agent"
                        ? "bg-[hsl(210_20%_88%)] text-[hsl(222_47%_11%)] rounded-tl-md"
                        : "bg-gradient-to-r from-primary to-primary/80 text-white rounded-tr-md"
                    }`}
                  >
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
