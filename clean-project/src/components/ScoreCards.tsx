import { type QualityScore, scoreLabels, getScoreColor, getScoreBg } from "@/lib/mock-data";
import { Heart, Shield, CheckCircle, Brain, Smile, ThumbsUp } from "lucide-react";

const scoreIcons: Record<keyof QualityScore, React.ReactNode> = {
  empathy: <Heart className="h-4 w-4" />,
  compliance: <Shield className="h-4 w-4" />,
  resolution: <CheckCircle className="h-4 w-4" />,
  proficiency: <Brain className="h-4 w-4" />,
  customerEmotion: <Smile className="h-4 w-4" />,
  customerSatisfaction: <ThumbsUp className="h-4 w-4" />,
};

interface Props {
  scores: QualityScore;
}

export function ScoreCards({ scores }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Object.entries(scores).map(([key, value]) => {
        const k = key as keyof QualityScore;
        return (
          <div key={key} className="glass-card rounded-xl p-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <div className={`${getScoreColor(value)}`}>{scoreIcons[k]}</div>
              <span className="text-xs text-muted-foreground">{scoreLabels[k]}</span>
            </div>
            <div className={`text-2xl font-heading font-bold ${getScoreColor(value)}`}>{value}</div>
            <div className="score-bar mt-2">
              <div
                className={`score-fill ${getScoreBg(value)}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
