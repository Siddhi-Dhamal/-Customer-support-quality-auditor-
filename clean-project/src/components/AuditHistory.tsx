import { Download, PhoneCall, MessageSquare, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type AuditRecord, getScoreColor } from "@/lib/mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  audits: AuditRecord[];
  onSelect: (audit: AuditRecord) => void;
  selectedId?: string;
}

export function AuditHistory({ audits, onSelect, selectedId }: Props) {
  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-heading font-semibold">Audit History</h3>
        <Button variant="outline" size="sm" className="border-border/50 text-muted-foreground hover:text-foreground">
          <Download className="h-4 w-4 mr-2" /> Export All
        </Button>
      </div>
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {audits.map((audit) => (
            <button
              key={audit.id}
              onClick={() => onSelect(audit)}
              className={`w-full text-left rounded-xl p-4 transition-all border ${
                selectedId === audit.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-transparent hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {audit.type === "call" ? (
                    <PhoneCall className="h-4 w-4 text-primary" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-chart-4" />
                  )}
                  <span className="text-sm font-medium">{audit.title}</span>
                </div>
                <span className={`text-sm font-heading font-bold ${getScoreColor(audit.overallScore)}`}>
                  {audit.overallScore}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{audit.agent}</span>
                  <span>•</span>
                  <span>{audit.date}</span>
                  <span>•</span>
                  <span>{audit.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-border/50">
                    {audit.type}
                  </Badge>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
