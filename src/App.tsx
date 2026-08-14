/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bot, Mic, ImagePlay, MessageSquare, AudioLines, Layers } from 'lucide-react';
import LiveAgent from './components/LiveAgent';
import Chatbot from './components/Chatbot';
import VoiceLab from './components/VoiceLab';
import Studio from './components/Studio';

type Tab = 'live' | 'chat' | 'tts' | 'video';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('live');

  return (
    <div className="immersive-bg min-h-screen text-slate-100 font-sans flex flex-col md:flex-row relative">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 glow-orb pointer-events-none z-0"></div>
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 glass-panel text-white flex flex-col z-10 relative">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/50">
          <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-sky-500/20">
            R
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-tight">ROBERT</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">AI Solutions</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <TabButton
            active={activeTab === 'live'}
            onClick={() => setActiveTab('live')}
            icon={<Mic className="w-5 h-5" />}
            label="Live Agent"
          />
          <TabButton
            active={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            icon={<MessageSquare className="w-5 h-5" />}
            label="Text Chat"
          />
          <TabButton
            active={activeTab === 'tts'}
            onClick={() => setActiveTab('tts')}
            icon={<AudioLines className="w-5 h-5" />}
            label="Voice Lab"
          />
          <TabButton
            active={activeTab === 'video'}
            onClick={() => setActiveTab('video')}
            icon={<ImagePlay className="w-5 h-5" />}
            label="Studio"
          />
        </nav>

        <div className="p-4 border-t border-slate-800/50 text-[10px] text-slate-500 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Robert AI Solutions</span>
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500"></div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative">
        {activeTab === 'live' && <LiveAgent />}
        {activeTab === 'chat' && <Chatbot />}
        {activeTab === 'tts' && <VoiceLab />}
        {activeTab === 'video' && <Studio />}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-[0_0_15px_rgba(56,189,248,0.1)]'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
