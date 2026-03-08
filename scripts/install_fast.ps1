# ============================================================================
# FEDDA Fast Installer — Non-Portable (System Tools + venv)
# ============================================================================
# Assumes: Python 3.10+, Git, Node.js 18+, Ollama already on system
# Creates: venv, ComfyUI, custom nodes, frontend, backend — ready to run
# ============================================================================

$ErrorActionPreference = "Stop"
$ScriptPath = $PSScriptRoot
$RootPath = Split-Path -Parent $ScriptPath
$RootPath = (Resolve-Path $RootPath).Path
Set-Location $RootPath

# Logging
$LogsDir = Join-Path $RootPath "logs"
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir | Out-Null }
$LogFile = Join-Path $LogsDir "install_fast_log.txt"

function Write-Step {
    param([string]$Message, [string]$Color = "White")
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "  [$ts] $Message" -ForegroundColor $Color
    Add-Content -Path $LogFile -Value "[$ts] $Message" -ErrorAction SilentlyContinue
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
}

function Test-Command {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

# ============================================================================
# 0. BANNER + SYSTEM CHECK
# ============================================================================
Clear-Host
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║                                                  ║" -ForegroundColor Cyan
Write-Host "  ║       FEDDA. FAST INSTALLER                      ║" -ForegroundColor Cyan
Write-Host "  ║       Non-Portable — System Tools Mode           ║" -ForegroundColor Cyan
Write-Host "  ║                                                  ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# --- Detect System Tools ---
Write-Header "SYSTEM CHECK"

$AllGood = $true

# Python
if (Test-Command "python") {
    $PyVersion = & python --version 2>&1
    $PyExe = (Get-Command python).Source
    Write-Step "Python:  $PyVersion  ($PyExe)" "Green"
} else {
    Write-Step "Python:  NOT FOUND — install from python.org" "Red"
    $AllGood = $false
}

# Git
if (Test-Command "git") {
    $GitVersion = & git --version 2>&1
    Write-Step "Git:     $GitVersion" "Green"
} else {
    Write-Step "Git:     NOT FOUND — install from git-scm.com" "Red"
    $AllGood = $false
}

# Node.js
if (Test-Command "node") {
    $NodeVersion = & node --version 2>&1
    Write-Step "Node.js: $NodeVersion" "Green"
} else {
    Write-Step "Node.js: NOT FOUND — install from nodejs.org" "Red"
    $AllGood = $false
}

# npm
if (Test-Command "npm") {
    $NpmVersion = & npm --version 2>&1
    Write-Step "npm:     v$NpmVersion" "Green"
} else {
    Write-Step "npm:     NOT FOUND" "Red"
    $AllGood = $false
}

# Ollama
if (Test-Command "ollama") {
    $OllamaVersion = & ollama --version 2>&1
    Write-Step "Ollama:  $OllamaVersion" "Green"
} else {
    Write-Step "Ollama:  NOT FOUND (optional — AI chat won't work)" "Yellow"
}

# NVIDIA GPU
try {
    $NvidiaGPU = Get-CimInstance Win32_VideoController -ErrorAction Stop | Where-Object { $_.Name -match "NVIDIA" } | Select-Object -First 1
    if ($NvidiaGPU) {
        $VRAM_MB = 0
        try {
            $SmiOut = & nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>$null
            if ($SmiOut) { $VRAM_MB = [int]($SmiOut.Trim()) }
        } catch {}
        $VRAMStr = if ($VRAM_MB -gt 0) { " ($([math]::Round($VRAM_MB / 1024)) GB VRAM)" } else { "" }
        Write-Step "GPU:     $($NvidiaGPU.Name)$VRAMStr" "Green"
    } else {
        Write-Step "GPU:     No NVIDIA GPU found — CUDA required!" "Red"
        $AllGood = $false
    }
} catch {
    Write-Step "GPU:     Detection failed" "Yellow"
}

# RAM & Disk
$OSInfo = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$RAM_GB = if ($OSInfo) { [math]::Round($OSInfo.TotalVisibleMemorySize / 1MB) } else { 0 }
$Drive = (Get-Item $RootPath).PSDrive
$FreeGB = [math]::Round($Drive.Free / 1GB)

Write-Step "RAM:     ${RAM_GB} GB" $(if ($RAM_GB -ge 16) { "Green" } else { "Yellow" })
Write-Step "Disk:    ${FreeGB} GB free on $($Drive.Name):\" $(if ($FreeGB -ge 10) { "Green" } elseif ($FreeGB -ge 5) { "Yellow" } else { "Red" })

Write-Host ""

if (-not $AllGood) {
    Write-Host "  MISSING REQUIREMENTS — install the tools marked in red above." -ForegroundColor Red
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 1
}

# Confirm
Write-Host "  All system tools detected. Root: $RootPath" -ForegroundColor Gray
Write-Host ""
$Confirm = Read-Host "  Press ENTER to install, or N to cancel"
if ($Confirm -eq "N" -or $Confirm -eq "n") { exit 0 }

$StopWatch = [System.Diagnostics.Stopwatch]::StartNew()

# ============================================================================
# 1. PYTHON VENV
# ============================================================================
Write-Header "STEP 1/7 — Python Virtual Environment"

$VenvDir = Join-Path $RootPath "venv"
$VenvPy = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip = Join-Path $VenvDir "Scripts\pip.exe"

if (-not (Test-Path $VenvPy)) {
    Write-Step "Creating venv..."
    & python -m venv "$VenvDir"
    Write-Step "Upgrading pip..."
    & $VenvPy -m pip install --upgrade pip wheel setuptools --quiet
    Write-Step "venv created." "Green"
} else {
    Write-Step "venv already exists." "Green"
}

# Helper to run pip in venv
function Venv-Pip {
    param([string]$Args)
    $proc = Start-Process -FilePath $VenvPy -ArgumentList "-m pip $Args" -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
        Write-Step "WARNING: pip command had issues: $Args" "Yellow"
    }
}

