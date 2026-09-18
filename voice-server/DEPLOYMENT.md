# GPU Server Deployment Guide for Meta Voice Server

This guide covers deploying the Meta Voice Server (SeamlessM4T v2 + Spirit LM) on a separate GPU server for production use.

## Prerequisites

### Hardware Requirements
- **GPU**: NVIDIA GPU with 12GB+ VRAM (for SeamlessM4T v2 large model)
  - RTX 3060 (12GB) - minimum
  - RTX 3080/3090 (10GB/24GB) - recommended
  - RTX 4070/4080/4090 (12GB/16GB/24GB) - optimal
- **RAM**: 16GB+ system memory
- **Storage**: 50GB+ free space for models
- **Network**: Stable internet connection for model downloads

### Software Requirements
- **OS**: Ubuntu 20.04+ or Windows 10/11 with WSL2
- **CUDA**: 11.8+ or 12.x
- **Python**: 3.9+
- **Docker** (optional, for containerized deployment)

## Step 1: Set Up the GPU Server

### Option A: Ubuntu/Linux (Recommended)

1. **Install NVIDIA Drivers**
```bash
sudo apt update
sudo apt install nvidia-driver-535
sudo reboot
```

2. **Install CUDA Toolkit**
```bash
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update
sudo apt-get install cuda-12-1
```

3. **Verify GPU Installation**
```bash
nvidia-smi
```

### Option B: Windows with WSL2

1. **Install WSL2**
```powershell
wsl --install
```

2. **Install NVIDIA WSL Drivers**
   - Download from: https://developer.nvidia.com/cuda/wsl

3. **Verify GPU in WSL**
```bash
nvidia-smi
```

## Step 2: Install Python Environment

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip
```

## Step 3: Deploy Voice Server

### Option A: Direct Deployment

1. **Copy voice-server directory to GPU server**
```bash
scp -r voice-server/ user@gpu-server:/opt/sulti-voice-server/
```

2. **Install dependencies**
```bash
cd /opt/sulti-voice-server
pip install -r requirements.txt
```

3. **Install Seamless Communication from GitHub** (required - no PyPI package)
```bash
pip install git+https://github.com/facebookresearch/seamless_communication.git
```

3. **Configure environment**
```bash
cp .env.example .env
nano .env
```

Edit `.env`:
```env
HOST=0.0.0.0
PORT=8000
SEAMLESS_MODEL=seamlessM4T_v2_large
SEAMLESS_DEVICE=cuda
SPIRITLM_ENABLED=false
SAMPLE_RATE=16000
```

4. **Test the server**
```bash
python main.py
```

The server will download models on first run (this may take 10-30 minutes).

### Option B: Docker Deployment (Recommended)

1. **Create Dockerfile**
```dockerfile
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. **Build and run**
```bash
docker build -t sulti-voice-server .
docker run --gpus all -p 8000:8000 --env-file .env sulti-voice-server
```

## Step 4: Configure Main Server

1. **Edit main server `.env`**
```env
META_VOICE_URL=http://your-gpu-server-ip:8000
META_VOICE_TIMEOUT=30000
```

2. **Test connection**
```bash
curl http://your-gpu-server-ip:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "seamless_loaded": true,
  "spiritlm_enabled": false,
  "device": "cuda"
}
```

## Step 5: Set Up Process Management

### Using systemd (Linux)

1. **Create service file**
```bash
sudo nano /etc/systemd/system/sulti-voice.service
```

