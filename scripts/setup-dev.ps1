param(
  [ValidateSet("compose", "local-node")]
  [string]$Preset = "compose",
  [switch]$Install,
  [switch]$ForceEnv
)

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$EnvPath = Join-Path $RootDir ".env"

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function New-EnvContent($CurrentPreset) {
  if ($CurrentPreset -eq "local-node") {
    return @"
# Generated for direct Node.js runtime
PORT=4000
CORS_ORIGIN=http://localhost:3000

# memory | prisma
DATA_SOURCE=prisma

# 로컬에 설치한 postgres 또는 로컬 docker postgres 기준
DATABASE_URL=postgresql://postgres@localhost:5432/ai_edu

# 선택값
POSTGRES_PASSWORD=
AUTH_TOKEN_SECRET=local-dev-auth-token-secret
OPENAI_API_KEY=
"@
  }

  return @"
# Generated for Docker Compose development
PORT=4000
CORS_ORIGIN=http://localhost:3000

# memory | prisma
DATA_SOURCE=prisma

# Docker Compose 내부 postgres 사용
DATABASE_URL=postgresql://postgres@postgres:5432/ai_edu

# 선택값
POSTGRES_PASSWORD=
AUTH_TOKEN_SECRET=
OPENAI_API_KEY=
"@
}

function Ensure-EnvFile($CurrentPreset, $Overwrite) {
  if ((Test-Path $EnvPath) -and -not $Overwrite) {
    Write-Host "[env] .env already exists"
    return
  }

  Set-Content -Path $EnvPath -Value (New-EnvContent $CurrentPreset) -Encoding UTF8
  Write-Host "[env] created $EnvPath"
}

Write-Host "[check] preset=$Preset"

$Missing = @()

if (-not (Test-Command "wsl")) {
  $Missing += "wsl"
}

if (-not (Test-Command "docker")) {
  $Missing += "docker"
}

if ($Preset -eq "local-node") {
  if (-not (Test-Command "node")) {
    $Missing += "node"
  }

  if (-not (Test-Command "npm")) {
    $Missing += "npm"
  }

  if (-not (Test-Command "psql") -and -not (Test-Command "docker")) {
    $Missing += "postgres"
  }
} elseif (-not (Test-Command "node") -or -not (Test-Command "npm")) {
  Write-Host "[optional] local node/npm이 없으면 Docker Compose 경로만 사용 가능합니다."
}

if ($Install) {
  if ($Missing -contains "wsl") {
    Write-Host "[install] wsl"
    wsl --install -d Ubuntu
  }

  if ($Missing -contains "docker") {
    Write-Host "[install] docker desktop"
    winget install -e --id Docker.DockerDesktop
  }

  if ($Missing -contains "node" -or $Missing -contains "npm") {
    Write-Host "[install] node"
    winget install -e --id OpenJS.NodeJS.LTS
  }

  if ($Missing -contains "postgres") {
    Write-Host "[install] postgresql"
    winget install -e --id PostgreSQL.PostgreSQL.16
  }
} elseif ($Missing.Count -gt 0) {
  Write-Host "[missing] $($Missing -join ', ')"
  Write-Host "PowerShell 예시:"
  if ($Missing -contains "wsl") {
    Write-Host "  wsl --install -d Ubuntu"
  }
  if ($Missing -contains "docker") {
    Write-Host "  winget install -e --id Docker.DockerDesktop"
  }
  if ($Missing -contains "node" -or $Missing -contains "npm") {
    Write-Host "  winget install -e --id OpenJS.NodeJS.LTS"
  }
  if ($Missing -contains "postgres") {
    Write-Host "  winget install -e --id PostgreSQL.PostgreSQL.16"
  }
}

Ensure-EnvFile -CurrentPreset $Preset -Overwrite $ForceEnv

Write-Host ""
Write-Host "[next]"
if ($Preset -eq "compose") {
  Write-Host "  1. Docker Desktop를 실행하고 WSL integration을 켭니다."
  Write-Host "  2. docker compose up"
  Write-Host "  3. http://localhost:4000/healthz 확인"
} else {
  Write-Host "  1. PostgreSQL을 localhost:5432에서 실행"
  Write-Host "  2. npm install"
  Write-Host "  3. npm run prisma:generate"
  Write-Host "  4. npm run start:dev:prisma"
}

if ($Missing.Count -gt 0) {
  exit 1
}
