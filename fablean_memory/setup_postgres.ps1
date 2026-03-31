$ErrorActionPreference = "Stop"

$containerName = "fablean-postgres"
$image = "postgres:16"
$port = "5432"
$dbUser = "postgres"
$dbPassword = "postgres"
$dbName = "fablean"

$existing = docker ps -a --filter "name=^/$containerName$" --format "{{.Names}}"

if ($existing -eq $containerName) {
    $running = docker ps --filter "name=^/$containerName$" --format "{{.Names}}"
    if ($running -ne $containerName) {
        Write-Host "Starting existing container $containerName..."
        docker start $containerName | Out-Null
    } else {
        Write-Host "Container $containerName already running."
    }
} else {
    Write-Host "Creating PostgreSQL container $containerName..."
    docker run -d --name $containerName -p ${port}:5432 -e POSTGRES_USER=$dbUser -e POSTGRES_PASSWORD=$dbPassword -e POSTGRES_DB=$dbName $image | Out-Null
}

Write-Host "Waiting for PostgreSQL to accept connections..."
for ($i = 0; $i -lt 30; $i++) {
    $ready = docker exec $containerName pg_isready -U $dbUser 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PostgreSQL is ready."
        break
    }
    Start-Sleep -Seconds 2
}

if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL did not become ready in time."
}

Write-Host "Database '$dbName' is available in container '$containerName'."
