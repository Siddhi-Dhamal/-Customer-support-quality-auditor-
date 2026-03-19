import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { type QualityScore, scoreLabels } from "@/lib/mock-data";

interface Props {
  scores: QualityScore;
}

export function ScoreRadarChart({ scores }: Props) {
  const data = Object.entries(scores).map(([key, value]) => ({
    metric: scoreLabels[key as keyof QualityScore],
    score: value,
    fullMark: 100,
  }));

  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up">
      <h3 className="text-lg font-heading font-semibold mb-2">Quality Breakdown</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(222 30% 20%)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(190 95% 50%)"
              fill="hsl(190 95% 50%)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
