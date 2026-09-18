# Windows Setup Guide for Meta Voice Server

This guide covers setting up the Meta Voice Server on Windows for development and testing.

## ⚠️ Important Windows Compatibility Note

**Seamless Communication has known compatibility issues on native Windows** due to `fairseq2n` dependency conflicts. For the best experience, we recommend:

1. **WSL2 (Windows Subsystem for Linux)** - Recommended for Windows users
2. **Linux GPU server** - For production deployment
3. **Native Windows** - Possible but may require troubleshooting

This guide covers both WSL2 (recommended) and native Windows setups.

## Prerequisites

### Hardware
- **GPU**: NVIDIA GPU with 12GB+ VRAM (for SeamlessM4T v2 large model)
- **RAM**: 16GB+ system memory
- **Storage**: 50GB+ free space

### Software
- **Windows 10/11** with WSL2 support
- **Python 3.9+** (download from https://python.org)
- **NVIDIA Drivers** (latest from https://www.nvidia.com/Download/index.aspx)
- **CUDA Toolkit 11.8+** (optional, for GPU acceleration)
- **Git** (from https://git-scm.com/download/win)

## Step 1: Install Python

1. Download Python 3.9+ from https://python.org
2. Run installer and **check "Add Python to PATH"**
3. Verify installation:
```powershell
python --version
pip --version
```

## Step 2: Choose Installation Method

### Option A: WSL2 (Recommended for Windows)

WSL2 provides a Linux environment on Windows with better compatibility for AI/ML tools.

#### Install WSL2
```powershell
# Enable WSL
wsl --install

# Reboot when prompted
```

#### Install NVIDIA WSL Drivers
1. Download from: https://developer.nvidia.com/cuda/wsl
2. Install the WSL-specific NVIDIA drivers

#### Verify GPU in WSL
```powershell
wsl
nvidia-smi
```

#### Set Up Voice Server in WSL
```bash
# Navigate to project directory (adjust path as needed)
cd /mnt/c/Users/junju/OneDrive/Desktop/SulTi-AI/SultiAI/voice-server

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install git+https://github.com/facebookresearch/seamless_communication.git

# Configure environment
cp .env.example .env
nano .env  # Edit settings

# Start server
python main.py
```

### Option B: Native Windows (May Have Compatibility Issues)

Native Windows installation may work but can encounter dependency conflicts with `fairseq2n`.

#### Install NVIDIA Drivers and CUDA

### Install NVIDIA Drivers
1. Download latest drivers from https://www.nvidia.com/Download/index.aspx
2. Install and reboot
3. Verify:
```powershell
nvidia-smi
```

#### Install CUDA Toolkit (Optional but Recommended)
1. Download CUDA 11.8 or 12.x from https://developer.nvidia.com/cuda-downloads
2. Install with default settings
3. Add CUDA to PATH if not automatic:
   - System Properties → Environment Variables
   - Add to PATH: `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin`

## Step 3: Set Up Voice Server (Windows Native)

### Navigate to Voice Server Directory
```powershell
cd C:\Users\junju\OneDrive\Desktop\SulTi-AI\SultiAI\voice-server
```

### Create Virtual Environment
```powershell
python -m venv venv
```

### Activate Virtual Environment
```powershell
.\venv\Scripts\activate
```

### Upgrade pip
```powershell
python -m pip install --upgrade pip
```

### Install Base Dependencies
```powershell
pip install -r requirements.txt
```

### Try Installing Seamless Communication (May Fail on Windows)
```powershell
pip install git+https://github.com/facebookresearch/seamless_communication.git
```

**If this fails** (likely due to `fairseq2n` conflicts):
- The server will run in "demo mode" without AI capabilities
- All endpoints will return 503 errors
- Consider using WSL2 or a Linux GPU server instead

### Configure Environment
```powershell
copy .env.example .env
notepad .env
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

*If you don't have CUDA or want to use CPU:*
```env
SEAMLESS_DEVICE=cpu
SEAMLESS_MODEL=seamlessM4T_v2_small
```

## Step 4: Test the Server

### Start the Server
```powershell
python main.py
```

The server will start even if Seamless Communication is not installed, but in demo mode.

### Test Health Endpoint
Open new PowerShell window:
```powershell
curl http://localhost:8000/health
```

Expected response (if Seamless Communication installed):
```json
{
  "status": "healthy",
  "seamless_loaded": true,
  "seamless_available": true,
  "spiritlm_enabled": false,
  "device": "cuda",
  "demo_mode": false
}
```

Expected response (if Seamless Communication NOT installed):
```json
{
  "status": "healthy",
  "seamless_loaded": false,
  "seamless_available": false,
  "spiritlm_enabled": false,
  "device": "none",
  "demo_mode": true
}
```

## Step 3: Set Up Voice Server

### Navigate to Voice Server Directory
```powershell
cd C:\Users\junju\OneDrive\Desktop\SulTi-AI\SultiAI\voice-server
```

### Create Virtual Environment
```powershell
python -m venv venv
```

### Activate Virtual Environment
```powershell
.\venv\Scripts\activate
```

You should see `(venv)` in your prompt.

### Upgrade pip
```powershell
python -m pip install --upgrade pip
```

### Install Dependencies
```powershell
pip install -r requirements.txt
```

### Install Seamless Communication from GitHub
```powershell
pip install git+https://github.com/facebookresearch/seamless_communication.git
```

*Note: This may take 10-30 minutes as it downloads models and dependencies.*

### Configure Environment
```powershell
copy .env.example .env
notepad .env
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

*If you don't have CUDA or want to use CPU:*
```env
SEAMLESS_DEVICE=cpu
SEAMLESS_MODEL=seamlessM4T_v2_small
```

## Step 4: Test the Server

### Start the Server
```powershell
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Test Health Endpoint
Open new PowerShell window:
```powershell
curl http://localhost:8000/health
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

## Step 5: Configure Main Server

Edit your main server `.env` file:
```env
META_VOICE_URL=http://localhost:8000
META_VOICE_TIMEOUT=30000
```

**Note**: If running in demo mode, the main server will fall back to traditional TTS/STT methods.

## Troubleshooting Windows Compatibility Issues

### Seamless Communication Installation Fails
**Symptom**: `ERROR: Cannot install seamless-communication because these package versions have conflicting dependencies. fairseq2n`

**Solutions**:
1. **Use WSL2** (recommended) - See Option A above
2. **Use Linux GPU server** for production
3. **Run in demo mode** - Server will start but AI features won't work
4. **Wait for Windows compatibility fixes** from Meta

### Python Not in PATH

Edit your main server `.env` file:
```env
META_VOICE_URL=http://localhost:8000
META_VOICE_TIMEOUT=30000
```

## Troubleshooting

### Python Not in PATH
If `python` command doesn't work:
1. Reinstall Python with "Add to PATH" checked
2. Or manually add to PATH:
   - System Properties → Environment Variables
   - Add Python path (e.g., `C:\Python39\` and `C:\Python39\Scripts\`)

### CUDA Not Found
If you get CUDA errors:
1. Verify NVIDIA drivers: `nvidia-smi`
2. Install CUDA Toolkit from NVIDIA website
3. Check CUDA is in PATH: `echo %PATH%`
4. Use CPU mode: Set `SEAMLESS_DEVICE=cpu` in `.env`

### Git Not Installed
If git commands fail:
1. Install Git from https://git-scm.com/download/win
2. Restart PowerShell after installation

### Seamless Communication Installation Fails
If `pip install git+https://github.com/facebookresearch/seamless_communication.git` fails:
1. Install Git first
2. Try with explicit git executable:
```powershell
pip install git+https://github.com/facebookresearch/seamless_communication.git --git="C:\Program Files\Git\bin\git.exe"
```

### Virtual Environment Issues
If activation fails:
```powershell
# Delete and recreate
Remove-Item -Recurse -Force venv
python -m venv venv
.\venv\Scripts\activate
```

### Port Already in Use
If port 8000 is busy:
1. Change port in `.env`: `PORT=8001`
2. Or find and kill process using port 8000:
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Out of Memory
If you get CUDA out of memory:
1. Use smaller model: `SEAMLESS_MODEL=seamlessM4T_v2_small`
2. Use CPU: `SEAMLESS_DEVICE=cpu`
3. Close other GPU-intensive applications

### Firewall Blocking Connection
If main server can't connect:
1. Allow Python through Windows Firewall
2. Or temporarily disable firewall for testing
3. Use `localhost` instead of `0.0.0.0` in `.env`

## Performance Tips

### GPU Performance
- Use RTX 30-series or 40-series GPU for best performance
- Close other GPU applications (games, browsers with GPU acceleration)
- Use NVIDIA Studio drivers for AI workloads

### CPU Performance
- If using CPU, expect 5-10x slower performance
- Use `seamlessM4T_v2_small` model
- Close other CPU-intensive applications

### Model Caching
Models are cached in `C:\Users\<username>\.cache\huggingface\`
- First run is slow (downloads models)
- Subsequent runs are much faster
- Don't delete cache folder unless reinstalling

## Running as Background Service

### Using PowerShell (No Close)
```powershell
Start-Process python -ArgumentList "main.py" -WindowStyle Hidden
```

### Using Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: "At startup" or "At log on"
4. Action: Start program
   - Program: `python`
   - Arguments: `main.py`
   - Start in: `C:\Users\junju\OneDrive\Desktop\SulTi-AI\SultiAI\voice-server`

### Using NSSM (Non-Sucking Service Manager)
1. Download NSSM from https://nssm.cc/download
2. Install as service:
```powershell
nssm install SultiVoiceServer
nssm set SultiVoiceServer Application C:\Users\junju\OneDrive\Desktop\SulTi-AI\SultiAI\voice-server\venv\Scripts\python.exe
nssm set SultiVoiceServer AppParameters C:\Users\junju\OneDrive\Desktop\SulTi-AI\SultiAI\voice-server\main.py
nssm set SultiVoiceServer AppDirectory C:\Users\junju\OneDrive\Desktop\SulTi-AI\SultiAI\voice-server
nssm start SultiVoiceServer
```

## Development Tips

### Hot Reload (Development)
Install uvicorn with reload:
```powershell
pip install uvicorn[standard]
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### API Documentation
When server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Logging
Logs are printed to console. To save to file:
```powershell
python main.py > server.log 2>&1
```

## Next Steps

1. Test with main server application
2. Verify voice-to-voice translation works
3. Check performance with your GPU
4. Deploy to dedicated GPU server for production

## Support

For Windows-specific issues:
- Check Python installation: `python --version`
- Check GPU: `nvidia-smi`
- Check CUDA: `nvcc --version`
- Check pip: `pip --version`
- Check git: `git --version`

For general issues, see main README.md and DEPLOYMENT.md.
