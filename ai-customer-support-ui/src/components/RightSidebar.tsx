import { CheckCircle2, Circle, Loader2, BarChart3, X, Heart, Shield, Target, Brain, ThumbsUp } from 'lucide-react';
import { useState, useEffect } from 'react';

const keywords = [
  'Account Access', 'Authentication', 'Password Reset',
  'Security', 'Error Message', 'Customer Support', 'Resolution', 'Login Issue',
];

const actionItems = [
  { id: '1', text: 'Follow up with customer in 24 hours', completed: false },
  { id: '2', text: 'Update account security documentation', completed: true },
  { id: '3', text: 'Log issue in tracking system', completed: true },
  { id: '4', text: 'Send satisfaction survey', completed: false },
];

const EMOTION_CONFIG: Record<string, { emoji: string; color: string; bar: string; border: string }> = {
  Angry:      { emoji: '😠', color: 'text-red-400',     bar: 'bg-red-500',     border: 'border-red-500/20'    },
  Frustrated: { emoji: '😤', color: 'text-orange-400',  bar: 'bg-orange-500',  border: 'border-orange-500/20' },
  Happy:      { emoji: '😊', color: 'text-emerald-400', bar: 'bg-emerald-500', border: 'border-emerald-500/20'},
  Satisfied:  { emoji: '😌', color: 'text-teal-400',     bar: 'bg-teal-500',     border: 'border-teal-500/20'   },
  Sad:         { emoji: '😢', color: 'text-blue-400',     bar: 'bg-blue-500',     border: 'border-blue-500/20'   },
  Neutral:    { emoji: '😐', color: 'text-slate-400',   bar: 'bg-slate-500',   border: 'border-slate-500/20'   },
  Confused:   { emoji: '😕', color: 'text-yellow-400',  bar: 'bg-yellow-500',  border: 'border-yellow-500/20' },
  Anxious:    { emoji: '😰', color: 'text-purple-400',  bar: 'bg-purple-500',  border: 'border-purple-500/20' },
};

const SATISFACTION_CONFIG: Record<string, { color: string; bar: string; ring: string }> = {
  'Satisfied':     { color: 'text-emerald-400', bar: 'bg-emerald-500', ring: '#10b981' },
  'Neutral':       { color: 'text-blue-400',   bar: 'bg-blue-500',    ring: '#3b82f6' }, // Changed Amber to Blue
  'Not Satisfied': { color: 'text-red-400',     bar: 'bg-red-500',     ring: '#ef4444' },
  'Unknown':       { color: 'text-slate-400',   bar: 'bg-slate-500',   ring: '#64748b' },
};

interface EmotionData    { emotion: string; confidence: string; reason: string; }
interface SatisfactionData { score: string; score_percentage: string; status: string; reason: string; }

const parsePercent = (val: string) => {
  const n = parseInt((val || '0').replace('%', ''), 10);
  return isNaN(n) ? 0 : n;
};

interface RightSidebarProps {
  onReportData?: (data: any) => void;
}

