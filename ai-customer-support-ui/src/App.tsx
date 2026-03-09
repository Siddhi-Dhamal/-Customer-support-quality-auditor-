import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';

// ── Inline Landing Page as React component ──
function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#040b18', color: '#f0f6ff', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>

      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes pulse    { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes growBar  { from { width:0%; } }
        @keyframes ringPulse{ 0%,100% { r:21; opacity:0.2; } 50% { r:23; opacity:0.05; } }
        @keyframes orbBreath{ 0%,100% { r:38; } 50% { r:39.5; } }
        @keyframes waveFade { 0%,100% { opacity:0.95; } 50% { opacity:0.5; } }

        .hero-logo   { animation: float 6s ease-in-out infinite; }
        .hero-badge  { opacity:0; animation: fadeUp 0.6s 0.3s forwards; }
        .hero-title  { opacity:0; animation: fadeUp 0.7s 0.5s forwards; }
        .hero-sub    { opacity:0; animation: fadeUp 0.7s 0.7s forwards; }
        .hero-btns   { opacity:0; animation: fadeUp 0.7s 0.9s forwards; }

        .btn-primary {
          padding: 14px 36px; background: #3b82f6; color: white;
          border: none; border-radius: 12px; font-size: 15px;
          font-weight: 600; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 0 30px rgba(59,130,246,0.35);
          font-family: 'DM Sans', sans-serif;
        }
        .btn-primary:hover { background:#2563eb; transform:translateY(-2px); box-shadow:0 8px 40px rgba(59,130,246,0.5); }

        .btn-secondary {
          padding: 14px 36px; background: transparent;
          color: #60a5fa; border: 1px solid rgba(96,165,250,0.25);
          border-radius: 12px; font-size: 15px; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-secondary:hover { background:rgba(59,130,246,0.07); border-color:rgba(96,165,250,0.5); }

        .feature-card {
          background: #0d1628; border: 1px solid rgba(59,130,246,0.1);
          border-radius: 20px; padding: 32px; transition: all 0.3s;
        }
        .feature-card:hover { border-color:rgba(59,130,246,0.3); transform:translateY(-4px); box-shadow:0 20px 60px rgba(0,0,0,0.4); }

        .score-bar { height:8px; border-radius:100px; animation: growBar 1.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        .step-item { background:#0d1628; padding:40px 32px; position:relative; overflow:hidden; transition:background 0.3s; }
        .step-item:hover { background:rgba(59,130,246,0.04); }

        .stat-item { flex:1; text-align:center; padding:32px 24px; border:1px solid rgba(59,130,246,0.1); background:#0d1628; transition:all 0.3s; }
        .stat-item:hover { border-color:rgba(59,130,246,0.3); background:rgba(59,130,246,0.05); }
      `}</style>

      {/* Background mesh */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.07) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(29,78,216,0.05) 0%, transparent 60%)' }}/>
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)',
        backgroundSize:'60px 60px' }}/>

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, display:'flex', alignItems:'center',
        justifyContent:'space-between', padding:'12px 16px',
        background:'rgba(4,11,24,0.8)', backdropFilter:'blur(16px)',
        borderBottom:'1px solid rgba(59,130,246,0.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Inline orb */}
          <svg width="32" height="32" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="no2" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#60a5fa"/><stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.5"/>
              </radialGradient>
              <filter id="nf2"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              <clipPath id="nc2"><circle cx="22" cy="22" r="18"/></clipPath>
            </defs>
            <circle cx="22" cy="22" r="21" fill="none" stroke="#3b82f6" stroke-width="0.8" opacity="0.2">
              <animate attributeName="r" values="21;22.5;21" dur="3s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.2;0.05;0.2" dur="3s" repeatCount="indefinite"/>
            </circle>
            <circle cx="22" cy="22" r="18" fill="url(#no2)" filter="url(#nf2)"/>
            <g clip-path="url(#nc2)">
              <path d="M 6 22 Q 9 15 12 22 Q 15 29 18 22 Q 21 15 24 22 Q 27 29 30 22 Q 33 15 36 18"
                    fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.95"
                    stroke-dasharray="90" stroke-dashoffset="90">
                <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.8s" begin="0.3s" fill="freeze"/>
                <animate attributeName="opacity" values="0.95;0.55;0.95" dur="2s" begin="1.2s" repeatCount="indefinite"/>
              </path>
              <path d="M 8 27 Q 11 23 14 27 Q 17 31 20 27 Q 23 23 26 27 Q 29 31 32 27"
                    fill="none" stroke="#93c5fd" stroke-width="1.3" stroke-linecap="round" opacity="0.55"
                    stroke-dasharray="60" stroke-dashoffset="60">
                <animate attributeName="stroke-dashoffset" from="60" to="0" dur="0.8s" begin="0.5s" fill="freeze"/>
              </path>
            </g>
            <circle cx="22" cy="22" r="18" fill="none" stroke="#93c5fd" stroke-width="0.8" opacity="0.3"/>
          </svg>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900,
            background:'linear-gradient(135deg,#e0f2fe,#fff,#bfdbfe)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Aura</span>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:900,
            background:'linear-gradient(135deg,#60a5fa,#3b82f6)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Q</span>
        </div>
        <div style={{ display:'flex', gap:16 }}>
          {['Features','How it works'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g,'-')}`}
              style={{ color:'#64748b', fontSize:11, fontWeight:500, textDecoration:'none', transition:'color 0.2s', whiteSpace:'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.color='#60a5fa')}
              onMouseLeave={e => (e.currentTarget.style.color='#64748b')}>{l}</a>
          ))}
        </div>
        <button className="btn-primary" style={{ padding:'8px 14px', fontSize:11 }}
          onClick={() => navigate('/dashboard')}>
          Get Started
        </button>
      </nav>

      {/* HERO */}
      <div style={{ position:'relative', zIndex:1, minHeight:'100vh', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        textAlign:'center', padding:'80px 20px 40px' }}>

        <div className="hero-badge" style={{ display:'inline-flex', alignItems:'center', gap:8,
          padding:'6px 16px', background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)',
          borderRadius:100, marginBottom:32, fontFamily:"'DM Mono',monospace", fontSize:11,
          color:'#60a5fa', letterSpacing:2, textTransform:'uppercase' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#3b82f6', display:'inline-block', animation:'pulse 2s infinite' }}/>
          Powered by Llama 3.3 · 70B
        </div>

        {/* Animated SVG Logo */}
        <div className="hero-logo" style={{ width:'min(320px,85vw)', marginBottom:12, filter:'drop-shadow(0 0 40px rgba(59,130,246,0.25))' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="100%" height="auto">
            <defs>
              <radialGradient id="hOrbGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="1"/>
                <stop offset="40%" stopColor="#3b82f6" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.3"/>
              </radialGradient>
              <linearGradient id="hTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e0f2fe"/>
                <stop offset="50%" stopColor="#ffffff"/>
                <stop offset="100%" stopColor="#bfdbfe"/>
              </linearGradient>
              <linearGradient id="hQGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa"/>
                <stop offset="100%" stopColor="#3b82f6"/>
              </linearGradient>
              <radialGradient id="hShine" cx="35%" cy="30%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
              </radialGradient>
              <filter id="hGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="hSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <clipPath id="hOrbClip"><circle cx="0" cy="0" r="38"/></clipPath>
            </defs>
            <rect width="400" height="160" rx="20" fill="transparent"/>
            <g transform="translate(72,80)">
              <animateTransform attributeName="transform" type="scale" values="0;1.15;1" keyTimes="0;0.6;1"
                dur="0.7s" begin="0.2s" fill="freeze" calcMode="spline"
                keySplines="0.34,1.56,0.64,1;0.25,0.46,0.45,0.94"/>
              <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="0.2s" fill="freeze"/>
              <circle cx="0" cy="0" r="56" fill="none" stroke="#3b82f6" stroke-width="0.6" opacity="0.15">
                <animate attributeName="r" values="56;60;56" dur="3s" begin="1s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.15;0.05;0.15" dur="3s" begin="1s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="0" r="48" fill="none" stroke="#60a5fa" stroke-width="0.8" opacity="0.2">
                <animate attributeName="r" values="48;52;48" dur="3s" begin="1.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="0" r="38" fill="url(#hOrbGlow)" filter="url(#hGlow)">
                <animate attributeName="r" values="38;39.5;38" dur="4s" begin="1s" repeatCount="indefinite"/>
              </circle>
              {/* Shine behind waves */}
              <circle cx="-12" cy="-18" r="14" fill="url(#hShine)" opacity="0.5"/>
              <g clip-path="url(#hOrbClip)">
                {/* Main white wave — centered at y=0 inside orb */}
                <path d="M -30 0 Q -22 -12 -15 0 Q -8 12 0 0 Q 8 -12 15 0 Q 22 12 30 0"
                      fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.95"
                      stroke-dasharray="120" stroke-dashoffset="120">
                  <animate attributeName="stroke-dashoffset" from="120" to="0" dur="0.8s" begin="0.3s" fill="freeze"/>
                  <animate attributeName="opacity" values="0.95;0.55;0.95" dur="2s" begin="1.2s" repeatCount="indefinite"/>
                </path>
                {/* Light blue wave — just below center */}
                <path d="M -26 12 Q -19 4 -12 12 Q -5 20 2 12 Q 9 4 16 12 Q 23 20 28 12"
                      fill="none" stroke="#93c5fd" stroke-width="2" stroke-linecap="round" opacity="0.55"
                      stroke-dasharray="100" stroke-dashoffset="100">
                  <animate attributeName="stroke-dashoffset" from="100" to="0" dur="0.8s" begin="0.5s" fill="freeze"/>
                </path>
              </g>
              <circle cx="0" cy="0" r="38" fill="none" stroke="#93c5fd" stroke-width="1" opacity="0.4"/>
              <circle cx="-12" cy="-18" r="5" fill="white" opacity="0.18"/>
            </g>
            <g opacity="0">
              <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="0.5s" fill="freeze"/>
              <animateTransform attributeName="transform" type="translate" from="20 0" to="0 0"
                dur="0.6s" begin="0.5s" fill="freeze" calcMode="spline" keySplines="0.25,0.46,0.45,0.94"/>
              <text x="132" y="96" fontFamily="Georgia,serif" fontSize="52" fontWeight="700"
                letterSpacing="-1" fill="url(#hTextGrad)" filter="url(#hSoftGlow)">Aura</text>
              <text x="267" y="100" fontFamily="Georgia,serif" fontSize="58" fontWeight="900"
                fill="url(#hQGrad)" filter="url(#hGlow)">Q</text>
              <rect x="132" y="108" width="0" height="2.5" rx="2" fill="url(#hQGrad)" opacity="0.6">
                <animate attributeName="width" from="0" to="195" dur="0.6s" begin="0.9s" fill="freeze"/>
              </rect>
              <text x="133" y="128" fontFamily="'Courier New',monospace" fontSize="10"
                letterSpacing="3.5" fill="#475569" opacity="0">
                AI CALL QUALITY AUDITOR
                <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="1.2s" fill="freeze"/>
              </text>
            </g>
          </svg>
        </div>

        <h1 className="hero-title" style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(42px,7vw,80px)',
          fontWeight:900, lineHeight:1.05, letterSpacing:-2, marginBottom:8 }}>
          Read the{' '}
          <span style={{ background:'linear-gradient(135deg,#60a5fa,#3b82f6,#1d4ed8)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Aura</span>
          <br/>of every call.
        </h1>

        <p className="hero-sub" style={{ fontSize:'clamp(15px,2vw,18px)', color:'#64748b',
          maxWidth:520, lineHeight:1.7, marginBottom:28, fontWeight:300 }}>
          AuraQ listens to your customer calls and instantly scores Empathy, Compliance and Resolution
          — giving managers real intelligence, not just transcripts.
        </p>

        <div className="hero-btns" style={{ display:'flex', gap:14, alignItems:'center', flexWrap:'wrap', justifyContent:'center' }}>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Launch AuraQ →
          </button>
          <button className="btn-secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior:'smooth' })}>
            See Features
          </button>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ position:'relative', zIndex:1, display:'grid',
        gridTemplateColumns:'repeat(2,1fr)', justifyContent:'center', padding:'0 20px 60px',
        gap:2 }} className="md:grid-cols-4">
        {[
          { num:'98%', label:'Transcription Accuracy' },
          { num:'10s',  label:'Avg Analysis Time'      },
          { num:'3',   label:'Quality Dimensions'     },
          { num:'3.1-8B-instant', label:'Parameter AI Model'     },
        ].map((s, i) => (
          <div key={i} className="stat-item"
            style={{ borderRadius: i===0?'20px 0 0 20px': i===3?'0 20px 20px 0':'0',
              borderLeft: i>0?'none':undefined }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:38, fontWeight:900,
              background:'linear-gradient(135deg,#e0f2fe,#60a5fa)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', lineHeight:1 }}>{s.num}</div>
            <div style={{ fontSize:11, color:'#64748b', textTransform:'uppercase',
              letterSpacing:1.5, marginTop:6, fontFamily:"'DM Mono',monospace" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section id="features" style={{ position:'relative', zIndex:1, padding:'80px 60px', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#3b82f6',
          letterSpacing:3, textTransform:'uppercase', marginBottom:12,
          display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ width:20, height:1, background:'#3b82f6', display:'inline-block' }}/>
          Features
        </div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(32px,4vw,50px)',
          fontWeight:900, lineHeight:1.1, letterSpacing:-1, marginBottom:16 }}>
          Everything you need<br/>to audit every call.
        </h2>
        <p style={{ fontSize:16, color:'#64748b', maxWidth:500, lineHeight:1.75, fontWeight:300, marginBottom:48 }}>
          From raw audio to actionable quality scores — AuraQ handles the full pipeline automatically.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:20 }}>
          {[
            { icon:'🎙️', title:'Auto Transcription',   desc:'Upload audio and get speaker-separated transcripts powered by Whisper AI in seconds.' },
            { icon:'❤️', title:'Empathy Scoring',       desc:'Detects emotional intelligence across 4 call stages — Opening, Mid-Call, Issue and Closing.' },
            { icon:'🛡️', title:'Compliance Tracking',   desc:'Verifies greeting, verification, process and closing steps against your protocol automatically.' },
            { icon:'🎯', title:'Resolution Analysis',   desc:'Tracks how effectively the agent diagnosed and resolved the customer\'s issue end to end.' },
            { icon:'😊', title:'Emotion Detection',     desc:'Identifies customer emotion — Satisfied, Frustrated, Anxious and more — with confidence scores.' },
            { icon:'📊', title:'Visual Dashboards',     desc:'Beautiful charts showing empathy fluctuations, compliance adherence and resolution velocity.' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(59,130,246,0.1)',
                border:'1px solid rgba(59,130,246,0.2)', display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:22, marginBottom:20 }}>{f.icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700,
                marginBottom:10, letterSpacing:-0.3 }}>{f.title}</div>
              <div style={{ fontSize:14, color:'#64748b', lineHeight:1.7, fontWeight:300 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ position:'relative', zIndex:1, padding:'80px 60px', maxWidth:1200, margin:'0 auto' }}>
        <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:'#3b82f6',
          letterSpacing:3, textTransform:'uppercase', marginBottom:12,
          display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ width:20, height:1, background:'#3b82f6', display:'inline-block' }}/>
          How it works
        </div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(32px,4vw,50px)',
          fontWeight:900, lineHeight:1.1, letterSpacing:-1, marginBottom:48 }}>
          Three steps to<br/>complete call intelligence.
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(1,1fr)', gap:2,
          background:'rgba(59,130,246,0.08)', borderRadius:20, overflow:'hidden' }}
          className="md:grid-cols-3" >
          {[
            { num:'01', icon:'📁', title:'Upload Your Call',   desc:'Drop in any audio file (.mp3, .m4a, .wav) or text transcript (.txt, .csv).' },
            { num:'02', icon:'🧠', title:'AI Analyzes',        desc:'Llama 3.3 70B scores Empathy, Compliance and Resolution with strict criteria.' },
            { num:'03', icon:'📈', title:'See the Insights',   desc:'View charts, emotion detection, satisfaction scores and AI reasoning — all in one place.' },
          ].map((s, i) => (
            <div key={i} className="step-item">
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:64, fontWeight:900,
                color:'rgba(59,130,246,0.08)', lineHeight:1, position:'absolute', top:16, right:20 }}>{s.num}</div>
              <div style={{ fontSize:28 }}>{s.icon}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700,
                margin:'16px 0 10px', letterSpacing:-0.3 }}>{s.title}</div>
              <div style={{ fontSize:13, color:'#64748b', lineHeight:1.7, fontWeight:300 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{ position:'relative', zIndex:1, textAlign:'center', padding:'80px 40px 100px' }}>
        <div style={{ maxWidth:680, margin:'0 auto', background:'#0d1628',
          border:'1px solid rgba(59,130,246,0.15)', borderRadius:32, padding:'64px 60px',
          boxShadow:'0 60px 120px rgba(0,0,0,0.5), 0 0 80px rgba(59,130,246,0.08)' }}>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:'clamp(28px,4vw,44px)',
            fontWeight:900, letterSpacing:-1, marginBottom:16, lineHeight:1.1 }}>
            Start reading the<br/>aura of your calls.
          </h2>
          <p style={{ fontSize:15, color:'#64748b', marginBottom:36, lineHeight:1.7, fontWeight:300 }}>
            Upload your first call today and see what AuraQ reveals about your team's quality.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-primary" style={{ fontSize:15, padding:'16px 40px' }}
              onClick={() => navigate('/dashboard')}>
              Launch AuraQ →
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ position:'relative', zIndex:1, borderTop:'1px solid rgba(59,130,246,0.1)',
        padding:'28px 60px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900,
          background:'linear-gradient(135deg,#e0f2fe,#60a5fa)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>AuraQ</span>
        <span style={{ fontSize:11, color:'#64748b', fontFamily:"'DM Mono',monospace" }}>
          AI CALL QUALITY AUDITOR · POWERED BY LLAMA 3.3 70B
        </span>
        <span style={{ fontSize:11, color:'#64748b', fontFamily:"'DM Mono',monospace" }}>© 2026 AuraQ</span>
      </footer>

    </div>
  );
}

// ── Main App with routing ──
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />}   />
      </Routes>
    </BrowserRouter>
  );
}

export default App;