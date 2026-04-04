# LibreLudo Integration Setup Guide

This document guides you through configuring the integrated LibreLudo frontend and backend for deployment to Oracle.

## 📋 Overview

Your project now integrates:
- **Frontend**: LibreLudo (TypeScript/React/Vite) - `/libre_ludo/`
- **Backend**: FastAPI with WebSocket - `/backend/`
- **Deployment**: Ubuntu VM via `deploy/deploy.sh`

## 🚀 Local Development

### Prerequisites
- Node.js 18+ (`node --version`)
- Python 3.10+ (`python3 --version`)
- npm 10+ (`npm --version`)

### Setup Steps

#### 1. Install Frontend Dependencies
```bash
cd libre_ludo
npm ci                    # Install exact versions from lock file
cd ..
```

#### 2. Install Backend Dependencies
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

#### 3. Build Frontend (for production testing)
```bash
cd libre_ludo
npm run build             # Creates dist/ folder
cd ..
```

#### 4. Development with Hot Reload (recommended)
**Terminal 1 - Frontend:**
```bash
cd libre_ludo
npm run dev               # Starts Vite dev server on http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
source venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Access the app:
- Frontend: http://localhost:5173 (with hot reload)
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

### Frontend Development Notes
- The frontend is built with **React + Vite**
- Vite dev server will automatically proxy API requests to the backend
- Check `libre_ludo/vite.config.ts` for proxy configuration

## 📦 Oracle Ubuntu Deployment

### Prerequisites on Oracle VM
- Ubuntu 22.04 LTS or similar
- SSH access as `ubuntu` user
- Git installed

### Deployment Process

#### 1. From Local Machine - Push to Server
```bash
# Copy your project to the Oracle VM
ssh -i your-key.pem ubuntu@your-oracle-ip << 'EOF'
  cd ~
  git clone <your-repo-url> ludo  # Or use rsync/scp
  cd ludo
EOF
```

#### 2. Run Deployment Script
```bash
ssh -i your-key.pem ubuntu@your-oracle-ip "cd ~/ludo && bash deploy/deploy.sh"
```

The script will:
- ✅ Update system packages
- ✅ Install Node.js and npm
- ✅ Install Python3 and dependencies
- ✅ Build the LibreLudo frontend
- ✅ Install Python dependencies
- ✅ Configure systemd service (`twin-roll`)
- ✅ Setup nginx reverse proxy
- ✅ Configure firewall

#### 3. Verify Deployment
```bash
# Check service status
ssh -i your-key.pem ubuntu@your-oracle-ip "systemctl status twin-roll"

# View logs
ssh -i your-key.pem ubuntu@your-oracle-ip "journalctl -u twin-roll -f"
```

#### 4. Access Your App
```
http://<your-oracle-ip>
```

### Post-Deployment: SSL/HTTPS (Recommended)

```bash
ssh -i your-key.pem ubuntu@your-oracle-ip
sudo certbot --nginx -d yourdomain.com
# Follow prompts to setup HTTPS
```

Then uncomment the HTTPS block in `/etc/nginx/sites-available/twin-roll`.

## 🔍 Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Nginx (Port 80/443)                │
├─────────────────────────────────────────────────────┤
│  /                → /libre_ludo/dist/ (SPA root)    │
│  /ws              → :8000/ws (WebSocket)            │
│  /api/*           → :8000/api/* (API routes)        │
└─────────────────────────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
         ┌────▼─────┐      ┌─────▼──────┐
         │  FastAPI │      │   Vite Dist│
         │ :8000    │      │   Static   │
         └──────────┘      └────────────┘
              │
         ┌────▼─────────────┐
         │  WebSocket Logic │
         │  Game Routes     │
         │  Game State      │
         └──────────────────┘
```

## 📝 Configuration Files Modified

1. **deploy/deploy.sh**
   - Added Node.js installation
   - Added frontend build step
   - Updated copy destinations

2. **deploy/nginx.conf**
   - Route `/` to built dist folder
   - SPA fallback to `index.html`
   - WebSocket proxying to FastAPI

3. **backend/main.py**
   - Updated frontend serving to use `dist/` folder
   - Fallback to old `frontend/` for compatibility

## 🐛 Troubleshooting

### Frontend not loading
```bash
# Check if dist was built
ls -la /opt/twin-roll/libre_ludo/dist/

# Rebuild manually
cd /opt/twin-roll/libre_ludo
npm run build
sudo systemctl restart nginx
```

### WebSocket connection drops
- Check backend logs: `journalctl -u twin-roll -f`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Verify `/ws` route in backend/routes.py

### Port conflicts
```bash
# Find what's using port 8000
sudo lsof -i :8000

# Find what's using port 80
sudo lsof -i :80
```

## 📚 Useful Commands

```bash
# View backend service logs
journalctl -u twin-roll -f

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart backend
sudo systemctl restart twin-roll

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Check service status
systemctl status twin-roll
```

## 🔐 Next Steps

1. ✅ Test locally with `npm run dev` + `uvicorn`
2. ✅ Build frontend and test with `npm run build`
3. ✅ Deploy to Oracle using `bash deploy/deploy.sh`
4. ✅ Setup SSL with Let's Encrypt
5. ✅ Configure Oracle Security List for ports 80/443
6. 🔄 Monitor logs and iterate on game logic/features

## 🎮 Adding Game Variants

Once deployment is verified, you can:
1. Modify game logic in `libre_ludo/src/game/`
2. Update UI in `libre_ludo/src/components/`
3. Run `npm run build` to rebuild
4. Either:
   - Redeploy via `deploy/deploy.sh`, or
   - Manually update `/opt/twin-roll/libre_ludo/` and run `npm run build`

---

**Last Updated**: April 2026  
**Integration**: LibreLudo Frontend + FastAPI Backend  
**Deployment Target**: Oracle Ubuntu VM
