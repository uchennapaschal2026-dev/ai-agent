import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import { GoogleGenAI, LiveServerMessage, Modality, GenerateVideosOperation } from '@google/genai';
import http from 'http';
import multer from 'multer';

// Multer for handling file uploads (in memory)
const upload = multer({ storage: multer.memoryStorage() });

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const SYSTEM_INSTRUCTION = `You are Robert, an intelligent, professional, natural-sounding AI voice agent representing Robert AI Solutions.

Your primary purpose is to answer customer questions, provide information, qualify leads, schedule appointments, capture customer details, provide customer support, and connect customers with a human representative when necessary.

You communicate like a highly capable human professional. You are friendly, confident, patient, efficient, and conversational.

Never describe yourself as a robot. Do not sound scripted, repetitive, robotic, or overly formal.

Language Capabilities: You are fully fluent in English, Nigerian Pidgin English, Igbo, Yoruba, and Hausa. Always seamlessly adapt to the caller's language. If they speak Pidgin, reply in Pidgin. If they speak Igbo, reply in Igbo, etc. You can also switch languages instantly if requested.

Business name: Robert AI Solutions
Business type: AI Automation, Voice AI, Website Development, and Digital Technology Services
Location: Nigeria
Business hours: Monday–Saturday, 8:00 AM–6:00 PM
Website: https://example.com
Phone: +234 000 000 0000
Email: support@example.com
Services/products: AI voice agents, AI customer support, business automation, professional websites, chatbot development, digital marketing solutions, appointment systems, CRM automation, and technology consulting.
Pricing information: Pricing depends on the customer's requirements. Do not invent prices. Collect the customer's needs and refer them to the appropriate sales representative for an accurate quotation.
Policies: Provide accurate information only. Do not promise refunds, discounts, delivery dates, appointments, or services unless confirmed by the appropriate business system or authorized representative.

Keep responses concise and natural. If you need to check something or book an appointment, just say you will capture their details.
Never invent information.
`;

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  // Use HTTP server to attach both Express and WebSocket
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/live' });

  app.use(express.json());

  // Chat API
  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, useThinking, useSearch } = req.body;
      
      const modelName = useThinking ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
      
      const config: any = {
        systemInstruction: SYSTEM_INSTRUCTION,
      };

      if (useThinking) {
        config.thinkingConfig = { thinkingLevel: 'HIGH' };
      }

      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      // Convert messages to contents array
      const contents = messages.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config
      });

      res.json({ text: response.text });
    } catch (err: any) {
      if (!err.message?.includes('429') && !err.message?.includes('RESOURCE_EXHAUSTED')) {
        console.error('Chat error:', err);
      }
      res.status(500).json({ error: err.message });
    }
  });

  // TTS API
  app.post('/api/tts', async (req, res) => {
    try {
      const { text } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        res.json({ audio: base64Audio });
      } else {
        throw new Error('No audio generated');
      }
    } catch (err: any) {
      if (!err.message?.includes('429') && !err.message?.includes('RESOURCE_EXHAUSTED')) {
        console.error('TTS error:', err);
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Video Generation APIs
  app.post('/api/generate-video', upload.single('image'), async (req, res) => {
    try {
      const { prompt } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Image file is required' });
      }

      const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'A beautiful animation',
        image: {
          imageBytes: file.buffer.toString('base64'),
          mimeType: file.mimetype,
        },
        config: {
          numberOfVideos: 1,
          resolution: '1080p',
          aspectRatio: '16:9'
        }
      });
      
      res.json({ operationName: operation.name });
    } catch (err: any) {
      let errorMessage = err.message || 'Unknown error occurred';
      if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = 'Your Gemini API key has exceeded its quota or rate limit. Please check your billing details at Google AI Studio.';
      } else {
        console.error('Generate video error:', err);
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post('/api/video-status', async (req, res) => {
    try {
      const { operationName } = req.body;
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ done: updated.done });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/video-download', async (req, res) => {
    try {
      const { operationName } = req.body;
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      
      if (!updated.done) {
        return res.status(400).json({ error: 'Video is not done yet' });
      }

      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) {
        throw new Error('Video URI not found');
      }

      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY as string },
      });

      res.setHeader('Content-Type', 'video/mp4');
      if (videoRes.body) {
        const reader = videoRes.body.getReader();
        const stream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        };
        stream();
      } else {
        res.end();
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Live WebSocket
  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const { audio } = JSON.parse(data.toString());
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Live message error:", e);
        }
      });

      clientWs.on("close", () => {
        // cleanup session if possible, handled automatically mostly
      });
    } catch (e) {
      console.error("Error setting up Live session:", e);
      clientWs.close();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
