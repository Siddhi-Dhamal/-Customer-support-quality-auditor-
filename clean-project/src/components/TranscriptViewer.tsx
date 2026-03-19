import { type TranscriptEntry } from "@/lib/mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Headphones } from "lucide-react";

interface Props {
  transcript: TranscriptEntry[];
}

export function TranscriptViewer({ transcript }: Props) {
  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up">
      <h3 className="text-lg font-heading font-semibold mb-4">Transcript</h3>
      <ScrollArea className="h-[360px] pr-4">
        <div className="space-y-4">
          {transcript.map((entry, i) => (
            <div key={i} className={`flex gap-3 ${entry.speaker === "agent" ? "" : "flex-row-reverse"}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                entry.speaker === "agent" ? "bg-primary/15 text-primary" : "bg-chart-4/15 text-chart-4"
              }`}>
                {entry.speaker === "agent" ? <Headphones className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                entry.speaker === "agent"
                  ? "bg-secondary/60 text-foreground"
                  : "bg-primary/10 text-foreground"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {entry.speaker === "agent" ? "Agent" : "Customer"}
                  </span>
                  <span className="text-xs text-muted-foreground/50">{entry.timestamp}</span>
                </div>
                {entry.text}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
