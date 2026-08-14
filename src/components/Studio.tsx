import React, { useState, useRef, useEffect } from 'react';
import { Upload, Film, Loader2, PlayCircle, AlertCircle } from 'lucide-react';

export default function Studio() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('A professional cinematic shot, smooth motion');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [previewUrl, videoUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setVideoUrl(null);
      setError('');
    }
  };

  const handleGenerate = async () => {
    if (!file) return;
    
    setLoading(true);
    setError('');
    setVideoUrl(null);
    setStatus('Uploading image and initializing generation...');
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('prompt', prompt);
      
      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        body: formData,
      });
      
      let startData;
      const contentType = startRes.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        startData = await startRes.json();
      } else {
        const text = await startRes.text();
        throw new Error(`Server returned an invalid response (${startRes.status}): ${text.slice(0, 50)}...`);
      }
      
      if (startData.error) throw new Error(startData.error);
      
      const opName = startData.operationName;
      setStatus('Generating video (this may take a few minutes)...');
      
      // Poll
      let done = false;
      while (!done) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10s
        
        const pollRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName: opName }),
        });
        
        const contentType = pollRes.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned an invalid response during polling.');
        }
        
        const pollData = await pollRes.json();
        if (pollData.error) throw new Error(pollData.error);
        
        done = pollData.done;
      }
      
      setStatus('Downloading video...');
      
      // Download
      const dlRes = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: opName }),
      });
      
      if (!dlRes.ok) {
        let msg = 'Failed to download video';
        const ct = dlRes.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const dlData = await dlRes.json();
          msg = dlData.error || msg;
        } else {
          msg += ` (${dlRes.status})`;
        }
        throw new Error(msg);
      }
      
      const blob = await dlRes.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus('');
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during generation');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 relative z-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="text-center space-y-3 mb-10">
          <div className="w-16 h-16 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Film className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-light tracking-tight text-white">Robert's Studio</h2>
          <p className="text-slate-400">Transform still images into dynamic AI videos.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-6">
            <div className="glass-card p-6 shadow-xl">
              <h3 className="font-semibold text-white mb-4">Input Setup</h3>
              
              <div 
                onClick={() => !loading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  previewUrl ? 'border-sky-500/50 bg-sky-500/10' : 'border-slate-700/50 hover:border-sky-400/50 hover:bg-slate-800/50 bg-slate-900/50'
                } ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg object-contain" />
                ) : (
                  <div className="text-center">
                    <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-300">Click to upload image</p>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Motion Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none resize-none"
                />
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={!file || loading}
                className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-50 border border-sky-500/30 text-sky-400 rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(56,189,248,0.1)]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                {loading ? 'Processing...' : 'Generate Video'}
              </button>
            </div>
          </div>
          
          <div className="glass-card p-6 shadow-xl flex flex-col bg-slate-900/80">
            <h3 className="font-semibold text-white mb-4">Output</h3>
            
            <div className="flex-1 bg-black/50 rounded-2xl overflow-hidden flex items-center justify-center min-h-[300px] border border-slate-700/50">
              {videoUrl ? (
                <video src={videoUrl} controls autoPlay loop className="w-full h-full object-contain" />
              ) : loading ? (
                <div className="text-center p-6 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-sky-500 mx-auto" />
                  <p className="text-sm font-medium text-sky-400">{status}</p>
                </div>
              ) : error ? (
                <div className="text-center p-6 space-y-3">
                  <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                  <p className="text-sm text-rose-400">{error}</p>
                </div>
              ) : (
                <div className="text-slate-600 text-sm flex flex-col items-center gap-2">
                  <Film className="w-8 h-8 opacity-50" />
                  <p>Your video will appear here</p>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
