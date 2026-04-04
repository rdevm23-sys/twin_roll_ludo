# 🚀 Integration Changes - Quick Reference

## Files Modified

### 1. `deploy/deploy.sh`
**What changed**: Frontend now integrated into deployment process
```diff
- Install python3, pip, nginx
+ Install python3, pip, nginx, Node.js 18 LTS, npm

- cp -r frontend /opt/twin-roll/
+ cp -r libre_ludo /opt/twin-roll/

+ cd /opt/twin-roll/libre_ludo
+ npm ci
+ npm run build
```

### 2. `deploy/nginx.conf`
**What changed**: Routes requests to LibreLudo dist and proxies APIs
```diff
- location /static/ { alias /opt/twin-roll/frontend/; }
+ location / { root /opt/twin-roll/libre_ludo/dist; try_files $uri $uri/ /index.html; }

+ Preserves /ws → proxy_pass :8000 (WebSocket)
+ Preserves API routing → FastAPI backend
```

### 3. `backend/main.py`
**What changed**: Serves built frontend dist folder
```diff
- frontend_path = os.path.join(..., "frontend")
+ frontend_path = os.path.join(..., "libre_ludo", "dist")
+ if not exists, fallback to old "frontend"
```

## New Files Created

- ✅ `INTEGRATION_SETUP.md` - Complete setup guide
- ✅ `INTEGRATION_COMPLETE.md` - Overview and next steps
- ✅ `verify-integration.sh` - Pre-deployment checker
- ✅ `LOCAL_DEV_QUICK_START.md` (This file)

## 🎯 Key Points

### What Stays the Same
- ✅ FastAPI backend logic (routes, websocket, game logic)
- ✅ Backend port: 8000
- ✅ WebSocket endpoint: /ws
- ✅ Deployment service: twin-roll.service
- ✅ System user: ubuntu

### What Changed
- Old `frontend/` → No longer deployed (use `libre_ludo/dist/`)
- Frontend tech: HTML/CSS/JS → React/TypeScript/Vite
- Build required: Yes (npm run build)
- Static serve: Nginx from dist (not FastAPI)

### What's New
- Node.js/npm installed on server
- Frontend build step in deployment
- SPA routing (try_files fallback)
- PWA support (from LibreLudo)

## 🧪 Local Development Checklist

- [ ] Install Node.js? (Check: `node --version` should be 18+)
- [ ] `cd libre_ludo && npm install`
- [ ] `npm run dev` starts on http://localhost:5173
- [ ] Backend `uvicorn backend.main:app --reload`
- [ ] Test WebSocket connection works
- [ ] `npm run build` creates `dist/` folder
- [ ] Frontend builds without errors

## 🚢 Deployment Checklist

- [ ] Code pushed to git repository
- [ ] Run `bash verify-integration.sh` locally (all green)
- [ ] SSH access to Oracle Ubuntu VM ready
- [ ] Copy project to VM: `scp -r . ubuntu@IP:~/ludo/`
- [ ] Run: `ssh ubuntu@IP "cd ~/ludo && bash deploy/deploy.sh"`
- [ ] Access app at: `http://YOUR_ORACLE_IP`
- [ ] Check logs: `ssh ubuntu@IP "journalctl -u twin-roll -f"`
- [ ] Setup SSL: `sudo certbot --nginx -d yourdomain.com`

## 🔗 Connection Flow

```
Browser Request
    ↓
Nginx Reverse Proxy (port 80/443)
    ├─ Static requests → /opt/twin-roll/libre_ludo/dist/
    ├─ /ws             → FastAPI :8000 (WebSocket)
    └─ /api/*          → FastAPI :8000 (API)
    
FastAPI Backend (:8000)
    ├─ WebSocket logic
    ├─ Game routes
    └─ API endpoints
```

## ⚡ Performance Optimization

**Client-side**:
- Vite builds optimized bundles
- CSS modules for scoped styling
- Code splitting enabled

**Server-side**:
- Nginx serves static assets (fast)
- FastAPI handles dynamic content
- WebSocket persistent connection
- Browser caching: 1 hour for assets

## 🎮 Game Variant Development Workflow

1. **Edit game code**:
   ```bash
   vim libre_ludo/src/game/players/logic.ts  # Example
   ```

2. **Test locally**:
   ```bash
   npm run dev  # Vite hot-reload
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Deploy**:
   ```bash
   # Full redeploy or just restart nginx
   scp -r libre_ludo/dist ubuntu@IP:/opt/twin-roll/libre_ludo/
   ssh ubuntu@IP "sudo systemctl restart nginx"
   ```

## 📦 Dependencies Added

### System (on server only)
- Node.js 18 LTS
- npm 10+

### Node.js (from libre_ludo/package.json)
- React, React Router
- Redux Toolkit
- TypeScript
- Vite (build tool)
- Vitest (testing)

### Python (already existed)
- FastAPI
- Uvicorn
- WebSockets

## 🔒 Environment Variables

None required for basic setup, but consider adding:

**Frontend** (`libre_ludo/.env`):
```
VITE_API_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```
ALLOWED_ORIGINS=https://yourdomain.com
LOG_LEVEL=info
```

## 📊 Deployment Timeline

| Step | Time | Notes |
|------|------|-------|
| System updates | 2-3 min | apt update/upgrade |
| Node.js install | 1-2 min | From NodeSource |
| npm dependencies | 2-3 min | npm ci |
| npm build | 1-2 min | Vite build |
| Python venv | 1 min | venv creation |
| Python packages | 2-3 min | pip install |
| Nginx config | < 1 min | Symlinks |
| **Total** | **10-15 min** | One-time deployment |

Future updates are faster (skip system setup).

## 🎓 Learning Resources

- **Vite**: https://vitejs.dev/
- **React + TypeScript**: https://react.dev/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Nginx**: https://nginx.org/en/docs/
- **WebSocket**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

---

**TL;DR**: Configure done! ✅
1. Test: `npm run dev + uvicorn`
2. Build: `npm run build`
3. Deploy: `bash deploy/deploy.sh`
4. Ready! 🚀
