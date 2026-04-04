####

Faeture to be developed. We need to count number of cuts one is making per game.



# Twin Roll — Multiplayer Ludo
# Testing CICD
Real-time multiplayer Ludo with a **Twin Dice** mode. Mobile-first, WebSocket-based, self-hosted.

## Features
- **2 or 4 player** real-time multiplayer via WebSockets
- **Normal mode** (1 die) or **Twin Dice mode** (2 dice, use any combo freely)
- **Private rooms** — join by 6-char code
- **Public matchmaking** — auto-match with strangers
- **In-game chat**
- Mobile-first UI, works in any mobile browser
- Full Ludo rules: captures, safe squares, home column, 6-to-enter

## Project Structure
```
twin-roll/
├── backend/
│   ├── main.py          # FastAPI + WebSocket game server
│   └── requirements.txt
├── frontend/
│   └── index.html       # Single-file game client
└── deploy/
    ├── deploy.sh        # Oracle Free Tier setup script
    ├── nginx.conf       # Nginx reverse proxy with WS support
    └── twin-roll.service # Systemd service
```

## Local Development

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Open frontend/index.html in browser
# Or visit http://localhost:8000
```

## Oracle Free Tier Deployment

### Prerequisites
- Oracle Cloud Always Free VM (Ubuntu 22.04, 1 OCPU, 1 GB RAM is enough)
- SSH access to the VM

### Steps

```bash
# On your local machine — copy project to Oracle VM
scp -r twin-roll/ ubuntu@YOUR_VM_IP:~/

# SSH into VM
ssh ubuntu@YOUR_VM_IP

# Run deploy script
cd ~/twin-roll
bash deploy/deploy.sh
```

### Oracle Cloud Console — Required Steps
1. Go to **Networking → Virtual Cloud Networks → Security Lists**
2. Add **Ingress Rules** for:
   - TCP port **80** (HTTP)
   - TCP port **443** (HTTPS)
3. (Optional) Point a domain to your VM's IP

### Enable HTTPS (recommended for WSS)
```bash
sudo certbot --nginx -d yourdomain.com
```
Then uncomment the HTTPS block in `/etc/nginx/sites-available/twin-roll`.

### Service Commands
```bash
sudo systemctl status twin-roll    # Check status
sudo systemctl restart twin-roll   # Restart
sudo journalctl -u twin-roll -f    # Live logs
```

## Twin Dice Rules
When Twin Dice mode is enabled:
- Both dice sets roll simultaneously each turn
- The player can freely use the dice values in any combination:
  - Move one piece using die 1, another piece using die 2
  - Move one piece using die 1 only
  - Move one piece using die 2 only
  - Move one piece using die 1 + die 2 (combined) — if valid
- A 6 on either die allows entering a piece from home base
- Getting a 6 earns an extra turn (after using both dice)

## Tech Stack
- **Backend**: Python 3.11, FastAPI, Uvicorn, WebSockets (no Redis needed)
- **Frontend**: Vanilla JS, single HTML file, Google Fonts
- **Server**: Nginx reverse proxy, systemd process manager
- **Hosting**: Oracle Cloud Free Tier (Always Free VM)
