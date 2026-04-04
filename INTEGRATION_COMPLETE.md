# Integration Complete ✅

Your LibreLudo frontend and game logic have been integrated with your existing FastAPI backend for Oracle deployment.

## 🎯 What Was Done

### 1. **Updated Deployment Script** (`deploy/deploy.sh`)
   - ✅ Added Node.js 18+ LTS installation via NodeSource
   - ✅ Added `npm ci` to install frontend dependencies
   - ✅ Added `npm run build` to build the frontend
   - ✅ Copies LibreLudo instead of old frontend to `/opt/twin-roll/`

### 2. **Updated Nginx Configuration** (`deploy/nginx.conf`)
   - ✅ Root location `/` now serves from `/libre_ludo/dist/` (built frontend)
   - ✅ SPA fallback configured (`try_files $uri $uri/ /index.html`)
   - ✅ WebSocket proxying to FastAPI preserved
   - ✅ API routes to FastAPI configured

### 3. **Updated Backend** (`backend/main.py`)
   - ✅ Configured to serve from `libre_ludo/dist/` directory
   - ✅ Fallback to old `frontend/` for backwards compatibility
   - ✅ All WebSocket routes remain intact

### 4. **Created Documentation**
   - ✅ [INTEGRATION_SETUP.md](INTEGRATION_SETUP.md) - Complete setup and deployment guide
   - ✅ [verify-integration.sh](verify-integration.sh) - Pre-deployment verification script

## 📊 Architecture Summary
```
Client Browser
      ↓ 
  Nginx (Port 80/443)
      ↓─────────────────────────────┐
      │                             │
  LibreLudo Dist            FastAPI Backend
  (React/Vite)              (:8000)
      │                       │
      │                     WebSocket
      │                     API Routes
      │                   Game Logic
      │
  Service Worker
  (PWA)
```

## 🚀 Next Steps

### Step 1: Test Locally (Recommended First)

**Terminal 1 - Frontend:**
```bash
cd libre_ludo
npm install          # Install once
npm run dev          # Start dev server on port 5173
```

**Terminal 2 - Backend:**
```bash
source venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Access: http://localhost:5173

### Step 2: Build Frontend Locally
```bash
cd libre_ludo
npm run build        # Creates dist/ folder
```

### Step 3: Deploy to Oracle Ubuntu VM

From your local machine:
```bash
# 1. Copy project to Ubuntu VM
scp -r -i your-key.pem . ubuntu@YOUR_ORACLE_IP:~/ludo/

# 2. Run deployment script
ssh -i your-key.pem ubuntu@YOUR_ORACLE_IP "cd ~/ludo && bash deploy/deploy.sh"

# 3. Access your app
open http://YOUR_ORACLE_IP
```

Or if code is already in a git repo on the server:
```bash
ssh -i your-key.pem ubuntu@YOUR_ORACLE_IP << 'EOF'
cd ~/ludo
git pull  # Get latest code
bash deploy/deploy.sh
EOF
```

## 📦 Installation Requirements on Server

The deployment script automatically installs:
- **System packages**: python3, pip, nginx, certbot
- **Runtime**: Node.js 18 LTS, npm
- **Python packages**: FastAPI, Uvicorn, WebSockets (from requirements.txt)

**Total time**: ~5-10 minutes depending on internet speed

## 🎮 Game Variant Development

Once deployed, you can iterate on game variants by:

1. **Modify game logic**:
   ```bash
   # Edit libre_ludo/src/game/ files
   vim libre_ludo/src/game/players/logic.ts
   vim libre_ludo/src/game/tokens/logic.ts
   ```

2. **Modify UI/Components**:
   ```bash
   # Edit libre_ludo/src/components/ or pages/
   vim libre_ludo/src/components/Board.tsx
   ```

3. **Test locally**:
   ```bash
   npm run dev  # Hot reload in browser
   ```

4. **Deploy changes**:
   ```bash
   # Option A: Full redeploy
   bash deploy/deploy.sh
   
   # Option B: Rebuild frontend only
   cd libre_ludo && npm run build
   # SSH to server and restart nginx
   ssh ubuntu@IP "sudo systemctl restart nginx"
   ```

## 🔐 Security Considerations for Oracle

1. **Firewall**: The deploy script opens ports 80/443 locally, but you MUST also:
   - Add Ingress rules in **Oracle Cloud Console** → Your Instance → Security List
   - Allow TCP ports 80 and 443

2. **SSL/HTTPS**: After initial setup:
   ```bash
   ssh ubuntu@IP "sudo certbot --nginx -d yourdomain.com"
   ```

3. **Backend Security**:
   - Remove `allow_origins=["*"]` in `backend/main.py` if in production
   - Add specific domain CORS rules instead

## ✅ Verification

Run this before deploying to catch any issues:
```bash
bash verify-integration.sh
```

## 📚 File Structure After Deployment

On Oracle server (`/opt/twin-roll/`):
```
/opt/twin-roll/
├── backend/              # FastAPI backend
│   ├── main.py
│   ├── routes.py
│   ├── websocket.py
│   ├── models.py
│   ├── logic.py
│   ├── config.py
│   └── requirements.txt
├── libre_ludo/           # Frontend source + built dist
│   ├── src/
│   ├── dist/             # ← Nginx serves this
│   ├── package.json
│   └── vite.config.ts
├── pom.properties
├── venv/                 # Python virtual environment
└── systemd service points to: venv/bin/uvicorn backend.main:app
```

## 🐛 Troubleshooting Quick Ref

| Problem | Solution |
|---------|----------|
| Frontend not loading | `ls /opt/twin-roll/libre_ludo/dist/` - check if built |
| WebSocket fails | Check `journalctl -u twin-roll -f` for backend errors |
| Port already in use | `sudo lsof -i :8000` or `:80` |
| CSS/JS not loading | Clear browser cache or check nginx error logs |
| SSL certificate issues | Run `sudo certbot --nginx` again |

## 📞 Support Resources

- **Nginx Configuration**: `/etc/nginx/sites-available/twin-roll`
- **Backend Logs**: `journalctl -u twin-roll -f`
- **Nginx Access Logs**: `/var/log/nginx/access.log`
- **Nginx Error Logs**: `/var/log/nginx/error.log`
- **Backend Service**: `systemctl status|restart|stop twin-roll`

---

**Configuration Date**: April 2026  
**Status**: Ready for Deployment  
**Next Action**: Test locally → Deploy to Oracle → Add SSL → Launch!

Good luck! 🚀
