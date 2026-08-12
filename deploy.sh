#!/bin/bash
# ──────────────────────────────────────────────────────────────────────
# deploy.sh — Push Zync backend to Oracle Cloud VM and restart PM2
#
# Usage (from your local Zync root folder):
#   bash deploy.sh
#
# Prerequisites:
#   - SSH key path (export SSH_KEY=/path/to/key)
#   - VM_IP environment variable set, OR edit the default below
#   - First-time setup already completed (see ORACLE_VM_SETUP.md)
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────
# No defaults for SSH key, user, or IP — they MUST be provided. A committed
# default IP/key is a security hazard (wrong-target deploys, leaked infra).
SSH_KEY="${SSH_KEY:-}"
VM_USER="${VM_USER:-ubuntu}"
VM_IP="${VM_IP:-}"
REMOTE_DIR="/home/$VM_USER/zync-backend"
PM2_PROCESS_NAME="zync-backend"

if [ -z "$VM_IP" ]; then
  echo "ERROR: Set VM_IP.  export VM_IP=<your-ip>"
  exit 1
fi
if [ -z "$SSH_KEY" ]; then
  echo "ERROR: Set SSH_KEY.  export SSH_KEY=/path/to/your-ssh-key"
  exit 1
fi
if [ ! -f "$SSH_KEY" ]; then
  echo "ERROR: SSH key not found at $SSH_KEY"
  exit 1
fi

# Host-key verification stays ON — no StrictHostKeyChecking=no.
SSH_CMD="ssh -i $SSH_KEY $VM_USER@$VM_IP"
SCP_CMD="scp -i $SSH_KEY"

echo "🚀 Deploying Zync backend to $VM_IP ..."

# ── 1. Sync backend folder (excluding node_modules, .env, uploads) ───
echo "📦 Uploading backend files..."
rsync -avz --progress \
  -e "ssh -i $SSH_KEY" \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'uploads/*' \
  --exclude 'prisma/generated' \
  --exclude 'package-lock.json' \
  ./backend/ $VM_USER@$VM_IP:$REMOTE_DIR/

# ── 2. Install deps + regenerate Prisma client on the VM ─────────────
echo "📥 Installing dependencies on VM..."
$SSH_CMD << 'EOF'
  cd /home/ubuntu/zync-backend
  npm install --production
  npx prisma generate
EOF

# ── 3. Restart PM2 ──────────────────────────────────────────────────
echo "♻️  Restarting PM2 process..."
$SSH_CMD << EOF
  cd /home/ubuntu/zync-backend
  pm2 describe $PM2_PROCESS_NAME > /dev/null 2>&1 && pm2 restart $PM2_PROCESS_NAME || pm2 start index.js --name $PM2_PROCESS_NAME
  pm2 save
EOF

echo ""
echo "✅ Deployment complete!"
echo "   Backend running at http://$VM_IP:5000"
echo "   Check logs: ssh -i $SSH_KEY $VM_USER@$VM_IP 'pm2 logs $PM2_PROCESS_NAME'"
