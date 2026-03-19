import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Heart, Shield, CheckCircle, RefreshCw, CircleDot,
  TrendingUp, MessageSquare, ThumbsUp, Globe, Loader2, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

export type QualityScores = {
  // Core scores (1-10)
  empathy:    number;
  compliance: number;
  resolution: number;
  efficiency?: number;

  // Computed by server
  efficiency_score:  number;
  avg_response_time: number;

  // LLM detail arrays
  empathy_timeline?:    { stage: string; score: number }[];
  compliance_steps?:    { step:  string; score: number }[];
  resolution_progress?: { stage: string; score: number }[];

  // Customer emotion + satisfaction
  customer_emotion?:           string;
  customer_emotion_emoji?:     string;
  emotion_confidence?:         number;
  customer_satisfaction?:      string;
  customer_satisfaction_emoji?: string;
  satisfaction_percentage?:    number;
  satisfaction_confidence?:    number;

  // Bias / fairness (per-call, content-driven)
  bias?: {
    name_neutrality:     number;
    language_neutrality: number;
    tone_consistency:    number;
    equal_effort:        number;
    overall_fairness:    number;
  };

  reasoning?: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

export const QUALITY_SCORES_KEY = "auraq_quality_scores";
const QUALITY_API = import.meta.env.VITE_QUALITY_API ?? "http://127.0.0.1:8002";

const DEFAULT_SCORES: QualityScores = {
  empathy: 0, compliance: 0, resolution: 0,
  efficiency_score: 0, avg_response_time: 0,
  empathy_timeline:     [{ stage: "Start", score: 0 }, { stage: "Mid", score: 0 }, { stage: "End", score: 0 }],
  compliance_steps:     [{ step: "ID Verify", score: 0 }, { step: "Protocol", score: 0 }, { step: "Closing", score: 0 }],
  resolution_progress:  [{ stage: "Discovery", score: 0 }, { stage: "Fixing", score: 0 }, { stage: "Solved", score: 0 }],
  customer_emotion:          "—",
  customer_emotion_emoji:    "😐",
  emotion_confidence:        0,
  customer_satisfaction:     "—",
  customer_satisfaction_emoji: "😐",
  satisfaction_percentage:   0,
  satisfaction_confidence:   0,
  bias: { name_neutrality: 0, language_neutrality: 0, tone_consistency: 0, equal_effort: 0, overall_fairness: 0 },
  reasoning: "No analysis yet — upload a file on the Home page.",
};

// Emotion → bar colour class
const EMOTION_COLOR: Record<string, string> = {
  happy:      "score-fill-gradient-green",
  satisfied:  "score-fill-gradient-cyan",
  neutral:    "score-fill-gradient-purple",
  anxious:    "score-fill-gradient-amber",
  frustrated: "score-fill-gradient-amber",
  angry:      "bg-red-500",
  sad:        "score-fill-gradient-purple",
  confused:   "score-fill-gradient-cyan",
};

// Satisfaction label → bar colour class
const SATISFACTION_COLOR: Record<string, string> = {
  "highly satisfied":  "score-fill-gradient-green",
  "satisfied":         "score-fill-gradient-cyan",
  "neutral":           "score-fill-gradient-purple",
  "somewhat satisfied":"score-fill-gradient-amber",
  "not satisfied":     "bg-red-500",
};

const fairnessKeys: { key: keyof NonNullable<QualityScores["bias"]>; label: string; desc: string; gradientClass: string }[] = [
  { key: "name_neutrality",     label: "Name Neutrality",     desc: "Agent treated customer consistently regardless of identity",  gradientClass: "score-fill-gradient-cyan"   },
  { key: "language_neutrality", label: "Language Neutrality", desc: "Agent used clear, simple language without assumptions",        gradientClass: "score-fill-gradient-purple" },
  { key: "tone_consistency",    label: "Tone Consistency",    desc: "Agent maintained consistent warm professional tone",           gradientClass: "score-fill-gradient-green"  },
  { key: "equal_effort",        label: "Equal Effort",        desc: "Agent applied equal effort to resolve the issue",             gradientClass: "score-fill-gradient-amber"  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Reports = () => {
  const [scores,    setScores]    = useState<QualityScores>(DEFAULT_SCORES);
  const [loading,   setLoading]   = useState(false);
  const [lastFetch, setLastFetch] = useState<string>("");

  // ── Score loading ────────────────────────────────────────────────────────
  // Always hits 8002 directly — never serves stale localStorage on first load.
  // localStorage is only used as an instant paint while the fetch is in-flight.
  const loadScores = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);

    // Paint instantly from localStorage while real fetch runs
    const cached = localStorage.getItem(QUALITY_SCORES_KEY);
    if (cached && !showLoader) {
      try {
        const parsed: QualityScores = JSON.parse(cached);
        if (parsed.empathy > 0 || parsed.compliance > 0 || parsed.resolution > 0) {
          setScores(parsed);
        }
      } catch {}
    }

    // Always fetch fresh from 8002 — this is the source of truth
    try {
      const res = await fetch(`${QUALITY_API}/get-quality-scores`, { cache: "no-store" });
      if (res.ok) {
        const data: QualityScores = await res.json();
        if (data.empathy > 0 || data.compliance > 0 || data.resolution > 0) {
          setScores(data);
          localStorage.setItem(QUALITY_SCORES_KEY, JSON.stringify(data));
          setLastFetch(new Date().toLocaleTimeString());
        }
      }
    } catch {
      // backend not running — stale localStorage paint is fine
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount + listen for cross-tab storage changes from Dashboard
  // + auto-poll every 30s so same-tab SPA stays fresh without manual Refresh
  useEffect(() => {
    loadScores();

    // Auto-poll: catches uploads done on the same SPA tab where storageEvent won't fire
    const poll = setInterval(() => loadScores(), 30_000);

    const onStorage = (e: StorageEvent) => {
      if (e.key === QUALITY_SCORES_KEY && e.newValue) {
        try {
          const parsed: QualityScores = JSON.parse(e.newValue);
          setScores(parsed);
          setLastFetch(new Date().toLocaleTimeString());
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(poll);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadScores]);

  // ── Derived values ────────────────────────────────────────────────────────

  const empathyTrendData     = (scores.empathy_timeline    ?? DEFAULT_SCORES.empathy_timeline!).map(t => ({ msg: t.stage, score: t.score }));
  const complianceBarData    = (scores.compliance_steps    ?? DEFAULT_SCORES.compliance_steps!).map(s => ({ step: s.step,  score: s.score }));
  const resolutionVelocityData = (scores.resolution_progress ?? DEFAULT_SCORES.resolution_progress!).map(r => ({ step: r.stage, score: r.score }));

  const bias         = scores.bias ?? DEFAULT_SCORES.bias!;
  // Prefer LLM-scored "efficiency" (1-10) over text-estimated "efficiency_score"
  const effScore = (scores.efficiency && scores.efficiency > 0)
    ? scores.efficiency
    : (scores.efficiency_score ?? 0);
  const hasData      = scores.empathy > 0 || scores.compliance > 0 || scores.resolution > 0;

  const emotion           = (scores.customer_emotion        ?? "—");
  const emotionEmoji      = (scores.customer_emotion_emoji  ?? "😐");
  const emotionConf       = (scores.emotion_confidence      ?? 0);
  const emotionBarClass   = EMOTION_COLOR[emotion.toLowerCase()] ?? "score-fill-gradient-cyan";

  const satisfaction      = (scores.customer_satisfaction         ?? "—");
  const satisfactionEmoji = (scores.customer_satisfaction_emoji   ?? "😐");
  const satisfactionPct   = (scores.satisfaction_percentage       ?? 0);
  const satisfactionConf  = (scores.satisfaction_confidence       ?? 0);
  const satisfactionBarClass = SATISFACTION_COLOR[satisfaction.toLowerCase()] ?? "score-fill-gradient-cyan";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Quality Reports</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              AI-powered call quality scoring — auto-updates after every upload
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastFetch && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last updated: {lastFetch}
              </span>
            )}
            <Button
              onClick={() => loadScores(true)}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-primary to-chart-4 text-white hover:opacity-90 glow-primary"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…</>
                : <><RefreshCw className="h-4 w-4 mr-2" /> Refresh</>
              }
            </Button>
          </div>
        </div>

        {/* No-data banner */}
        {!hasData && (
          <div className="glass-card rounded-2xl p-6 border border-dashed border-border/40 text-center text-sm text-muted-foreground">
            No quality scores yet — upload a file on the{" "}
            <span className="font-semibold text-foreground">Home page</span> to generate scores.
          </div>
        )}

        {/* ── Top 3 Score Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {([
            { key: "empathy",    label: "EMPATHY",    gradientClass: "score-fill-gradient-cyan",   icon: <Heart       className="h-5 w-5 text-primary/30"  /> },
            { key: "compliance", label: "COMPLIANCE", gradientClass: "score-fill-gradient-purple", icon: <Shield      className="h-5 w-5 text-chart-4/30"  /> },
            { key: "resolution", label: "RESOLUTION", gradientClass: "score-fill-gradient-green",  icon: <CheckCircle className="h-5 w-5 text-success/30" /> },
          ] as const).map((s) => {
            const val = (scores[s.key] as number) ?? 0;
            return (
              <div key={s.key} className="glass-card card-hover rounded-2xl p-6">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{s.label}</span>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-heading font-black text-gradient-cyan">{val}</span>
                    <span className="text-lg text-muted-foreground font-medium">/10</span>
                  </div>
                  {s.icon}
                </div>
                <div className="score-bar mt-5">
                  <div className={`score-fill ${s.gradientClass}`} style={{ width: `${val * 10}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Efficiency + Response Time ────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card card-hover rounded-2xl p-6">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Efficiency Score</span>
            <div className="flex items-baseline gap-1 mt-4">
              <span className="text-5xl font-heading font-black text-warning">{effScore}</span>
              <span className="text-lg text-muted-foreground font-medium">/10</span>
            </div>
            <div className="score-bar mt-5">
              <div className="score-fill score-fill-gradient-amber" style={{ width: `${effScore * 10}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-4">Based on conversation length and response speed</p>
          </div>

          <div className="glass-card card-hover rounded-2xl p-6">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Avg Response Time</span>
            <div className="flex items-center gap-3 mt-4">
              <span className="text-5xl font-heading font-black text-primary">
                {scores.avg_response_time > 0 ? `${scores.avg_response_time.toFixed(1)}s` : "—"}
              </span>
              <MessageSquare className="h-6 w-6 text-primary/20" />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {scores.avg_response_time > 0
                ? `Agent replied in avg ${scores.avg_response_time.toFixed(1)}s per customer message`
                : "No timestamp data available for this call"}
            </p>
          </div>
        </div>

        {/* ── Detailed Quality Audit ────────────────────────────────────── */}
        <div>
          <h2 className="text-xl font-heading font-bold">Detailed Quality Audit</h2>
          <p className="text-muted-foreground text-sm mt-1">Visual breakdown of Empathy, Compliance and Resolution across the call</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Empathy Fluctuations */}
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
                  <YAxis domain={[0, 10]} tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222 44% 10%)", border: "1px solid hsl(222 30% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)", fontSize: 12 }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(217 91% 60%)" strokeWidth={2}
                    dot={{ fill: "hsl(217 91% 60%)", r: 4, stroke: "hsl(217 91% 60%)", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compliance Adherence */}
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
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222 44% 10%)", border: "1px solid hsl(222 30% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)", fontSize: 12 }} />
                  <Bar dataKey="score" fill="hsl(160 84% 39%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Resolution Velocity */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <CheckCircle className="h-4 w-4 text-chart-4" />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Resolution Velocity</span>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resolutionVelocityData}>
                <defs>
                  <linearGradient id="resGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="hsl(271 81% 56%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(271 81% 56%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 16%)" />
                <XAxis dataKey="step" tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: "hsl(215 20% 45%)", fontSize: 10 }} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222 44% 10%)", border: "1px solid hsl(222 30% 20%)", borderRadius: "8px", color: "hsl(210 40% 96%)", fontSize: 12 }} />
                <Area type="monotone" dataKey="score" stroke="hsl(271 81% 56%)" fill="url(#resGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Customer Emotion & Satisfaction — LIVE from scores ────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Customer Emotion */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Customer Emotion</span>
              </div>
              {hasData && (
                <span className="text-[10px] uppercase tracking-widest font-bold text-success bg-success/15 px-3 py-1 rounded-full">Live</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-4xl">{emotionEmoji}</span>
              <div>
                <p className="text-xl font-heading font-bold capitalize">
                  {emotion === "—" ? "Not analysed yet" : emotion}
                </p>
                {emotionConf > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Confidence: <span className="font-bold text-foreground">{emotionConf}%</span>
                  </p>
                )}
              </div>
            </div>

            {emotionConf > 0 && (
              <div className="score-bar">
                <div className={`score-fill ${emotionBarClass}`} style={{ width: `${emotionConf}%` }} />
              </div>
            )}

            <div className="bg-secondary/40 rounded-xl p-4 border-l-2 border-success">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">AI Reasoning</p>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                {scores.reasoning ?? "Upload a file to generate analysis."}
              </p>
            </div>
          </div>

          {/* Customer Satisfaction */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Customer Satisfaction</span>
              </div>
              {hasData && (
                <span className="text-[10px] uppercase tracking-widest font-bold text-success bg-success/15 px-3 py-1 rounded-full">Live</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-4xl">{satisfactionEmoji}</span>
              <div>
                <p className="text-xl font-heading font-bold capitalize">
                  {satisfaction === "—" ? "Not analysed yet" : satisfaction}
                </p>
                {satisfactionConf > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Confidence: <span className="font-bold text-foreground">{satisfactionConf}%</span>
                  </p>
                )}
              </div>
            </div>

            {/* Satisfaction percentage bar — the key metric */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">Satisfaction level</span>
                <span className="text-sm font-heading font-black text-gradient-cyan">{satisfactionPct}%</span>
              </div>
              <div className="score-bar">
                <div className={`score-fill ${satisfactionBarClass}`} style={{ width: `${satisfactionPct}%` }} />
              </div>
            </div>

            <div className="bg-secondary/40 rounded-xl p-4 border-l-2 border-primary">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">AI Reasoning</p>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                {scores.reasoning ?? "Upload a file to generate analysis."}
              </p>
            </div>
          </div>

        </div>

        {/* ── Fairness Analysis — LIVE from scores.bias ─────────────────── */}
        <div className="glass-card rounded-2xl p-7 space-y-6">
          <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-xs font-semibold border border-success/20">
            <CircleDot className="h-3 w-3" /> Bias Reduction Applied
          </div>
          <div>
            <h3 className="text-lg font-heading font-bold">Fairness Analysis</h3>
            <p className="text-sm text-muted-foreground">How fairly and unbiasedly the agent handled this call</p>
          </div>

          <div className="space-y-6">
            {fairnessKeys.map((item) => {
              const val = bias[item.key] ?? 0;
              return (
                <div key={item.key}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xl font-heading font-black text-gradient-cyan">{val}</span>
                      <span className="text-xs text-muted-foreground">/10</span>
                    </div>
                  </div>
                  <div className="score-bar">
                    <div className={`score-fill ${item.gradientClass}`} style={{ width: `${val * 10}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-card rounded-xl p-5 flex items-center justify-between">
            <span className="text-sm font-semibold">Overall Fairness Score</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-heading font-black text-gradient-cyan">{bias.overall_fairness}</span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
          </div>
        </div>

        {/* ── AI Auditor Reasoning ──────────────────────────────────────── */}
        <div className="glass-card rounded-2xl p-7 space-y-5">
          <div>
            <h3 className="text-lg font-heading font-bold">Quality Analysis</h3>
            <p className="text-sm text-muted-foreground">Scores auto-update when you upload a file on the Home page</p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CircleDot className="h-4 w-4 text-muted-foreground" />
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">AI Auditor Reasoning</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {scores.reasoning || "No reasoning available yet. Upload a file to generate analysis."}
            </p>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default Reports;
