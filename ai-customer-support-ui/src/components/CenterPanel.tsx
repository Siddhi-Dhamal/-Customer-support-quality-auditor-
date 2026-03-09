import { Search, Loader2, Upload, Mic, FileAudio, FileText, CheckCircle, CheckCircle2, Phone, BarChart3, TrendingUp, Activity, Target, Heart, ShieldCheck, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { NavPage } from "./Dashboard";

interface Message { speaker: string; text: string; time: string; }
interface HistoryItem { file_name: string; timestamp: string; summary?: string; }
interface StatCard { label: string; value: string; sub: string; glowClass: string; dotColor: string; }
interface FairnessScores {name_neutrality: number; language_neutrality: number; tone_consistency: number; equal_effort: number;}
interface QualityScores { empathy: number; compliance: number; resolution: number; reasoning: string; efficiency_score:number; total_messages: number; bias_reduction_applied: boolean; names_anonymized: string[]; fairness_scores: FairnessScores;}
interface AnalysisData {
  empathy_timeline: { stage: string; score: number }[];
  compliance_steps: { step: string; score: number }[];
  resolution_progress: { stage: string; score: number }[];
  reasoning: string;
  empathy: number;
  compliance: number;
  resolution: number;
  efficiency_score: number; 
  total_messages: number;
  bias_reduction_applied: boolean;
  names_anonymized: string[];
  fairness_scores: FairnessScores;
}
interface CenterPanelProps { activePage: NavPage; onFileUploaded?: () => void; onReportData?: (data: any) => void; }

function CenterPanel({ activePage, onFileUploaded, onReportData }: CenterPanelProps) {
  const [messages, setMessages]           = useState<Message[]>([]);
  const [loading, setLoading]             = useState(false);
  const [searchTerm, setSearchTerm]       = useState("");
  const [status, setStatus]               = useState<string | null>(null);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [history, setHistory]             = useState<HistoryItem[]>([]);
  const [isDragging, setIsDragging]       = useState(false);
  const [lastAvgSatisfaction, setLastAvgSatisfaction] = useState<number | null>(null);
  const [lastAvgEmotion, setLastAvgEmotion]           = useState<string>("no data yet");
  const [lastEmotionEmoji, setLastEmotionEmoji]       = useState<string>("—");
  const [audioURL, setAudioURL]           = useState<string | null>(null);
  const [isAudioFile, setIsAudioFile]     = useState(false);
  const [scores, setScores]               = useState<QualityScores>({ empathy: 0, compliance: 0, resolution: 0, reasoning: "No analysis yet.", efficiency_score: 0,total_messages: 0,bias_reduction_applied: false,names_anonymized: [], fairness_scores:{name_neutrality: 0, language_neutrality: 0, tone_consistency:0, equal_effort: 0} });
  const [scoresLoading, setScoresLoading] = useState(false);
  const [analysisData, setAnalysisData]   = useState<AnalysisData>({
    empathy_timeline: [], compliance_steps: [], resolution_progress: [],
    reasoning: "", empathy: 0, compliance: 0, resolution: 0, efficiency_score: 0, total_messages: 0,
    bias_reduction_applied: false, 
    names_anonymized: [], 
    fairness_scores: { name_neutrality: 0, language_neutrality: 0, tone_consistency: 0,equal_effort: 0}
  });

// Dynamic avg satisfaction from quality scores
const avgScore = (scores.empathy + scores.compliance + scores.resolution) / 3;

useEffect(() => {
  if (scores.empathy > 0 || scores.compliance > 0 || scores.resolution > 0) {
    // Real scores received — update last known good values
    const newAvg          = (scores.empathy + scores.compliance + scores.resolution) / 3;
    const newSatisfaction = Math.round(newAvg * 10);
    const newEmoji        = newAvg >= 8 ? "😊" : newAvg >= 6 ? "😐" : newAvg >= 4 ? "😟" : "😠";
    const newLabel        = newAvg >= 8 ? "mostly happy" : newAvg >= 6 ? "mostly neutral" : newAvg >= 4 ? "mostly sad" : "mostly angry";

    setLastAvgSatisfaction(newSatisfaction);
    setLastEmotionEmoji(newEmoji);
    setLastAvgEmotion(newLabel);
  }
  // If scores are 0 — do nothing, keep showing previous values
}, [scores.empathy, scores.compliance, scores.resolution]);

const avgSatisfaction = lastAvgSatisfaction;
const emotionEmoji    = lastEmotionEmoji;
const emotionLabel    = lastAvgEmotion;

const stats: StatCard[] = [
  { label: "Total Files",      value: String(history.length || 0),                           sub: "uploaded",  glowClass: "glow-blue",   dotColor: "bg-blue-400"   },
  { label: "Avg Satisfaction", value: avgSatisfaction !== null ? `${avgSatisfaction}%` : "—", sub: history.length > 0 ? `last ${history.length} file${history.length > 1 ? "s" : ""}` : "no data yet", glowClass: "glow-blue", dotColor: "bg-blue-400" },
  { label: "Avg Emotion",      value: emotionEmoji,                                           sub: emotionLabel, glowClass: "glow-purple", dotColor: "bg-purple-400" },
];

  // ── Fetch history ──
  const fetchHistory = async () => {
    try {
      const [audioRes, textRes] = await Promise.all([
        fetch("https://auraq-ai-customer-quality-auditor-production.up.railway.app/history").catch(() => null), 
        fetch("https://upbeat-essence-production-929d.up.railway.app/history").catch(() =>null),
      ]); 
      const audioData=audioRes?.ok ? await audioRes.json() :[];
      const textData=textRes?.ok ? await textRes.json() : []; 
      console.log("AUDIO HISTORY:",audioData);
      console.log("TEXT HISTORY:",textData);

      const combined = [ 
        ...(Array.isArray(audioData) ? audioData : []), 
        ...(Array.isArray(textData) ? textData : []), 
      ]; 

      combined.sort((a, b) => {
        const tA = new Date(a.timestamp).getTime();
        const tB = new Date(b.timestamp).getTime();
        if (isNaN(tA) || isNaN(tB)) return 0;
        return tB - tA;
      });
      setHistory(combined);
  } catch { setHistory([]); }
}; 

  // ── Fetch transcript ──
  const fetchTranscript = async (source: "audio" | "text") => {
    setLoading(true);
    try {
      const endpoint = source === "audio"
        ? "https://auraq-ai-customer-quality-auditor-production.up.railway.app/get-transcript?t=" + Date.now()
        : "https://upbeat-essence-production-929d.up.railway.app/get-text-transcript?t=" + Date.now();
      const res  = await fetch(endpoint);
      const data = await res.json();
      if (data && data.length > 0) {
        setMessages(data.map((item: any) => ({
          speaker: item.speaker || "Speaker 00",
          text:    item.text || item.transcription || "",
          time:    item.start ? new Date(item.start * 1000).toISOString().substr(14, 5) : "00:00",
        })));
      } else { setMessages([]); }
    } catch { setMessages([]); }
    finally { setLoading(false); }
  };

  // ── Fetch detailed analysis charts data ──
const fetchAnalysisData = async () => {
    try {
      const res = await fetch("https://charming-flexibility-production.up.railway.app/get-quality-scores?t=" + Date.now());
      if (res.ok) {
        const json = await res.json();
        // Only update if actual scores exist — never overwrite good scores with zeros
        if (json.empathy > 0 || json.compliance > 0 || json.resolution > 0) {
          setAnalysisData(json);
          setScores(json);
        }
      }
    } catch (e) { console.error("Analysis fetch error:", e); }
  };

  // ── Run quality scoring in background after upload ──
const runQualityScoring = async (file: File) => {
    try {
      const isAudio = file.type.startsWith("audio/");
      console.log("runQualityScoring START — file:", file.name, "isAudio:", isAudio);
      const formData = new FormData();

      if (isAudio) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        const transcriptRes  = await fetch("https://auraq-ai-customer-quality-auditor-production.up.railway.app/get-transcript?t=" + Date.now());
        const transcriptData = await transcriptRes.json();
        if (!transcriptData || transcriptData.length === 0) return;
        const text = transcriptData
          .map((item: any) => (item.speaker || "") + ": " + (item.text || ""))
          .join("\n");
        const blob = new Blob([text], { type: "text/plain" });
        formData.append("file", blob, "audio_transcript.txt");
        // Pass original filename so PDF shows correct name
        formData.append("original_filename", file.name);

      } else {
        // For txt/csv: wait for upload-text to finish, then read transcript
        await new Promise(resolve => setTimeout(resolve, 3000));
        const transcriptRes  = await fetch("https://upbeat-essence-production-929d.up.railway.app/get-text-transcript?t=" + Date.now());
        const transcriptData = await transcriptRes.json();
        if (!transcriptData || transcriptData.length === 0) {
          // Fallback: read file directly
          const content = await file.text();
          const blob = new Blob([content], { type: "text/plain" });
          formData.append("file", blob, file.name);
        } else {
          const text = transcriptData
            .map((item: any) => (item.speaker || "") + ": " + (item.text || ""))
            .join("\n");
          const blob = new Blob([text], { type: "text/plain" });
          formData.append("file", blob, file.name);
        }
        formData.append("original_filename", file.name);
      }
      
      console.log("Sending to scoring server — formData keys:", [...formData.keys()]);
      const analyzeRes = await fetch("https://charming-flexibility-production.up.railway.app/analyze-quality", {
        method: "POST",
        body: formData,
      });
      console.log("Scoring server response status:", analyzeRes.status);

    if (analyzeRes.ok) {
            const data = await analyzeRes.json();
            console.log("SCORING DATA RECEIVED:", data.empathy, data.compliance, data.resolution);
            setScores({
              empathy:    data.empathy    ?? 0,
              compliance: data.compliance ?? 0,
              resolution: data.resolution ?? 0,
              reasoning:  data.reasoning  ?? "",
              efficiency_score : data.efficiency_score ?? 0, 
              total_messages: data.total_messages ?? 0,
              bias_reduction_applied: data.bias_reduction_applied ?? false,
              names_anonymized:       data.names_anonymized       ?? [],
              fairness_scores:        data.fairness_scores        ?? { name_neutrality: 0, language_neutrality: 0, tone_consistency: 0, equal_effort: 0 },
            });
            setAnalysisData({
              empathy:             data.empathy    ?? 0,
              compliance:          data.compliance ?? 0,
              resolution:          data.resolution ?? 0,
              reasoning:           data.reasoning  ?? "",
              efficiency_score:    data.efficiency_score  ?? 0,
              total_messages:      data.total_messages      ?? 0,
              empathy_timeline:    data.empathy_timeline    ?? [],
              compliance_steps:    data.compliance_steps    ?? [],
              resolution_progress: data.resolution_progress ?? [],
              bias_reduction_applied: data.bias_reduction_applied ?? false,
              names_anonymized:       data.names_anonymized       ?? [],
              fairness_scores:        data.fairness_scores        ?? { name_neutrality: 0, language_neutrality: 0, tone_consistency: 0, equal_effort: 0 },
            });
            window.dispatchEvent(new CustomEvent("scoresUpdated", { detail: data }));
            onReportData?.({
              fileName:        file.name,
              scores: {
                empathy:          data.empathy          ?? 0,
                compliance:       data.compliance       ?? 0,
                resolution:       data.resolution       ?? 0,
                reasoning:        data.reasoning        ?? '',
                efficiency_score: data.efficiency_score ?? 0,
                total_messages:   data.total_messages   ?? 0,
              },
              fairnessScores:  data.fairness_scores  ?? { name_neutrality: 0, language_neutrality: 0, tone_consistency: 0, equal_effort: 0 },
              namesAnonymized: data.names_anonymized ?? [],
            });
          }

        } catch (e) {
          console.error("Quality scoring error:", e); 
          setStatus("Analysis Failed");
          setTimeout(() => {
            setStatus(null);
            setIsProcessing(false);
          }, 3000);
          return;
        }
        
        // ── Show success ONLY after scores are set in UI ──
        setStatus("Analyzed Successfully!");
        setTimeout(() => {
          setStatus(null);
          setIsProcessing(false);
        }, 3000);
      };

  // ── Fetch quality scores (manual refresh) ──
    const fetchQualityScores = async () => {
        setScoresLoading(true);
        try {
          const res = await fetch("https://charming-flexibility-production.up.railway.app/get-quality-scores?t=" + Date.now());
          if (res.ok) {
            const data = await res.json();
            if (data.empathy > 0 || data.compliance > 0 || data.resolution > 0) {
            setScores({
              empathy:    data.empathy    ?? 0,
              compliance: data.compliance ?? 0,
              resolution: data.resolution ?? 0,
              reasoning:  data.reasoning  ?? "",
              efficiency_score: data.efficiency_score ?? 0, 
              total_messages: data.total_messages ?? 0,
              bias_reduction_applied: data.bias_reduction_applied ?? false,
              names_anonymized:       data.names_anonymized       ?? [], 
              fairness_scores:        data.fairness_scores        ?? {name_neutrality: 0, language_neutrality:0,tone_consistency: 0,equal_effort: 0},
            });
            setAnalysisData({
              empathy:             data.empathy             ?? 0,
              compliance:          data.compliance          ?? 0,
              resolution:          data.resolution          ?? 0,
              reasoning:           data.reasoning           ?? "",
              efficiency_score:    data.efficiency_score  ?? 0,
              total_messages:      data.total_messages      ?? 0, 
              bias_reduction_applied: data.bias_reduction_applied ?? false,
              names_anonymized:       data.names_anonymized       ?? [],
              fairness_scores:        data.fairness_scores        ?? { name_neutrality: 0, language_neutrality: 0, tone_consistency: 0, equal_effort: 0 },
              empathy_timeline:    Array.isArray(data.empathy_timeline)    ? data.empathy_timeline    : [],
              compliance_steps:    Array.isArray(data.compliance_steps)    ? data.compliance_steps    : [],
              resolution_progress: Array.isArray(data.resolution_progress) ? data.resolution_progress : [],
          });
          }
        }
      } catch (e) { console.error("Quality scores error:", e); }
      finally { setScoresLoading(false); }
    };

  // ── Upload handler ──
  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.type.startsWith("audio/")) { setAudioURL(URL.createObjectURL(file)); setIsAudioFile(true); }
    else { setAudioURL(null); setIsAudioFile(false); }
    setIsProcessing(true);
    setStatus("Processing...");
    
    const formData = new FormData();
    formData.append("file", file);
    try {
      const endpoint = file.type.startsWith("audio/") ? "https://auraq-ai-customer-quality-auditor-production.up.railway.app/upload" : "https://upbeat-essence-production-929d.up.railway.app/upload-text";
      const res = await fetch(endpoint, { method: "POST", body: formData });
      if (res.ok) {
        setStatus("Analyzing...");
        await fetchHistory();
        onFileUploaded?.();
        await runQualityScoring(file);
        window.dispatchEvent(new CustomEvent("refreshTranscript", {
          detail: file.type.startsWith("audio/") ? "audio" : "text"
        }));
      } else {
        setStatus("Upload Failed");
        setTimeout(() => { setStatus(null); setIsProcessing(false); }, 3000);
      }
    } catch {
      setStatus("Connection Error");
      setTimeout(() => { setStatus(null); setIsProcessing(false); }, 3000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  useEffect(() => {
    fetchHistory();
    fetchTranscript("audio");

    const handleRefresh = (e: any) => fetchTranscript(e.detail || "audio");
    window.addEventListener("refreshTranscript", handleRefresh);


    return () => {
      window.removeEventListener("refreshTranscript", handleRefresh);
    };
  }, []);

  useEffect(() => {
      if (activePage === "reports") {
        // Always load saved scores when opening reports page
        // fetchQualityScores now only reads saved file — never re-analyzes old audio
        fetchQualityScores();
      }
    }, [activePage]);

  const filteredMessages = messages.filter(msg =>
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ════════════════════════════════════════
  //              REPORTS PAGE
  // ════════════════════════════════════════
  if (activePage === "reports") {
    const scoreItems = [
      { label: "Empathy",    val: scores.empathy,    color: "bg-blue-500",    text: "text-blue-400",   icon: <Heart size={36} className="text-blue-500/15" />    },
      { label: "Compliance", val: scores.compliance, color: "bg-indigo-500",  text: "text-indigo-400", icon: <ShieldCheck size={36} className="text-indigo-500/15" /> },
      { label: "Resolution", val: scores.resolution, color: "bg-emerald-500", text: "text-emerald-400",icon: <Target size={36} className="text-emerald-500/15" /> },
    ];

    return (
      <div className="flex-1 bg-[#0b1224] h-screen overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
        <h2 className="font-display text-2xl font-bold text-white mb-1">Quality Reports</h2>
        <p className="text-slate-500 text-sm mb-8">AI-powered call quality scoring — auto-updates after every upload</p>

        

        {/* Quality Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {scoreItems.map((item) => (
            <div key={item.label} className="bg-[#161e31] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">{item.label}</p>
                {scoresLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 size={18} className="text-blue-400 animate-spin" />
                    <span className="text-xs text-slate-500">Analyzing...</span>
                  </div>
                ) : (
                  <>
                    <p className={"text-4xl font-display font-black mb-3 " + item.text}>
                      {item.val}<span className="text-sm text-slate-600">/10</span>
                    </p>
                    <div className="w-full bg-[#0b1224] h-2 rounded-full overflow-hidden">
                      <div className={item.color + " h-full rounded-full transition-all duration-1000"} style={{ width: item.val * 10 + "%" }} />
                    </div>
                  </>
                )}
              </div>
              <div className="ml-4">{item.icon}</div>
            </div>
          ))}
        </div>

        {/* ── ANALYSIS CHARTS ── */}
        {/* Efficiency Card */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#161e31] border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Efficiency Score</p>
            <p className="text-4xl font-display font-black text-yellow-400 mb-3">
              {scores.efficiency_score}<span className="text-sm text-slate-600">/10</span>
            </p>
            <div className="w-full bg-[#0b1224] h-2 rounded-full overflow-hidden">
              <div className="bg-yellow-500 h-full rounded-full transition-all duration-1000" style={{ width: scores.efficiency_score * 10 + "%" }} />
            </div>
            <p className="text-xs text-slate-500 mt-2">Based on conversation length and response speed</p>
          </div>

          <div className="bg-[#161e31] border border-white/5 rounded-2xl p-5">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Total Messages</p>
            <p className="text-4xl font-display font-black text-cyan-400 mb-3">
              {scores.total_messages}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {scores.total_messages <= 6 ? "Short call — very efficient" :
               scores.total_messages <= 12 ? "Medium call — good efficiency" :
               "Long call — may need improvement"}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-bold text-white mb-1">Detailed Quality Audit</h3>
          <p className="text-xs text-slate-500 mb-6">Visual breakdown of Empathy, Compliance and Resolution across the call</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

            {/* Empathy Line Chart */}
            <div className="bg-[#161e31] border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp size={12} className="text-blue-400" /> Empathy Fluctuations
              </p>
              <div className="h-[200px]">
                {analysisData.empathy_timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisData.empathy_timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="stage" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 10]} hide />
                      <Tooltip contentStyle={{ backgroundColor: "#0b1224", border: "1px solid #1e293b", borderRadius: "10px", fontSize: "11px" }} />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3}
                        dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#0b1224" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">No data yet — upload a call</div>
                )}
              </div>
            </div>

            {/* Compliance Bar Chart */}
            <div className="bg-[#161e31] border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={12} className="text-emerald-400" /> Compliance Adherence
              </p>
              <div className="h-[200px]">
                {analysisData.compliance_steps.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisData.compliance_steps}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="step" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 10]} hide />
                      <Tooltip cursor={{ fill: "#1e293b" }} contentStyle={{ backgroundColor: "#0b1224", border: "none", fontSize: "11px" }} />
                      <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={28}>
                        {analysisData.compliance_steps.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.score > 7 ? "#10b981" : "#f59e0b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">No data yet — upload a call</div>
                )}
              </div>
            </div>
          </div>

          {/* Resolution Area Chart — full width */}
          <div className="bg-[#161e31] border border-white/5 rounded-2xl p-5 mb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target size={12} className="text-purple-400" /> Resolution Velocity
            </p>
            <div className="h-[180px]">
              {analysisData.resolution_progress.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysisData.resolution_progress}>
                    <defs>
                      <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="stage" stroke="#475569" fontSize={10} tickLine={false} />
                    <YAxis domain={[0, 10]} hide />
                    <Tooltip contentStyle={{ backgroundColor: "#0b1224", border: "none", fontSize: "11px" }} />
                    <Area type="stepAfter" dataKey="score" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorRes)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">No data yet — upload a call</div>
              )}
            </div>
          </div>
        </div>

        {/* Reasoning + Refresh */}
        {/* ── BIAS REDUCTION SECTION ── */}
        <div className="bg-[#161e31] border border-white/5 rounded-2xl p-6 mb-6">
          
          {/* Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold
              ${scores.bias_reduction_applied 
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                : "bg-slate-500/10 border border-slate-500/20 text-slate-500"}`}>
              🛡️ {scores.bias_reduction_applied ? "Bias Reduction Applied" : "No Analysis Yet"}
            </div>
            
          </div>

          <h3 className="text-sm font-bold text-white mb-1">Fairness Analysis</h3>
          <p className="text-xs text-slate-500 mb-5">How fairly and unbiasedly the agent handled this call</p>

          {/* Fairness Bar Chart */}
          {scores.bias_reduction_applied ? (
            <div className="space-y-4">
              {[
                { label: "Name Neutrality",     val: scores.fairness_scores.name_neutrality,     color: "bg-blue-500",    desc: "Agent treated customer consistently regardless of identity" },
                { label: "Language Neutrality",  val: scores.fairness_scores.language_neutrality, color: "bg-purple-500",  desc: "Agent used clear, simple language without assumptions" },
                { label: "Tone Consistency",     val: scores.fairness_scores.tone_consistency,    color: "bg-emerald-500", desc: "Agent maintained consistent warm professional tone" },
                { label: "Equal Effort",         val: scores.fairness_scores.equal_effort,        color: "bg-yellow-500",  desc: "Agent applied equal effort to resolve the issue" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-xs font-bold text-slate-300">{item.label}</p>
                      <p className="text-[10px] text-slate-600">{item.desc}</p>
                    </div>
                    <span className="text-lg font-display font-black text-white ml-4">
                      {item.val}<span className="text-xs text-slate-600">/10</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#0b1224] h-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full transition-all duration-1000`} 
                      style={{ width: `${item.val * 10}%` }} />
                  </div>
                </div>
              ))}

              {/* Overall Fairness Score */}
              <div className="mt-4 p-4 bg-[#0b1224] rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400">Overall Fairness Score</p>
                  <p className="text-2xl font-display font-black text-emerald-400">
                    {Math.round((
                      scores.fairness_scores.name_neutrality +
                      scores.fairness_scores.language_neutrality +
                      scores.fairness_scores.tone_consistency +
                      scores.fairness_scores.equal_effort
                    ) / 4 * 10) / 10}
                    <span className="text-xs text-slate-600">/10</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-slate-700">
              <p className="text-xs italic">Upload a call to see fairness analysis</p>
            </div>
          )}
        </div>
        <div className="bg-[#161e31] border border-white/5 rounded-2xl p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 opacity-5">
            <Info size={70} />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Quality Analysis</h3>
              <p className="text-xs text-slate-500 mt-0.5">Scores auto-update when you upload a file on Home page</p>
            </div>
            <button
              onClick={fetchQualityScores}
              disabled={scoresLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
            >
              {scoresLoading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
              {scoresLoading ? "Analyzing..." : "Refresh Scores"}
            </button>
          </div>
          <div className="bg-[#0b1224] rounded-xl p-4 border border-white/5">
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-1">
              <Info size={10} /> AI Auditor Reasoning
            </p>
            <p className="text-xs text-slate-400 italic leading-relaxed">
              {scoresLoading
                ? "Analyzing call quality..."
                : scores.reasoning || "Upload a file on the Home page to auto-generate scores."}
            </p>
          </div>
        </div>
        
      </div>
    );
  }

