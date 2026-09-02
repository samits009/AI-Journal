import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

let projectId = 'favorable-tree-318603';
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.projectId) {
      projectId = config.projectId;
    }
  }
} catch (e) {
  console.warn('Could not read firebase config', e);
}

// Allow explicit override if specified in environment
if (process.env.FIREBASE_PROJECT_ID) {
  projectId = process.env.FIREBASE_PROJECT_ID;
}

// Initialize Firebase Admin (uses application default credentials)
admin.initializeApp({
  projectId,
});

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

app.use(express.json());

// Serve dynamic Firebase client config from environment variables
app.get('/api/firebase-config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  const clientConfig = {
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId: projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '411316001592',
    appId: process.env.FIREBASE_APP_ID || '1:411316001592:web:dd36be004a25cd74cfbfcd',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-Z9MT7N9SX8',
  };
  res.send(`window.__FIREBASE_CONFIG__ = ${JSON.stringify(clientConfig)};`);
});

// API route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize Gemini
let ai: GoogleGenAI | null = null;
function getGenAI() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

// Ensure the token is valid
async function verifyUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }
  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    res.status(401).json({ error: 'Unauthorized: Token is empty' });
    return;
  }
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    res.status(401).json({ error: 'Unauthorized: Token verification failed' });
  }
}

// Chat API route
app.post('/api/chat', verifyUser, async (req, res) => {
  try {
    const aiClient = getGenAI();
    const { history, prompt } = req.body;
    
    // Validate request
    if (!prompt) {
       res.status(400).json({ error: 'Missing prompt' });
       return;
    }

    let rawContents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role && msg.content) {
          rawContents.push({ role: msg.role === 'user' ? 'user' : 'model', text: msg.content });
        }
      }
    }
    rawContents.push({ role: 'user', text: prompt });

    // Combine consecutive turns of the same role
    const contents: any[] = [];
    for (const msg of rawContents) {
      if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
        contents[contents.length - 1].parts[0].text += '\n\n' + msg.text;
      } else {
        contents.push({ role: msg.role, parts: [{ text: msg.text }] });
      }
    }

    const systemInstruction = 'You are a compassionate, thoughtful journaling assistant. Your role is to help the user reflect, summarize their entries, and brainstorm ideas based on their journal entries. Keep your tone supportive, concise, and insightful. The user may write single or multi-turn entries.';

    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-pro',
      'gemini-3.7-flash',
      'gemini-flash-latest',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite'
    ];

    let response;
    let lastError;

    for (const model of models) {
      try {
        response = await aiClient.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          }
        });
        break; // Success, exit loop
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, falling back... Error: ${err.message}`);
        const status = err.status || err.response?.status;
        const msg = err.message || '';
        
        // Only break on definitive API key errors
        if (msg.includes('API key') || status === 401 || status === 403) {
          break;
        }
      }
    }

    if (!response) {
      throw lastError || new Error('All models failed to generate a response');
    }

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
});

// Error handler for API routes to always return JSON (e.g. for body-parser errors)
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Bad Request', details: err.message });
    return;
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Catch-all for API routes to prevent falling through to SPA/Vite
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, closing server gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
