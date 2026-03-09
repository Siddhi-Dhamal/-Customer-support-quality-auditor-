import { Home, Phone, BarChart2,Download } from 'lucide-react';
import type { NavPage } from './Dashboard';

interface IconNavProps {
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  onDownloadClick: () => void;
}

const navItems = [
  { id: 'home',    icon: Home,     label: 'Home'    },
  { id: 'calls',   icon: Phone,    label: 'Calls'   },
  { id: 'reports', icon: BarChart2, label: 'Reports' },
] as const;

function AuraQIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="36" height="36">
      <defs>
        <radialGradient id="og" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#60a5fa" stop-opacity="1"/>
          <stop offset="50%"  stop-color="#3b82f6" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.4"/>
        </radialGradient>
        <radialGradient id="sg" cx="35%" cy="30%" r="55%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#3b82f6"  stop-opacity="0"/>
        </radialGradient>
        <filter id="gf" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="oc"><circle cx="22" cy="22" r="18"/></clipPath>
      </defs>

      {/* Outer pulse ring */}
      <circle cx="22" cy="22" r="21" fill="none" stroke="#3b82f6" stroke-width="0.8" opacity="0.25">
        <animate attributeName="r"       values="21;22.5;21"     dur="3s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.25;0.06;0.25" dur="3s" repeatCount="indefinite"/>
      </circle>

      {/* Main orb */}
      <circle cx="22" cy="22" r="18" fill="url(#og)" filter="url(#gf)">
        <animate attributeName="r" values="18;18.8;18" dur="4s" repeatCount="indefinite"/>
      </circle>

      {/* Shine */}
      <circle cx="22" cy="22" r="18" fill="url(#sg)" clip-path="url(#oc)"/>

      {/* Waves — same as hero, scaled to fit small orb */}
      <g clip-path="url(#oc)">
        {/* Main center wave — thick white */}
        <path d="M 6 22 Q 9 17 12 22 Q 15 27 18 22 Q 21 17 24 22 Q 27 27 30 22 Q 33 17 36 20"
              fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity="0.95"
              stroke-dasharray="90" stroke-dashoffset="90">
          <animate attributeName="stroke-dashoffset" from="90" to="0" dur="0.9s" begin="0.3s" fill="freeze"/>
          <animate attributeName="opacity" values="0.95;0.55;0.95" dur="2.5s" begin="1.3s" repeatCount="indefinite"/>
        </path>
        {/* Below wave — light blue */}
        <path d="M 8 27 Q 11 23 14 27 Q 17 31 20 27 Q 23 23 26 27 Q 29 31 32 27"
              fill="none" stroke="#93c5fd" stroke-width="1.4" stroke-linecap="round" opacity="0.65"
              stroke-dasharray="70" stroke-dashoffset="70">
          <animate attributeName="stroke-dashoffset" from="70" to="0" dur="0.9s" begin="0.5s" fill="freeze"/>
          <animate attributeName="opacity" values="0.65;0.25;0.65" dur="2.5s" begin="1.6s" repeatCount="indefinite"/>
        </path>
        {/* Top wave — pale */}
        <path d="M 9 17 Q 12 13 15 17 Q 18 21 21 17 Q 24 13 27 17 Q 30 21 33 17"
              fill="none" stroke="#bfdbfe" stroke-width="1" stroke-linecap="round" opacity="0.4"
              stroke-dasharray="60" stroke-dashoffset="60">
          <animate attributeName="stroke-dashoffset" from="60" to="0" dur="0.9s" begin="0.7s" fill="freeze"/>
        </path>
      </g>

      {/* Rim */}
      <circle cx="22" cy="22" r="18" fill="none" stroke="#93c5fd" stroke-width="0.8" opacity="0.35"/>
      {/* Shine dot */}
      <circle cx="15" cy="15" r="3" fill="white" opacity="0.2"/>
    </svg>
  );
}

function IconNav({ activePage, setActivePage, onDownloadClick }: IconNavProps) {
  return (
    <div className="w-44 bg-[#0b1224] border-r border-white/5 hidden md:flex flex-col items-center py-6 gap-2 h-screen z-10">

      {/* AuraQ Logo */}
      <div className="mb-6 flex items-center gap-3 px-3 w-full">
        <AuraQIcon />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white tracking-wide">AuraQ</span>
          <span className="text-[9px] text-blue-400/60 tracking-widest">AI Auditor</span>
        </div>
      </div>

      {/* Nav Icons */}
            <div className="flex flex-row md:flex-col gap-1 flex-1 w-full px-3">
              {navItems.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActivePage(id as NavPage)}
                  className={`w-full h-11 rounded-xl flex items-center gap-3 px-3 transition-all duration-200
                    ${activePage === id
                      ? 'bg-blue-600/20 text-blue-400 shadow-[inset_2px_0_0_#2563eb]'
                      : 'text-slate-500 hover:text-blue-400 hover:bg-blue-600/10'
                    }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>
    
      
    {/* Download Button above Q badge */}
      <div className="w-full px-3 mb-2">
        <button
          onClick={onDownloadClick}
          className="w-full h-11 rounded-xl flex items-center gap-3 px-3 transition-all duration-200
            text-slate-500 hover:text-blue-400 hover:bg-blue-600/10"
        >
          <Download size={20} />
          <span className="text-sm font-semibold">Downloads</span>
        </button>
      </div>

      {/* Bottom Q badge */}
      <div className="w-8 h-px bg-blue-500/20 mb-2" />
      <div className="w-8 h-8 rounded-full bg-[#1e293b] border border-white/10 flex items-center justify-center">
        <span className="text-blue-400 font-bold text-xs font-display">Q</span>
      </div>
    {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0b1224] border-t border-white/10 flex md:hidden z-50">
        <button
          onClick={() => setActivePage('home')}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1
            ${activePage === 'home' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <span className="text-lg">🏠</span>
          Home
        </button>
        <button
          onClick={() => setActivePage('calls')}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1
            ${activePage === 'calls' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <span className="text-lg">📞</span>
          Calls
        </button>
        <button
          onClick={() => setActivePage('reports')}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1
            ${activePage === 'reports' ? 'text-blue-400' : 'text-slate-500'}`}
        >
          <span className="text-lg">📊</span>
          Reports
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 flex flex-col items-center py-3 text-xs gap-1 text-slate-500"
        >
          <span className="text-lg">⬇️</span>
          Downloads
        </button>
      </div>
    </div>
  );
}

export default Dashboard;