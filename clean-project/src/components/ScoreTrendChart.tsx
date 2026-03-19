import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const trendData = [
  { date: "Mar 1", score: 82 },
  { date: "Mar 2", score: 85 },
  { date: "Mar 3", score: 79 },
  { date: "Mar 4", score: 88 },
  { date: "Mar 5", score: 84 },
  { date: "Mar 6", score: 90 },
  { date: "Mar 7", score: 84 },
  { date: "Mar 8", score: 95 },
  { date: "Mar 9", score: 88 },
  { date: "Mar 10", score: 78 },
  { date: "Mar 11", score: 92 },
];

export function ScoreTrendChart() {
  return (
    <div className="glass-card rounded-xl p-6 animate-slide-up">
      <h3 className="text-lg font-heading font-semibold mb-4">Score Trend</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(190 95% 50%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(190 95% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
            <XAxis dataKey="date" tick={{ fill: "hsl(215 20% 45%)", fontSize: 11 }} axisLine={false} />
            <YAxis domain={[60, 100]} tick={{ fill: "hsl(215 20% 45%)", fontSize: 11 }} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222 44% 10%)",
                border: "1px solid hsl(222 30% 20%)",
                borderRadius: "8px",
                color: "hsl(210 40% 96%)",
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="score" stroke="hsl(190 95% 50%)" fill="url(#scoreGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
