import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles, Search, Download } from 'lucide-react';

type Message = {
  role: 'user' | 'model';
  content: string;
};

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "Hi! Thanks for reaching out to Robert AI Solutions. I'm Robert. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMsg }
    ];
    
    setMessages(newMessages);
    setLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          useThinking,
          useSearch
        })
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned an invalid response. This might be due to a server restart or timeout.`);
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setMessages(prev => [...prev, { role: 'model', content: data.text }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I encountered an error processing your request." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportTranscript = () => {
    const transcript = messages.map(m => `${m.role === 'user' ? 'User' : 'Robert'}:\n${m.content}`).join('\n\n----------------------------------------\n\n');
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Robert_Transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col z-10 relative">
      {/* Header controls */}
      <div className="px-6 py-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
        <div>
          <h2 className="font-semibold text-white">Chat with Robert</h2>
          <p className="text-xs text-slate-400">Text-based assistance</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleExportTranscript}
            disabled={messages.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700/50"
            title="Export Transcript"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <div className="w-px h-4 bg-slate-700/50 mx-1"></div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useThinking} 
              onChange={e => setUseThinking(e.target.checked)} 
              className="rounded bg-slate-800 border-slate-600 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
            />
            <Sparkles className="w-4 h-4 text-indigo-400" />
            High Thinking
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input 
              type="checkbox" 
              checked={useSearch} 
              onChange={e => setUseSearch(e.target.checked)} 
              className="rounded bg-slate-800 border-slate-600 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900"
            />
            <Search className="w-4 h-4 text-emerald-400" />
            Web Search
          </label>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-slate-800 text-slate-400' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`px-5 py-3.5 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-sky-600 text-white rounded-tr-sm shadow-[0_0_15px_rgba(2,132,199,0.2)]' 
                : 'glass-card text-slate-200 rounded-tl-sm'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4 max-w-3xl">
            <div className="w-8 h-8 shrink-0 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="px-5 py-4 glass-card rounded-2xl rounded-tl-sm flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-sm text-slate-400">Robert is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-slate-800/50 bg-slate-900/40 backdrop-blur-md">
        <div className="max-w-4xl mx-auto relative flex items-end gap-2 glass-card p-2 focus-within:border-sky-500/50 focus-within:shadow-[0_0_15px_rgba(56,189,248,0.1)] transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 bg-transparent border-none resize-none max-h-32 min-h-[44px] py-2.5 px-3 focus:ring-0 text-white placeholder-slate-500 text-[15px] outline-none"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-3 bg-sky-500 text-white rounded-xl hover:bg-sky-400 disabled:opacity-50 disabled:hover:bg-sky-500 transition-colors shadow-[0_0_10px_rgba(56,189,248,0.3)]"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center mt-2 text-xs text-slate-500">
          Press Enter to send, Shift + Enter for new line.
        </div>
      </div>
    </div>
  );
}