# ============================================================================
# 2. COMFYUI
# ============================================================================
Write-Header "STEP 2/7 — ComfyUI Core"

$ComfyUICommit = "0467f69"  # Pinned stable
$ComfyDir = Join-Path $RootPath "ComfyUI"

if (-not (Test-Path $ComfyDir)) {
    Write-Step "Cloning ComfyUI..."
    & git clone https://github.com/comfyanonymous/ComfyUI.git "$ComfyDir" 2>&1 | Out-String | Out-Null
    Set-Location $ComfyDir
    & git checkout $ComfyUICommit 2>&1 | Out-String | Out-Null
    Set-Location $RootPath
    Write-Step "ComfyUI cloned + pinned to $ComfyUICommit" "Green"
} else {
    Write-Step "ComfyUI already exists." "Green"
}

# ============================================================================
# 3. PYTORCH + CORE DEPS
# ============================================================================
Write-Header "STEP 3/7 — PyTorch + Dependencies"

Write-Step "Installing PyTorch (CUDA 12.4)... this takes a few minutes"
Venv-Pip "install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124"

Write-Step "Installing xformers..."
Venv-Pip "install xformers --index-url https://download.pytorch.org/whl/cu124"

Write-Step "Installing ComfyUI requirements..."
$ComfyReq = Join-Path $ComfyDir "requirements.txt"
Venv-Pip "install -r `"$ComfyReq`""

Write-Step "Installing build tools..."
Venv-Pip "install cmake ninja Cython"

Write-Step "Installing insightface..."
Venv-Pip "install insightface --prefer-binary --no-build-isolation"

# Comprehensive deps (same as portable)
Write-Step "Installing comprehensive dependencies..."
$Deps = @(
    "accelerate", "transformers", "diffusers", "safetensors",
    "huggingface-hub", "onnxruntime-gpu", "onnxruntime", "omegaconf",
    "aiohttp", "aiohttp-sse",
    "pytube", "yt-dlp", "moviepy", "youtube-transcript-api",
    "numba",
    "imageio", "imageio-ffmpeg", "av",
    "gdown", "pandas", "reportlab",
    "GPUtil", "wandb",
    "piexif", "rembg", "pillow-heif",
    "librosa", "soundfile",
    "beautifulsoup4", "lxml", "shapely",
    "deepdiff", "matplotlib", "scipy", "scikit-image", "scikit-learn",
    "timm", "colour-science", "blend-modes", "loguru",
    "fastapi", "uvicorn[standard]", "python-multipart"
)
Venv-Pip "install $($Deps -join ' ')"

# SageAttention for 40/50-series
try {
    $GPUName = (Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match "NVIDIA" } | Select-Object -First 1).Name
    if ($GPUName -match "RTX 40\d\d" -or $GPUName -match "RTX 50\d\d") {
        Write-Step "RTX 40/50 series detected — installing SageAttention..."
        Venv-Pip "install sageattention"
    }
} catch {}

Write-Step "All Python dependencies installed." "Green"

# ============================================================================
# 4. CUSTOM NODES
# ============================================================================
Write-Header "STEP 4/7 — Custom Nodes (from config/nodes.json)"

$NodesConfig = Get-Content (Join-Path $RootPath "config\nodes.json") | ConvertFrom-Json
$CustomNodesDir = Join-Path $ComfyDir "custom_nodes"
if (-not (Test-Path $CustomNodesDir)) { New-Item -ItemType Directory -Path $CustomNodesDir | Out-Null }

$Installed = 0; $Skipped = 0; $Failed = 0

foreach ($Node in $NodesConfig) {
    if ($Node.local -eq $true) {
        Write-Step "  [$($Node.name)] Local — skipped" "Gray"
        continue
    }

    $NodeDir = Join-Path $CustomNodesDir $Node.folder
    if (-not (Test-Path $NodeDir)) {
        Write-Step "  [$($Node.name)] Cloning..." "White"
        $ErrorActionPreference = "Continue"
        $out = & git clone --depth 1 $Node.url "$NodeDir" 2>&1 | Out-String
        $ErrorActionPreference = "Stop"

        if ($LASTEXITCODE -eq 0) {
            $Installed++
            # Install node requirements
            $ReqFile = Join-Path $NodeDir "requirements.txt"
            if (Test-Path $ReqFile) {
                $ErrorActionPreference = "Continue"
                & $VenvPy -m pip install -r "$ReqFile" --no-warn-script-location --quiet 2>&1 | Out-Null
                $ErrorActionPreference = "Stop"
            }
        } else {
            Write-Step "  [$($Node.name)] FAILED" "Red"
            $Failed++
        }
    } else {
        $Skipped++
    }
}

Write-Step "Nodes: $Installed installed, $Skipped already present, $Failed failed" $(if ($Failed -gt 0) { "Yellow" } else { "Green" })

# ============================================================================
# 5. FRONTEND
# ============================================================================
Write-Header "STEP 5/7 — Frontend (React + Vite)"

$FrontendDir = Join-Path $RootPath "frontend"
if (Test-Path $FrontendDir) {
    Set-Location $FrontendDir
    if (-not (Test-Path "node_modules")) {
        Write-Step "Running npm install..."
        & npm install 2>&1 | Out-Null
        Write-Step "Frontend dependencies installed." "Green"
    } else {
        Write-Step "node_modules already exists." "Green"
    }
    Set-Location $RootPath
} else {
    Write-Step "frontend/ directory not found!" "Red"
}

# ============================================================================
# 6. ASSETS + CONFIG
# ============================================================================
Write-Header "STEP 6/7 — Assets & Configuration"

# styles.csv
$StylesSrc = Join-Path $RootPath "assets\styles.csv"
if (Test-Path $StylesSrc) {
    Copy-Item -Path $StylesSrc -Destination $ComfyDir -Force
    Write-Step "styles.csv installed." "Green"
}

# Bundled LoRAs
$SrcLoras = Join-Path $RootPath "assets\loras\z-image"
$DstLoras = Join-Path $ComfyDir "models\loras\z-image"
if (Test-Path $SrcLoras) {
    if (-not (Test-Path $DstLoras)) { New-Item -ItemType Directory -Path $DstLoras -Force | Out-Null }
    Copy-Item -Path "$SrcLoras\*" -Destination $DstLoras -Recurse -Force
    Write-Step "Bundled LoRAs (Emmy, Zana) installed." "Green"
} else {
    Write-Step "No bundled LoRAs found (download_loras.bat later)." "Yellow"
}

# Audio TTS asset
$AudioScript = Join-Path $ScriptPath "setup_tts_audio.py"
if (Test-Path $AudioScript) {
    & $VenvPy "$AudioScript" 2>&1 | Out-Null
    Write-Step "TTS audio assets configured." "Green"
}

# ComfyUI-Manager config (weak security for auto-install)
$MgrDir = Join-Path $ComfyDir "user\__manager"
if (-not (Test-Path $MgrDir)) { New-Item -ItemType Directory -Path $MgrDir -Force | Out-Null }
$MgrConfig = @"
[default]
preview_method = none
git_exe =
use_uv = False
channel_url = https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main
share_option = all
bypass_ssl = False
file_logging = True
component_policy = mine
update_policy = stable-comfyui
model_download_by_agent = False
downgrade_blacklist =
security_level = weak
always_lazy_install = False
network_mode = public
db_mode = remote
"@
Set-Content -Path (Join-Path $MgrDir "config.ini") -Value $MgrConfig
Write-Step "ComfyUI-Manager configured (weak security)." "Green"

# ============================================================================
# 7. SMOKE TEST
# ============================================================================
Write-Header "STEP 7/7 — Verification"

$SmokeCode = @"
import sys
ok = True
try:
    import torch
    gpu = torch.cuda.is_available()
    print(f'  PyTorch {torch.__version__} — CUDA: {gpu}')
    if gpu: print(f'  GPU: {torch.cuda.get_device_name(0)}')
    else: ok = False; print('  WARNING: CUDA not available!')
except Exception as e:
    ok = False; print(f'  PyTorch FAILED: {e}')

for lib in ['transformers', 'safetensors', 'numpy', 'PIL']:
    try:
        __import__(lib)
        print(f'  {lib}: OK')
    except:
        ok = False; print(f'  {lib}: FAILED')

sys.exit(0 if ok else 1)
"@
$SmokeFile = Join-Path $RootPath "_smoke_test.py"
Set-Content -Path $SmokeFile -Value $SmokeCode
$SmokeResult = Start-Process -FilePath $VenvPy -ArgumentList "$SmokeFile" -NoNewWindow -Wait -PassThru
Remove-Item $SmokeFile -Force

if ($SmokeResult.ExitCode -eq 0) {
    Write-Step "All core imports verified!" "Green"
} else {
    Write-Step "Some imports failed — check output above." "Yellow"
}

# Done
$StopWatch.Stop()
$Elapsed = $StopWatch.Elapsed
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║                                                  ║" -ForegroundColor Green
Write-Host "  ║       INSTALLATION COMPLETE!                     ║" -ForegroundColor Green
Write-Host "  ║                                                  ║" -ForegroundColor Green
Write-Host "  ║       Time: $("{0:mm}m {0:ss}s" -f $Elapsed)                             ║" -ForegroundColor Green
Write-Host "  ║       Run: run-fast.bat                          ║" -ForegroundColor Green
Write-Host "  ║                                                  ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
