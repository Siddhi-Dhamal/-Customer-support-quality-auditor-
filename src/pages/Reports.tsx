import { AppLayout } from "@/components/AppLayout";
import { mockAudits, scoreLabels, type QualityScore } from "@/lib/mock-data";
import { Heart, Shield, CheckCircle, Brain, Zap, RefreshCw, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const selected = mockAudits[0];
const scores = selected.scores;

const scoreConfig: { key: keyof QualityScore; label: string; color: string; icon: React.ReactNode }[] = [
  { key: "empathy", label: "EMPATHY", color: "hsl(190 95% 50%)", icon: <Heart className="h-5 w-5 text-primary opacity-40" /> },
  { key: "compliance", label: "COMPLIANCE", color: "hsl(280 65% 60%)", icon: <Shield className="h-5 w-5 text-chart-4 opacity-40" /> },
  { key: "resolution", label: "RESOLUTION", color: "hsl(152 69% 45%)", icon: <CheckCircle className="h-5 w-5 text-success opacity-40" /> },
];

const fairnessItems = [
  { label: "Name Neutrality", desc: "Agent treated customer consistently regardless of identity", score: 9, color: "bg-primary" },
  { label: "Language Neutrality", desc: "Agent used clear, simple language without assumptions", score: 9, color: "bg-chart-4" },
  { label: "Tone Consistency", desc: "Agent maintained consistent warm professional tone", score: 9, color: "bg-success" },
  { label: "Equal Effort", desc: "Agent applied equal effort to resolve the issue", score: 9, color: "bg-warning" },
];

const empathyTrendData = [
  { msg: "1", score: 7 }, { msg: "2", score: 7.5 }, { msg: "3", score: 7 },
  { msg: "4", score: 6.5 }, { msg: "5", score: 7 }, { msg: "6", score: 7.5 },
];

const complianceBarData = [
  { step: "S1", score: 9 }, { step: "S2", score: 7 },
  { step: "S3", score: 9 }, { step: "S4", score: 8 },
];

const Reports = () => {
  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-heading font-bold">Quality Reports</h1>
          <p className="text-muted-foreground mt-1">AI-powered call quality scoring — auto-updates after every upload</p>
        </div>

        {/* Top Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {scoreConfig.map((s) => (
            <div key={s.key} className="glass-card rounded-xl p-5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{s.label}</span>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-heading font-bold" style={{ color: s.color }}>
                    {Math.round(scores[s.key] / 10)}
                  </span>
                  <span className="text-lg text-muted-foreground">/10</span>
                </div>
                {s.icon}
              </div>
              <div className="score-bar mt-4">
                <div className="score-fill" style={{ width: `${scores[s.key]}%`, backgroundColor: s.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Efficiency + Total Messages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Efficiency Score</span>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-4xl font-heading font-bold text-warning">{Math.round(scores.proficiency / 10)}</span>
              <span className="text-lg text-muted-foreground">/10</span>
            </div>
            <div className="score-bar mt-4">
              <div className="score-fill bg-warning" style={{ width: `${scores.proficiency}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Based on conversation length and response speed</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Messages</span>
            <div className="text-4xl font-heading font-bold text-primary mt-3">27</div>
            <p className="text-xs text-muted-foreground mt-3">Long call — may need improvement</p>
          </div>
        </div>

        {/* Detailed Quality Audit */}
        <div>
          <h2 className="text-xl font-heading font-bold">Detailed Quality Audit</h2>
          <p className="text-muted-foreground text-sm mt-1">Visual breakdown of Empathy, Compliance and Resolution across the call</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Empathy Fluctuations */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Empathy Fluctuations</span>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={empathyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
                  <XAxis dataKey="msg" tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                  <YAxis domain={[5, 10]} tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                  <Line type="monotone" dataKey="score" stroke="hsl(190 95% 50%)" strokeWidth={2} dot={{ fill: "hsl(190 95% 50%)", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compliance Adherence */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-success" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Compliance Adherence</span>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complianceBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
                  <XAxis dataKey="step" tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                  <Bar dataKey="score" fill="hsl(152 69% 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Fairness Analysis */}
        <div className="glass-card rounded-xl p-6 space-y-5">
          <div className="inline-flex items-center gap-2 bg-success/15 text-success px-3 py-1.5 rounded-full text-xs font-medium">
            <CircleDot className="h-3 w-3" /> Bias Reduction Applied
          </div>

          <div>
            <h3 className="text-lg font-heading font-bold">Fairness Analysis</h3>
            <p className="text-sm text-muted-foreground">How fairly and unbiasedly the agent handled this call</p>
          </div>

          <div className="space-y-5">
            {fairnessItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-lg font-heading font-bold text-primary">{item.score}</span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                </div>
                <div className="score-bar">
                  <div className={`score-fill ${item.color}`} style={{ width: `${item.score * 10}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm font-medium">Overall Fairness Score</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-heading font-bold text-primary">9</span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
          </div>
        </div>

        {/* Quality Analysis */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-heading font-bold">Quality Analysis</h3>
              <p className="text-sm text-muted-foreground">Scores auto-update when you upload a file on Home page</p>
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh Scores
            </Button>
          </div>

          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CircleDot className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">AI Auditor Reasoning</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{selected.summary}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
