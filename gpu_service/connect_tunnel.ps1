# Connect to RunPod Tunnel
# This forwards local port 8000 to the remote pod's port 8000
# It bypasses strict host key checking to handle ephemeral pod IPs.

$HOST_IP = "194.68.245.204"
$PORT = "22119"
$IDENTITY_FILE = "~/.ssh/id_ed25519"

Write-Host "Connecting to RunPod Tunnel ($HOST_IP : $PORT)..."
Write-Host "Forwarding localhost:8000 -> remote:8000"
Write-Host "Press Ctrl+C to stop."

ssh -N -L 8000:localhost:8000 -p $PORT -i $IDENTITY_FILE -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$HOST_IP
