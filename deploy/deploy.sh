#!/bin/bash
# Twin Roll — Oracle Free Tier Ubuntu Deploy Script
# Integrated with LibreLudo frontend
# Run as: bash deploy.sh
set -e

echo "=== Twin Roll Deployment ==="

# 1. Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx curl
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Create app directory
sudo mkdir -p /opt/twin-roll
sudo chown ubuntu:ubuntu /opt/twin-roll

# 3. Copy files (run from project root)
cp -r backend /opt/twin-roll/
cp -r libre_ludo /opt/twin-roll/
cp pom.properties /opt/twin-roll/

# 4. Build LibreLudo frontend
cd /opt/twin-roll/libre_ludo
npm ci
npm run build
cd /opt/twin-roll

# 5. Python virtual environment
python3 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r backend/requirements.txt

# 5. Install systemd service
sudo cp deploy/twin-roll.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable twin-roll
sudo systemctl start twin-roll

# 6. Configure nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/twin-roll
sudo ln -sf /etc/nginx/sites-available/twin-roll /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 7. Open firewall (Oracle requires this + Security List rules in console)
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 8000 -j ACCEPT
sudo netfilter-persistent save 2>/dev/null || sudo apt install -y iptables-persistent

echo ""
echo "✅ Twin Roll deployed!"
echo "   → App running at: http://$(curl -s ifconfig.me)"
echo ""
echo "Next steps:"
echo "  1. Point your domain DNS A record to: $(curl -s ifconfig.me)"
echo "  2. Add Ingress rules in Oracle Cloud console for ports 80 and 443"
echo "  3. Run: sudo certbot --nginx -d yourdomain.com"
echo "  4. Edit /etc/nginx/sites-available/twin-roll — uncomment HTTPS block"
