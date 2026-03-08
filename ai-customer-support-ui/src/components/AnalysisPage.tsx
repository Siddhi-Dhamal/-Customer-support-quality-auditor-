import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  ShieldCheck, 
  Target, 
  Info, 
  TrendingUp, 
  FileText,
  Activity
} from 'lucide-react';
import { 
  LineChart, Line, 
  BarChart, Bar, 
  AreaChart, Area, 
  XAxis, YAxis, 
  CartesianGrid, Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';

const AnalysisPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    empathy_timeline: [],
    compliance_steps: [],
    resolution_progress: [],
    reasoning: "",
    empathy: 0,
    compliance: 0,
    resolution: 0
  });

  const fetchDetailedScores = async () => {
    try {
      const res = await fetch(`https://caring-bravery-production.up.railway.app/get-quality-scores?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Error fetching detailed analysis:", err);
    }
  };

  useEffect(() => {
    fetchDetailedScores();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 font-sans">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10 border-b border-slate-800 pb-6">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-all bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Dashboard
        </button>
        <div className="text-right">
          <h1 className="text-2xl font-bold tracking-tight text-white">Detailed Quality Audit</h1>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest">Powered by Llama 3.3 70B</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Overall Empathy</p>
              <p className="text-3xl font-black text-blue-400">{data.empathy}<span className="text-sm text-slate-600">/10</span></p>
            </div>
            <Heart className="text-blue-500/20" size={48} />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Compliance</p>
              <p className="text-3xl font-black text-emerald-400">{data.compliance}<span className="text-sm text-slate-600">/10</span></p>
            </div>
            <ShieldCheck className="text-emerald-500/20" size={48} />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase mb-1">Final Resolution</p>
              <p className="text-3xl font-black text-purple-400">{data.resolution}<span className="text-sm text-slate-600">/10</span></p>
            </div>
            <Target className="text-purple-500/20" size={48} />
          </div>
        </div>

        {/* Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. EMPATHY: LINE CHART */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-400" /> Empathy Fluctuations
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.empathy_timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="stage" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 10]} hide />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px'}} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#0f172a' }} 
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. COMPLIANCE: BAR CHART */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" /> Compliance Adherence
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.compliance_steps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="step" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 10]} hide />
                  <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
                  <Bar dataKey="score" radius={[10, 10, 0, 0]} barSize={40}>
                    {data.compliance_steps.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 7 ? '#10b981' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. RESOLUTION: AREA CHART */}
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-400 mb-8 uppercase tracking-widest flex items-center gap-2">
              <Target size={16} className="text-purple-400" /> Resolution Velocity
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.resolution_progress}>
                  <defs>
                    <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="stage" stroke="#475569" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 10]} hide />
                  <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none'}} />
                  <Area 
                    type="stepAfter" 
                    dataKey="score" 
                    stroke="#a855f7" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorRes)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Reasoning and Findings */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <FileText size={120} />
          </div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Info size={16} /> Auditor's Comprehensive Reasoning
          </h3>
          <p className="text-xl text-slate-200 leading-relaxed font-light italic max-w-4xl relative z-10">
            "{data.reasoning || "Awaiting final analysis from the scoring engine..."}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;