import React, { useState } from 'react';
import { Play, Loader2, Volume2 } from 'lucide-react';

export default function VoiceLab() {
  const [text, setText] = useState("Hi there, I'm Robert. I'm looking forward to helping you grow your business.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePlay = async () => {
    if (!text.trim() || loading) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned an invalid response. This might be due to a server restart or timeout.`);
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      const binary = atob(data.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      // TTS model returns PCM 24000Hz 16-bit
      const audioCtx = new AudioContext({ sampleRate: 24000 });
      const int16Array = new Int16Array(bytes.buffer);
      const audioBuffer = audioCtx.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768;
      }
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate speech');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 relative z-10">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Volume2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-light tracking-tight text-white">Voice Lab</h2>
          <p className="text-slate-400">Test Robert's text-to-speech engine.</p>
        </div>
        
        <div className="glass-card p-6 shadow-xl">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Text to speak
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all resize-none mb-4"
            placeholder="Enter some text..."
          />
          
          {error && <div className="text-rose-400 text-sm mb-4">{error}</div>}
          
          <button
            onClick={handlePlay}
            disabled={!text.trim() || loading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-50 border border-sky-500/30 text-sky-400 rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(56,189,248,0.1)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {loading ? 'Synthesizing...' : 'Play Audio'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