```ini
[Unit]
Description=Sulti Voice Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/opt/sulti-voice-server
Environment="PATH=/opt/sulti-voice-server/venv/bin"
ExecStart=/opt/sulti-voice-server/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. **Enable and start service**
```bash
sudo systemctl daemon-reload
sudo systemctl enable sulti-voice
sudo systemctl start sulti-voice
sudo systemctl status sulti-voice
```

### Using PM2 (Cross-platform)

```bash
npm install -g pm2
pm2 start main.py --name sulti-voice --interpreter python3
pm2 save
pm2 startup
```

## Step 6: Network Configuration

### Firewall Setup

```bash
# Allow port 8000
sudo ufw allow 8000/tcp
sudo ufw reload
```

### Reverse Proxy (Optional, with Nginx)

```nginx
server {
    listen 80;
    server_name voice.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for large audio files
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
```

## Step 7: Monitoring and Logging

### Basic Monitoring

```bash
# Check logs
journalctl -u sulti-voice -f

# Check GPU usage
nvidia-smi -l 1
```

### Health Check Endpoint

Set up a cron job to monitor health:
```bash
*/5 * * * * curl -f http://localhost:8000/health || echo "Voice server down" | mail -s "Alert" admin@example.com
```

## Step 8: Performance Optimization

### Model Selection

Based on your GPU VRAM:

- **12GB VRAM**: Use `seamlessM4T_v2_large`
- **8GB VRAM**: Use `seamlessM4T_v2_medium`
- **4GB VRAM**: Use `seamlessM4T_v2_small`

Edit `.env`:
```env
SEAMLESS_MODEL=seamlessM4T_v2_medium
```

### Batch Processing

For high-volume deployments, consider:
- Multiple worker processes with Gunicorn
- Load balancing with nginx
- Model caching to reduce cold starts

### Example with Gunicorn

```bash
pip install gunicorn
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Step 9: Security Considerations

1. **API Authentication** (future enhancement)
   - Add JWT authentication to voice server
   - Whitelist main server IP

2. **Rate Limiting**
   - Implement rate limiting per user
   - Monitor for abuse

3. **SSL/TLS**
   - Use HTTPS in production
   - Configure SSL certificates

## Troubleshooting

### Model Download Issues
```bash
# Clear HuggingFace cache
rm -rf ~/.cache/huggingface

# Set HF mirror if needed
export HF_ENDPOINT=https://hf-mirror.com
```

### CUDA Out of Memory
```bash
# Reduce model size
SEAMLESS_MODEL=seamlessM4T_v2_small

# Or use CPU (slower)
SEAMLESS_DEVICE=cpu
```

### Connection Issues
```bash
# Test network connectivity
telnet gpu-server-ip 8000

# Check firewall
sudo ufw status
```

## Cost Considerations

### Cloud GPU Options

- **AWS**: g4dn.xlarge (NVIDIA T4) - ~$0.50/hour
- **Google Cloud**: n1-standard-4 with T4 GPU - ~$0.50/hour
- **Azure**: Standard_NC4as_T4_v3 - ~$0.50/hour
- **RunPod**: RTX 3090 - ~$0.40/hour
- **Lambda Labs**: RTX 3090 - ~$0.50/hour

### Self-Hosted vs Cloud

**Self-Hosted**: 
- One-time hardware cost ($500-2000)
- No ongoing costs
- Full control

**Cloud**:
- Pay-as-you-go
- Scalable
- No maintenance

## Testing

1. **Test health endpoint**
```bash
curl http://your-server:8000/health
```

2. **Test speech-to-text**
```bash
curl -X POST http://your-server:8000/speech-to-text \
  -H "Content-Type: application/json" \
  -d '{"audio_base64":"...","source_lang":"auto"}'
```

3. **Test from main server**
```bash
curl http://localhost:3001/api/voice/status
```

## Scaling

For multiple users:

1. **Horizontal Scaling**: Deploy multiple voice server instances behind a load balancer
2. **Vertical Scaling**: Upgrade GPU to handle more concurrent requests
3. **Queue System**: Implement task queue (Celery + Redis) for batch processing

## Future: Spirit LM Integration

When Spirit LM is integrated:

1. Update requirements.txt to include Spirit LM dependencies
2. Set `SPIRITLM_ENABLED=true` in `.env`
3. Configure `SPIRITLM_MODEL` path
4. Restart server

This will enable expressive TTS with emotion preservation.

## Support

For issues:
- Check logs: `journalctl -u sulti-voice -f`
- Verify GPU: `nvidia-smi`
- Test endpoint: `curl http://localhost:8000/health`
- Check network: `telnet server-ip 8000`
