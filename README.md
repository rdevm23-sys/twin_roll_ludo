# Twin Roll — Multiplayer Ludo

Real-time multiplayer Ludo with **Twin Dice** mode. Mobile-first, WebSocket-based, self-hosted (for example on Oracle Cloud Free Tier).

## Features

- **2 or 4 player** real-time multiplayer via WebSockets
- **Normal mode** (1 die) or **Twin Dice mode** (2 dice, use any combo freely)
- **Private rooms** — join by 6-character code
- **Public matchmaking** — auto-match with strangers
- **In-game chat**
- Mobile-first UI
- Full Ludo rules: captures, safe squares, home column, 6-to-enter

## Project structure

```
├── backend/           # FastAPI + WebSocket game server
├── libre_ludo/        # React + Vite SPA (built to libre_ludo/dist)
├── deploy/            # deploy.sh, nginx.conf, twin-roll.service
└── pom.properties     # Version metadata
```

Production static files are served from **`libre_ludo/dist`** (built with `npm run build` inside `libre_ludo/`).

## Local development

**Backend** (from the repository root):

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

**Frontend (Vite dev server):**

```bash
cd libre_ludo
npm ci
npm run dev
```

With a built `libre_ludo/dist`, the backend can also serve the SPA at `http://localhost:8000`.

## Oracle Free Tier deployment

### Prerequisites

- Oracle Cloud Always Free VM (Ubuntu 22.04; 1 OCPU / 1 GB RAM is enough)
- SSH access to the VM

### Steps

```bash
# From your machine — copy the project to the VM
scp -r . ubuntu@YOUR_VM_IP:~/

ssh ubuntu@YOUR_VM_IP
cd ludo   # or your clone directory
bash deploy/deploy.sh
```

### Oracle Cloud console

1. **Networking → VCN → Security Lists** — add ingress for TCP **80**, **443**, and **8000** if you proxy/debug the API directly.

### HTTPS (recommended for WSS)

```bash
sudo certbot --nginx -d yourdomain.com
```

Then uncomment the HTTPS block in `/etc/nginx/sites-available/twin-roll` if your template uses it.

### Service commands

```bash
sudo systemctl status twin-roll
sudo systemctl restart twin-roll
sudo journalctl -u twin-roll -f
```

## Twin Dice rules

When Twin Dice mode is enabled:

- Both dice roll each turn; you may use values in any combination on valid moves.
- A 6 on either die allows entering from home; a 6 still grants an extra turn after both dice are used.

## Tech stack

- **Backend**: Python 3, FastAPI, Uvicorn, WebSockets
- **Frontend**: React, Vite, TypeScript (LibreLudo-based UI)
- **Server**: Nginx reverse proxy, systemd