function RightSidebar({ onReportData }: RightSidebarProps) {
  const [summary, setSummary]           = useState('Waiting for analysis...');
  const [loading, setLoading]           = useState(false);
  const [showDetails, setShowDetails]   = useState(false);
  const [scores, setScores]             = useState({ empathy: 0, compliance: 0, resolution: 0, reasoning: '' });
  const [emotionData, setEmotionData]   = useState<EmotionData | null>(null);
  const [satData, setSatData]           = useState<SatisfactionData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const fetchAudioSummary = async () => {
      try {
        const res  = await fetch(`https://auraq-ai-customer-quality-auditor-production.up.railway.app/get-summary?t=${Date.now()}`);
        const data = await res.json();
        const s = data.summary || 'No summary found.';
        setSummary(s);
        onReportData?.({ summary: s });
      } catch { setSummary('Error fetching summary.'); }
    };

  const fetchTextSummary = async () => {
      try {
        const res  = await fetch(`https://upbeat-essence-production-929d.up.railway.app/get-text-summary?t=${Date.now()}`);
        if (!res.ok) {
          setSummary('No summary available.');
          return;
        }
        const data = await res.json();
        const s = data.summary || 'No summary available.';
        setSummary(s);
        onReportData?.({ summary: s });
      } catch { setSummary('No summary available.'); }
    };


  const fetchQualityScores = async () => {
    try {
      const res = await fetch('https://charming-flexibility-production.up.railway.app/get-quality-scores');
      if (res.ok) setScores(await res.json());
    } catch {}
  };

  const fetchEmotionAndSatisfaction = async (source: 'audio' | 'text' = 'audio') => {
    setAnalysisLoading(true);
    try {
      const res = await fetch('https://caring-bravery-production.up.railway.app/analyze', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source }),
      });
      if (res.ok) {
        const data = await res.json();
        setEmotionData(data.emotion_analysis);
        setSatData(data.satisfaction_analysis);
        // Pass to Dashboard for PDF
        onReportData?.({
          emotionData: data.emotion_analysis,
          satData:     data.satisfaction_analysis,
        });
      }
    } catch {}
    finally { setAnalysisLoading(false); }
  };

  useEffect(() => {
    const handleRefresh = async (e: any) => {
      const type = e.detail;
      setLoading(true);
      if (type === 'audio') {
        await fetchAudioSummary();
        await fetchQualityScores();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await fetchEmotionAndSatisfaction('audio');
      } else {
        await fetchTextSummary();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await fetchEmotionAndSatisfaction('text');
      }
      setLoading(false);
    };

    window.addEventListener('refreshTranscript', handleRefresh);
    return () => window.removeEventListener('refreshTranscript', handleRefresh);
  }, []);

  const emotionCfg = EMOTION_CONFIG[emotionData?.emotion || ''] || EMOTION_CONFIG['Neutral'];
  const satCfg     = SATISFACTION_CONFIG[satData?.status || ''] || SATISFACTION_CONFIG['Unknown'];
  const satScore   = parsePercent(satData?.score_percentage || '0%');
  const confScore  = parsePercent(emotionData?.confidence   || '0%');

  return (
    <div className="w-full md:w-80 bg-[#0b1224] border-l border-white/5 h-screen overflow-y-auto flex flex-col relative shadow-2xl">
      <div className="p-5 space-y-4">

        {/* Header */}
        <div className="border-b border-white/5 pb-4">
          <h2 className="font-display text-base font-bold text-white">AI Insights</h2>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">Real-time call analysis</p>
        </div>

        {/* ── Executive Summary ── */}
        <div className="bg-[#161e31] border border-white/5 rounded-2xl p-4 card-hover">
          <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            📋 Executive Summary
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 text-blue-400 py-2">
              <Loader2 className="animate-spin" size={16} />
              <span className="text-xs">Generating...</span>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-blue-500/50 pl-3">
              {summary}
            </p>
          )}
        </div>

        

        {/* ── Customer Emotion ── */}
        <div className={`bg-[#161e31] border rounded-2xl p-4 card-hover transition-all duration-500
          ${emotionData ? emotionCfg.border : 'border-white/5'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <Brain size={11} /> Customer Emotion
            </h3>
            {emotionData && (
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-white/5 ${emotionCfg.color}`}>
                LIVE
              </span>
            )}
          </div>

          {analysisLoading ? (
            <div className="flex items-center gap-2 text-slate-400 py-3">
              <Loader2 className="animate-spin" size={15} />
              <span className="text-xs">Detecting emotion...</span>
            </div>
          ) : emotionData ? (
            <div className="space-y-3 fade-in-up">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{emotionCfg.emoji}</span>
                <div>
                  <p className={`text-lg font-display font-black ${emotionCfg.color}`}>{emotionData.emotion}</p>
                  <p className="text-[10px] text-slate-500">
                    Confidence: <span className={`font-bold ${emotionCfg.color}`}>{emotionData.confidence}</span>
                  </p>
                </div>
              </div>
              <div className="w-full bg-[#0b1224] rounded-full h-1.5 overflow-hidden">
                <div className={`${emotionCfg.bar} h-full rounded-full progress-bar`} style={{ width: `${confScore}%` }} />
              </div>
              <div className="bg-[#0b1224] rounded-xl p-3 border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Reason</p>
                <p className="text-[11px] text-slate-400 italic leading-relaxed">{emotionData.reason}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 gap-2 text-slate-700">
              <Brain size={24} className="opacity-30" />
              <p className="text-[11px] italic">Upload audio to detect emotion</p>
            </div>
          )}
        </div>

        {/* ── Satisfaction Score ── */}
        <div className="bg-[#161e31] border border-white/5 rounded-2xl p-4 card-hover">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <ThumbsUp size={11} /> Satisfaction Score
            </h3>
            {satData && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 ${satCfg.color}`}>
                {satData.status}
              </span>
            )}
          </div>

          {analysisLoading ? (
            <div className="flex items-center gap-2 text-slate-400 py-3">
              <Loader2 className="animate-spin" size={15} />
              <span className="text-xs">Analyzing satisfaction...</span>
            </div>
          ) : satData ? (
            <div className="space-y-3 fade-in-up">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-3xl font-display font-black ${satCfg.color}`}>{satData.score_percentage}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Satisfaction Score</p>
                </div>
                <div className="relative w-14 h-14">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0b1224" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={satCfg.ring}
                      strokeWidth="3"
                      strokeDasharray={`${satScore} 100`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">
                    {satData.score}
                  </span>
                </div>
              </div>

              <div className="w-full bg-[#0b1224] rounded-full h-1.5 overflow-hidden">
                <div className={`${satCfg.bar} h-full rounded-full progress-bar`} style={{ width: `${satScore}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>

              <div className="bg-[#0b1224] rounded-xl p-3 border border-white/5">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Reason</p>
                <p className="text-[11px] text-slate-400 italic leading-relaxed">{satData.reason}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 gap-2 text-slate-700">
              <ThumbsUp size={24} className="opacity-30" />
              <p className="text-[11px] italic">Upload audio to analyze satisfaction</p>
            </div>
          )}
        </div>

        

        

      </div>

      {/* ── Factor Analysis Modal ── */}
      {showDetails && (
        <div className="absolute inset-0 bg-[#0b1224]/98 z-50 p-5 flex flex-col backdrop-blur-md">
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
            <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-400" /> Factor Analysis
            </h3>
            <button onClick={() => setShowDetails(false)} className="text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto">
            {[
              { label: 'Empathy',    val: scores.empathy,    color: 'bg-blue-500',    icon: <Heart  size={14} /> },
              { label: 'Compliance', val: scores.compliance, color: 'bg-indigo-500',   icon: <Shield size={14} /> }, // Indigo matches blue theme better
              { label: 'Resolution', val: scores.resolution, color: 'bg-emerald-500',  icon: <Target size={14} /> },
            ].map((f) => (
              <div key={f.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-slate-400">
                    {f.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{f.label}</span>
                  </div>
                  <span className="text-lg font-display font-black text-white">
                    {f.val}<span className="text-xs text-slate-600">/10</span>
                  </span>
                </div>
                <div className="w-full bg-[#0b1224] h-2 rounded-full overflow-hidden">
                  <div className={`${f.color} h-full rounded-full progress-bar`} style={{ width: `${f.val * 10}%` }} />
                </div>
              </div>
            ))}

            <div className="mt-4 p-4 bg-[#161e31] rounded-2xl border border-white/5">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Auditor Reasoning</p>
              <p className="text-xs text-slate-400 italic leading-relaxed">
                {scores.reasoning || 'Analysis will appear here after a call is processed.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RightSidebar;