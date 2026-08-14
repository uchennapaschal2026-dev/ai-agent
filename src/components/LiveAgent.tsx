import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Activity, Loader2 } from 'lucide-react';
import { pcmToBase64, playAudioChunk } from '../utils';

export default function LiveAgent() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const startCall = async () => {
    try {
      setConnecting(true);
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputAudioCtx;
      
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN && !muted) {
          const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        nextStartTimeRef.current = outputAudioCtx.currentTime;
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.audio) {
          playAudioChunk(outputAudioCtx, msg.audio, nextStartTimeRef);
        }
        if (msg.interrupted) {
          nextStartTimeRef.current = outputAudioCtx.currentTime;
        }
      };

      ws.onclose = () => {
        stopCall();
      };
      
      ws.onerror = () => {
        stopCall();
      };
      
    } catch (err) {
      console.error("Error starting call:", err);
      stopCall();
    }
  };

  const stopCall = () => {
    setConnecting(false);
    setConnected(false);
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
  };
  
  useEffect(() => {
    return () => {
      stopCall();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
      
      <div className="max-w-xl w-full flex flex-col items-center z-10 relative">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-light tracking-tight text-white mb-2">Speak with Robert</h2>
          <p className="text-slate-400">Real-time AI voice assistant for your business.</p>
        </div>

        <div className="relative flex justify-center items-center w-64 h-64">
          {/* Animated rings for active state */}
          {connected && !muted && (
             <div className="absolute inset-0 rounded-full border-2 border-sky-500 animate-ping opacity-20"></div>
          )}
          {connected && (
             <div className="absolute inset-4 rounded-full border border-sky-400 animate-pulse opacity-40"></div>
          )}
          
          <div className={`relative z-10 w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_30px_rgba(56,189,248,0.2)] ${
            connected 
              ? 'bg-slate-900 border border-sky-500/50' 
              : 'glass-card border border-slate-700/50'
          }`}>
            {connected ? (
               <div className="flex items-end h-12 gap-1 animate-pulse">
                 <div className="waveform-bar h-4"></div>
                 <div className="waveform-bar h-8"></div>
                 <div className="waveform-bar h-12"></div>
                 <div className="waveform-bar h-6"></div>
                 <div className="waveform-bar h-10"></div>
               </div>
            ) : (
               <Phone className="w-12 h-12 text-slate-400" />
            )}
          </div>
        </div>

        <div className="mt-16 flex items-center gap-6">
          {connected ? (
            <>
              <button
                onClick={() => setMuted(!muted)}
                className={`p-4 rounded-full transition-colors border ${
                  muted ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'glass-card text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              
              <button
                onClick={stopCall}
                className="flex items-center gap-2 px-8 py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-full font-medium transition-colors shadow-[0_0_15px_rgba(244,63,94,0.1)]"
              >
                <PhoneOff className="w-5 h-5" />
                End Call
              </button>
            </>
          ) : (
            <button
              onClick={startCall}
              disabled={connecting}
              className="flex items-center gap-2 px-10 py-4 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 disabled:opacity-50 text-sky-400 rounded-full font-medium transition-colors shadow-[0_0_15px_rgba(56,189,248,0.1)]"
            >
              {connecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Phone className="w-5 h-5" />
              )}
              {connecting ? 'Connecting...' : 'Start Conversation'}
            </button>
          )}
        </div>
      </div>
      
    </div>
  );
}
