import { Sparkles } from "lucide-react";

interface Props {
  summary: string;
  overallScore: number;
}

export function SummaryCard({ summary, overallScore }: Props) {
  const getGrade = (s: number) => {
    if (s >= 90) return "A";
    if (s >= 80) return "B";
    if (s >= 70) return "C";
    if (s >= 60) return "D";
    return "F";
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-heading font-semibold">AI Summary</h3>
      </div>
      <div className="flex items-start gap-5">
        <div className="flex-shrink-0 h-20 w-20 rounded-2xl bg-primary/10 glow-primary flex flex-col items-center justify-center">
          <span className="text-3xl font-heading font-bold text-primary">{overallScore}</span>
          <span className="text-xs text-primary/70">Grade {getGrade(overallScore)}</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
      </div>
    </div>
  );
}
