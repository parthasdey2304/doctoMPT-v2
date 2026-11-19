#!/bin/bash
set -e

echo "=== Setting up DoctoMPT Systemd Service ==="

# Create systemd service
cat << 'EOF' > /etc/systemd/system/doctompt.service
[Unit]
Description=DoctoMPT FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/doctompt-backend
ExecStart=/home/ubuntu/doctompt-backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=3
EnvironmentFile=/home/ubuntu/doctompt-backend/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable doctompt
systemctl restart doctompt

echo "=== DoctoMPT Service Started ==="
systemctl status doctompt --no-pager
