import { AppLayout } from "@/components/AppLayout";
import { mockAudits, type QualityScore } from "@/lib/mock-data";
import { Heart, Shield, CheckCircle, Zap, RefreshCw, CircleDot, TrendingUp, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";

const selected = mockAudits[0];
const scores = selected.scores;

const scoreConfig: { key: keyof QualityScore; label: string; gradientClass: string; icon: React.ReactNode }[] = [
  { key: "empathy", label: "EMPATHY", gradientClass: "score-fill-gradient-cyan", icon: <Heart className="h-5 w-5 text-primary/30" /> },
  { key: "compliance", label: "COMPLIANCE", gradientClass: "score-fill-gradient-purple", icon: <Shield className="h-5 w-5 text-chart-4/30" /> },
  { key: "resolution", label: "RESOLUTION", gradientClass: "score-fill-gradient-green", icon: <CheckCircle className="h-5 w-5 text-success/30" /> },
];

const fairnessItems = [
  { label: "Name Neutrality", desc: "Agent treated customer consistently regardless of identity", score: 9, gradientClass: "score-fill-gradient-cyan" },
  { label: "Language Neutrality", desc: "Agent used clear, simple language without assumptions", score: 9, gradientClass: "score-fill-gradient-purple" },
  { label: "Tone Consistency", desc: "Agent maintained consistent warm professional tone", score: 9, gradientClass: "score-fill-gradient-green" },
  { label: "Equal Effort", desc: "Agent applied equal effort to resolve the issue", score: 9, gradientClass: "score-fill-gradient-amber" },
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
          <h1 className="text-3xl font-heading font-bold tracking-tight">Quality Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI-powered call quality scoring — auto-updates after every upload</p>
        </div>

        {/* Top Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {scoreConfig.map((s) => (
            <div key={s.key} className="glass-card card-hover rounded-2xl p-6">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{s.label}</span>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-heading font-black text-gradient-cyan">
                    {Math.round(scores[s.key] / 10)}
                  </span>
                  <span className="text-lg text-muted-foreground font-medium">/10</span>
                </div>
                {s.icon}
              </div>
              <div className="score-bar mt-5">
                <div className={`score-fill ${s.gradientClass}`} style={{ width: `${scores[s.key]}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Efficiency + Total Messages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card card-hover rounded-2xl p-6">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Efficiency Score</span>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-5xl font-heading font-black text-warning">{Math.round(scores.proficiency / 10)}</span>
              <span className="text-lg text-muted-foreground font-medium">/10</span>
            </div>
            <div className="score-bar mt-5">
              <div className="score-fill score-fill-gradient-amber" style={{ width: `${scores.proficiency}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-4">Based on conversation length and response speed</p>
          </div>
          <div className="glass-card card-hover rounded-2xl p-6">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Total Messages</span>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-5xl font-heading font-black text-primary">27</span>
              <MessageSquare className="h-6 w-6 text-primary/20" />
            </div>
            <p className="text-xs text-muted-foreground mt-4">Long call — may need improvement</p>
          </div>
        </div>

        {/* Detailed Quality Audit */}
        <div>
          <h2 className="text-xl font-heading font-bold">Detailed Quality Audit</h2>
          <p className="text-muted-foreground text-sm mt-1">Visual breakdown of Empathy, Compliance and Resolution across the call</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Empathy Fluctuations</span>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={empathyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 16%)" />
                  <XAxis dataKey="msg" tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                  <YAxis domain={[5, 10]} tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                  <Line type="monotone" dataKey="score" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ fill: "hsl(217 91% 60%)", r: 4, stroke: "hsl(217 91% 60%)", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Compliance Adherence</span>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complianceBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 16%)" />
                  <XAxis dataKey="step" tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                  <Bar dataKey="score" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Fairness Analysis */}
        <div className="glass-card rounded-2xl p-7 space-y-6">
          <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-xs font-semibold border border-success/20">
            <CircleDot className="h-3 w-3" /> Bias Reduction Applied
          </div>

          <div>
            <h3 className="text-lg font-heading font-bold">Fairness Analysis</h3>
            <p className="text-sm text-muted-foreground">How fairly and unbiasedly the agent handled this call</p>
          </div>

          <div className="space-y-6">
            {fairnessItems.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl font-heading font-black text-gradient-cyan">{item.score}</span>
                    <span className="text-xs text-muted-foreground">/10</span>
                  </div>
                </div>
                <div className="score-bar">
                  <div className={`score-fill ${item.gradientClass}`} style={{ width: `${item.score * 10}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-xl p-5 flex items-center justify-between">
            <span className="text-sm font-semibold">Overall Fairness Score</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-heading font-black text-gradient-cyan">9</span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
          </div>
        </div>

        {/* Quality Analysis */}
        <div className="glass-card rounded-2xl p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-heading font-bold">Quality Analysis</h3>
              <p className="text-sm text-muted-foreground">Scores auto-update when you upload a file on Home page</p>
            </div>
            <Button className="rounded-xl bg-gradient-to-r from-primary to-chart-4 text-white hover:opacity-90 glow-primary">
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh Scores
            </Button>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CircleDot className="h-4 w-4 text-muted-foreground" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">AI Auditor Reasoning</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{selected.summary}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
