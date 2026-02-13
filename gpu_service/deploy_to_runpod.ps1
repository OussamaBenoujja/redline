
# Deploy to RunPod Script (Windows PowerShell)

param (
    [Parameter(Mandatory = $true)]
    [string]$HostIp,

    [Parameter(Mandatory = $true)]
    [string]$Port,

    [string]$IdentityFile = "~/.ssh/id_ed25519",
    [string]$RunPodUser = "root",
    [string]$RemoteDir = "/workspace/gpu_service"
)

Write-Host "Deploying to RunPod ($HostIp : $Port)..."

# 1. Create remote directory
ssh -p $Port -i $IdentityFile -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $RunPodUser@$HostIp "mkdir -p $RemoteDir"

# 2. Copy files
Write-Host "Copying files..."
scp -P $Port -i $IdentityFile -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null requirements.txt app.py Dockerfile runpod_setup_remote.sh "${RunPodUser}@${HostIp}:${RemoteDir}/"

# 3. Execute setup script
Write-Host "Starting remote setup..."
ssh -p $Port -i $IdentityFile -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $RunPodUser@$HostIp "chmod +x $RemoteDir/runpod_setup_remote.sh && $RemoteDir/runpod_setup_remote.sh"

Write-Host "Deployment script finished. Check console for remote output."
