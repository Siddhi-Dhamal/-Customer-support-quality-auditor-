import { Link } from "react-router-dom";
import { ArrowRight, Shield, BarChart3, Mic, Zap, CheckCircle, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Mic,
    title: "Call & Chat Analysis",
    desc: "Upload recordings or chat logs and get instant AI-powered transcription and quality scoring.",
  },
  {
    icon: BarChart3,
    title: "Quality Scoring",
    desc: "Six-dimensional scoring across empathy, compliance, resolution, proficiency, and more.",
  },
  {
    icon: Shield,
    title: "Bias Detection",
    desc: "Automatic fairness analysis ensures agents treat all customers equally and consistently.",
  },
  {
    icon: Zap,
    title: "Real-Time Insights",
    desc: "Live transcription with searchable history and instant AI-generated summaries.",
  },
];

const stats = [
  { value: "99.2%", label: "Accuracy" },
  { value: "50ms", label: "Latency" },
  { value: "10K+", label: "Calls Analyzed" },
  { value: "6", label: "Quality Metrics" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-heading font-bold">AuraQ</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#preview" className="hover:text-foreground transition-colors">Product</a>
          <a href="#stats" className="hover:text-foreground transition-colors">Stats</a>
        </div>
        <Link to="/dashboard">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6">
            Dashboard <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative max-w-[1200px] mx-auto px-6 pt-20 pb-32 text-center bg-hero-gradient">
        {/* Decorative orbs */}
        <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute top-20 right-1/4 w-60 h-60 rounded-full bg-chart-4/5 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-4 py-2 rounded-full mb-8">
            <Zap className="h-3 w-3" /> AI-Powered Quality Auditing
          </div>

          <h1 className="text-5xl md:text-7xl font-heading font-black leading-tight max-w-4xl mx-auto">
            Audit Every Call with{" "}
            <span className="text-gradient">AI Precision</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-6 leading-relaxed">
            AuraQ transcribes, scores, and analyzes every customer interaction in real time.
            Ensure compliance, measure empathy, and elevate your team's performance.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <Link to="/dashboard">
              <Button size="lg" className="rounded-xl px-8 py-6 text-base font-semibold bg-gradient-to-r from-primary to-chart-4 hover:opacity-90 text-white glow-accent">
                Get Started <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="rounded-xl px-8 py-6 text-base border-border/50 text-muted-foreground hover:text-foreground">
                Learn More
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Product Preview */}
      <section id="preview" className="relative max-w-[1100px] mx-auto px-6 -mt-16">
        <div className="neon-border rounded-2xl p-1 bg-card/30 backdrop-blur-xl">
          <div className="rounded-xl bg-card p-6 md:p-8 space-y-4">
            {/* Mock dashboard preview */}
            <div className="flex items-center gap-3 mb-2">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-warning/60" />
              <div className="h-3 w-3 rounded-full bg-success/60" />
              <span className="text-xs text-muted-foreground ml-2 font-mono">AuraQ Dashboard</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["Empathy", "Compliance", "Resolution"].map((label, i) => (
                <div key={label} className="glass-card rounded-xl p-4">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-heading font-bold text-primary">{[8, 9, 8][i]}</span>
                    <span className="text-sm text-muted-foreground">/10</span>
                  </div>
                  <div className="score-bar mt-3">
                    <div className={`score-fill ${["score-fill-gradient-cyan", "score-fill-gradient-purple", "score-fill-gradient-green"][i]}`} style={{ width: `${[80, 90, 80][i]}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="glass-card rounded-xl p-4 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full w-3/4" />
                <div className="h-2 bg-muted/50 rounded-full w-1/2 mt-2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="max-w-[1100px] mx-auto px-6 py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl md:text-5xl font-heading font-black text-gradient-cyan">{stat.value}</div>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-[1100px] mx-auto px-6 pb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold">
            Everything you need to{" "}
            <span className="text-gradient">audit quality</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
            From real-time transcription to fairness analysis — one platform for complete quality assurance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((f) => (
            <div key={f.title} className="glass-card card-hover rounded-2xl p-7">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-heading font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-[1100px] mx-auto px-6 pb-24">
        <div className="neon-border rounded-2xl p-10 md:p-16 text-center bg-hero-gradient">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Ready to transform your QA?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Start auditing calls and chats with AI precision. No setup required.
          </p>
          <Link to="/dashboard">
            <Button size="lg" className="rounded-xl px-10 py-6 text-base font-semibold bg-gradient-to-r from-primary to-chart-4 hover:opacity-90 text-white glow-accent">
              Launch Dashboard <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 AuraQ. AI-Powered Customer Quality Auditing.</p>
      </footer>
    </div>
  );
}
