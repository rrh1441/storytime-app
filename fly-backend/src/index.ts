import express from 'express';
import cors from 'cors';
import { VOICES, generateSpeech } from './services/tts.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all routes
app.use(cors({
  origin: ['https://storytime-app.fly.dev', 'https://yourstorytime.vercel.app', 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Story generation endpoint - MATCHED TO FRONTEND
app.post('/generate-story', async (req, res) => {
  try {
    console.log('Story generation request received:', req.body);
    // Your story generation logic here
    // This is a placeholder that matches the expected response format
    res.json({
      story: "Once upon a time in a magical forest, there lived a little fox named Ruby. Ruby had bright orange fur and a bushy tail that she was very proud of. Every day, she would explore the forest, making friends with all the creatures she met along the way.",
      title: req.body.storyTitle || "The Adventures of Ruby Fox"
    });
  } catch (error) {
    console.error('Story generation error:', error);
    res.status(500).json({ error: 'Failed to generate story' });
  }
});

// TTS endpoint - MATCHED TO FRONTEND
app.post('/tts', async (req, res) => {
  try {
    const { text, voice, language = "English" } = req.body;
    
    if (!text || !voice) {
      return res.status(400).json({ error: 'Text and voice are required' });
    }
    
    if (!VOICES.includes(voice)) {
      return res.status(400).json({ error: 'Invalid voice' });
    }
    
    const audioDataUrl = await generateSpeech(text, voice, language);
    // Note: The frontend expects audioUrl, not audio
    res.json({ audioUrl: audioDataUrl });
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});