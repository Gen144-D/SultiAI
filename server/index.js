const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

const history = [];

app.get('/', (req, res) => {
  res.json({
    service: 'SultiAI Node Server',
    version: '2.0.0',
    endpoints: ['/api/stt', '/api/tts', '/api/suggest', '/api/history', '/api/full-pipeline'],
  });
});

app.post('/api/stt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${AI_SERVICE_URL}/stt`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    fs.unlinkSync(req.file.path);

    history.push({
      id: history.length + 1,
      type: 'stt',
      timestamp: new Date().toISOString(),
      transcript: response.data.text,
      language: response.data.language,
    });

    res.json(response.data);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('STT Error:', error.message);
    res.status(500).json({ error: error.message, detail: error.response?.data });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await axios.post(
      `${AI_SERVICE_URL}/tts`,
      null,
      {
        params: { text, lang: lang || 'bisaya' },
        timeout: 15000,
      }
    );

    if (response.data.audio_path && fs.existsSync(response.data.audio_path)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="response.mp3"');
      const audioStream = fs.createReadStream(response.data.audio_path);
      audioStream.pipe(res);
      audioStream.on('end', () => {
        fs.unlink(response.data.audio_path, () => {});
      });
    } else {
      res.json(response.data);
    }

    history.push({
      id: history.length + 1,
      type: 'tts',
      timestamp: new Date().toISOString(),
      text,
      language: lang || 'bisaya',
      voice: response.data.voice,
    });
  } catch (error) {
    console.error('TTS Error:', error.message);
    res.status(500).json({ error: error.message, detail: error.response?.data });
  }
});

app.post('/api/suggest', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await axios.post(
      `${AI_SERVICE_URL}/suggest`,
      null,
      {
        params: { text },
        timeout: 15000,
      }
    );

    history.push({
      id: history.length + 1,
      type: 'suggest',
      timestamp: new Date().toISOString(),
      input: text,
      intent: response.data.intent,
      suggestion: response.data.suggestion,
    });

    res.json(response.data);
  } catch (error) {
    console.error('Suggest Error:', error.message);
    res.status(500).json({ error: error.message, detail: error.response?.data });
  }
});

app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const sorted = [...history].reverse().slice(offset, offset + limit);
  res.json({
    total: history.length,
    limit,
    offset,
    items: sorted,
  });
});

app.post('/api/history/clear', (req, res) => {
  const count = history.length;
  history.length = 0;
  res.json({ message: `Cleared ${count} history items` });
});

app.post('/api/full-pipeline', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const targetLang = req.body.target_lang || 'bisaya';

    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(
      `${AI_SERVICE_URL}/full-pipeline`,
      form,
      {
        params: { target_lang: targetLang },
        headers: form.getHeaders(),
        timeout: 60000,
      }
    );

    fs.unlinkSync(req.file.path);

    if (response.data.audio_path && fs.existsSync(response.data.audio_path)) {
      res.json({
        ...response.data,
        audio_path: undefined,
        tts_ready: true,
      });
      fs.unlink(response.data.audio_path, () => {});
    } else {
      res.json(response.data);
    }

    history.push({
      id: history.length + 1,
      type: 'full-pipeline',
      timestamp: new Date().toISOString(),
      transcript: response.data.transcript,
      language: response.data.language,
      intent: response.data.intent,
      suggestion: response.data.suggestion,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Full Pipeline Error:', error.message);
    res.status(500).json({ error: error.message, detail: error.response?.data });
  }
});

app.listen(PORT, () => {
  console.log(`SultiAI Node Server running on http://localhost:${PORT}`);
  console.log(`AI Service: ${AI_SERVICE_URL}`);
  console.log(`Endpoints:`);
  console.log(`  POST /api/stt           - Speech-to-Text`);
  console.log(`  POST /api/tts           - Text-to-Speech`);
  console.log(`  POST /api/suggest       - Intent + Suggestions`);
  console.log(`  GET  /api/history       - Conversation History`);
  console.log(`  POST /api/full-pipeline - STT + Intent + TTS`);
});

module.exports = app;