// ════════════════════════════════════════
  //               CALLS PAGE
  // ════════════════════════════════════════
  if (activePage === "calls") {

    const clearHistory = async () => {
      try {
        await Promise.all([
          fetch("https://auraq-ai-customer-quality-auditor-production.up.railway.app/clear-history", { method: "POST" }).catch(() => null),
          fetch("https://upbeat-essence-production-929d.up.railway.app/clear-history", { method: "POST" }).catch(() => null),
        ]);
        setHistory([]);
        // Tell Dashboard to clear download modal list
        window.dispatchEvent(new CustomEvent("historycleared"));
      } catch { console.error("Clear history failed"); }
    };
    return (
      <div className="flex-1 bg-[#0b1224] h-screen overflow-y-auto p-8">

        {/* Header + Clear Button */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Call History</h2>
            <p className="text-slate-500 text-sm mt-1">All uploaded and analyzed calls</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20
                border border-red-500/20 hover:border-red-500/40 text-red-400
                text-xs font-bold rounded-xl transition-all"
            >
              🗑️ Clear History
            </button>
          )}
        </div>

        <div className="space-y-3 mt-8">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <Phone size={40} className="mb-4 opacity-30" />
              <p className="text-sm italic">No calls yet</p>
            </div>
          ) : history.map((item, i) => {
            const isText = item.file_name?.endsWith(".txt") || item.file_name?.endsWith(".csv");
            return (
              <div key={i} className="bg-[#161e31] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  {isText ? <FileText size={18} className="text-blue-400" /> : <FileAudio size={18} className="text-blue-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{item.file_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.timestamp}</p>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 size={14} /> Ready
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  // ════════════════════════════════════════
  //               HOME PAGE
  // ════════════════════════════════════════
  return (
    <div className="flex-1 bg-[#0b1224] h-screen overflow-y-auto relative">
      {status && (
        <div className="fixed top-8 right-8 z-50">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            status.includes("Successfully")
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          }`}>
            {status.includes("Successfully") ? <CheckCircle size={20} /> : <Loader2 size={20} className="animate-spin" />}
            <span className="font-bold text-sm">{status}</span>
          </div>
        </div>
      )}

      <div className="p-4 md:p-8 space-y-6 pb-20 md:pb-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Home Page</h2>
          <p className="text-blue-300/60 text-sm mt-1">Upload, transcribe and analyze customer calls</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-[#2c364c] border border-white/5 rounded-2xl p-5 shadow-lg transition-all hover:bg-[#343e57]">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${s.dotColor}`} />
                <p className="text-blue-200/50 text-xs uppercase tracking-widest font-semibold">{s.label}</p>
              </div>
              <p className="text-3xl font-display font-black text-white">{s.value}</p>
              <p className="text-blue-300/40 text-xs mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Upload Zone */}
        <div
          className={`upload-zone rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center gap-4 cursor-pointer
            bg-[#2c364c] border-2 border-dashed transition-all shadow-xl relative overflow-hidden
            ${isDragging ? "border-blue-400 bg-[#343e57]" : "border-white/10 hover:border-blue-400/50 hover:bg-[#343e57]"}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          {isProcessing && !status?.includes("Successfully") && (
            <div className="absolute inset-0 bg-[#2c364c]/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader2 size={32} className="text-blue-400 animate-spin mb-2" />
              <p className="text-blue-400 font-bold text-sm uppercase tracking-widest">Processing...</p>
            </div>
          )}
          <input
            id="file-input" type="file" className="hidden" accept="audio/*, .txt, .csv"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file); e.target.value = ""; }}
          />
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-600 shadow-lg shadow-blue-500/20 mb-2">
            <Upload size={28} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base md:text-lg">Upload Your Call</p>
            <p className="text-blue-300/40 font-medium text-xs mt-1 uppercase tracking-wider">
              Drag and drop or click to browse • .m4a .mp3 .wav .txt .csv
            </p>
          </div>
        </div>

        {/* Audio Player */}
        {isAudioFile && audioURL && (
          <div className="bg-[#2c364c] border border-white/5 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Audio Playback</p>
            </div>
            <audio controls src={audioURL} className="w-full rounded-xl" style={{ accentColor: "#3b82f6", colorScheme: "dark" }} />
          </div>
        )}

        {/* Live Transcript */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Mic size={16} className="text-blue-600" />
            <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">Live Transcript</h3>
          </div>
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text" placeholder="Search transcript..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm text-slate-700
                focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-blue-600">
                <Loader2 className="animate-spin mb-3" size={28} />
                <p className="text-sm font-bold">Analyzing audio streams...</p>
              </div>
            ) : filteredMessages.length > 0 ? (
              filteredMessages.map((msg, i) => {
                const isAgent = msg.speaker.includes("00") || msg.speaker.toLowerCase().includes("agent");
                return (
                  <div key={i} className={`flex ${isAgent ? "justify-start" : "justify-end"}`}>
                    <div className="max-w-[80%]">
                      <div className={`flex items-center gap-2 mb-1.5 ${isAgent ? "flex-row" : "flex-row-reverse"}`}>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isAgent ? "text-blue-600" : "text-slate-400"}`}>
                          {isAgent ? "Agent" : "Customer"}
                        </span>
                        <span className="text-[10px] text-slate-300 font-medium">{msg.time}</span>
                      </div>
                      <div className={`rounded-2xl px-5 py-3.5 text-sm shadow-sm leading-relaxed
                        ${isAgent ? "bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-none" : "bg-blue-600 text-white rounded-tr-none"}`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <Mic size={40} className="mb-4 text-slate-200" />
                <p className="text-sm font-bold text-slate-400">Upload a call to begin transcript</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CenterPanel;