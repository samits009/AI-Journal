# PowerShell deployment script for Google Cloud Run with Secret Manager
$ErrorActionPreference = "Stop"

$PROJECT_ID  = "favorable-tree-318603"
$SERVICE_NAME = "ai-journal"
$REGION      = "us-central1"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Deploying AI Journal to Google Cloud Run" -ForegroundColor Cyan
Write-Host " Project: $PROJECT_ID  |  Region: $REGION" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# ── Check gcloud is available ────────────────────────────────────
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud CLI is not installed. Install from https://cloud.google.com/sdk or run from Cloud Shell."
    exit 1
}

# ── Step 1: Set active project ───────────────────────────────────
gcloud config set project $PROJECT_ID

# ── Step 2: Enable required APIs (including secretmanager) ───────
Write-Host ""
Write-Host "[1/5] Enabling required GCP APIs..." -ForegroundColor Green
gcloud services enable `
    run.googleapis.com `
    cloudbuild.googleapis.com `
    artifactregistry.googleapis.com `
    secretmanager.googleapis.com `
    --project $PROJECT_ID

# ── Step 3: Collect keys securely via SecureString ───────────────
Write-Host ""
Write-Host "[2/5] Collecting API keys (input hidden)..." -ForegroundColor Green

function Get-SecureValue($envName, $prompt) {
    $val = [System.Environment]::GetEnvironmentVariable($envName)
    if (-not $val) {
        $sec = Read-Host $prompt -AsSecureString
        $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
        $val = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    return $val
}

$geminiApiKey  = Get-SecureValue "GEMINI_API_KEY"  "Enter your GEMINI_API_KEY"
$firebaseApiKey = Get-SecureValue "FIREBASE_API_KEY" "Enter your FIREBASE_API_KEY"

if (-not $geminiApiKey)  { Write-Error "GEMINI_API_KEY is required.";  exit 1 }
if (-not $firebaseApiKey) { Write-Error "FIREBASE_API_KEY is required."; exit 1 }

# ── Step 4: Store secrets in Secret Manager ──────────────────────
Write-Host ""
Write-Host "[3/5] Storing secrets in Google Cloud Secret Manager..." -ForegroundColor Green

function Store-Secret($secretName, $secretValue) {
    $exists = gcloud secrets describe $secretName --project $PROJECT_ID 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Creating secret: $secretName"
        gcloud secrets create $secretName `
            --replication-policy="automatic" `
            --project $PROJECT_ID
    }
    # Pipe value into gcloud via temp approach
    $tmp = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tmp, $secretValue)
    gcloud secrets versions add $secretName --data-file=$tmp --project $PROJECT_ID
    Remove-Item $tmp -Force
    Write-Host "  ✓ Secret stored: $secretName" -ForegroundColor Green
}

Store-Secret "gemini-api-key"  $geminiApiKey
Store-Secret "firebase-api-key" $firebaseApiKey

# ── Step 5: Grant Cloud Run SA access to secrets ─────────────────
Write-Host ""
Write-Host "[4/5] Granting Cloud Run service account access to secrets..." -ForegroundColor Green

$projectNumber = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$saEmail = "${projectNumber}-compute@developer.gserviceaccount.com"

function Grant-SecretAccess($secretName) {
    gcloud secrets add-iam-policy-binding $secretName `
        --member="serviceAccount:$saEmail" `
        --role="roles/secretmanager.secretAccessor" `
        --project $PROJECT_ID `
        --quiet 2>$null
    Write-Host "  ✓ Access granted: $secretName → $saEmail" -ForegroundColor Green
}

Grant-SecretAccess "gemini-api-key"
Grant-SecretAccess "firebase-api-key"

# ── Step 6: Deploy using --set-secrets ───────────────────────────
Write-Host ""
Write-Host "[5/5] Deploying to Cloud Run (secrets injected from Secret Manager)..." -ForegroundColor Green

gcloud run deploy $SERVICE_NAME `
    --project $PROJECT_ID `
    --region $REGION `
    --source . `
    --allow-unauthenticated `
    --labels "dev-tutorial=cloud-run-ai-challenge" `
    --set-env-vars "NODE_ENV=production" `
    --set-secrets "GEMINI_API_KEY=gemini-api-key:latest,FIREBASE_API_KEY=firebase-api-key:latest"

$serviceUrl = gcloud run services describe $SERVICE_NAME `
    --platform managed `
    --region $REGION `
    --format="value(status.url)" `
    --project $PROJECT_ID

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " ✅ Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host " Service URL: $serviceUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host " Secrets stored securely in Secret Manager:" -ForegroundColor White
Write-Host "   • gemini-api-key" -ForegroundColor White
Write-Host "   • firebase-api-key" -ForegroundColor White
Write-Host ""
Write-Host " IMPORTANT: Add the domain to Firebase Authorized Domains:" -ForegroundColor Yellow
Write-Host "   Firebase Console → Authentication → Settings → Authorized Domains" -ForegroundColor Yellow
$domain = $serviceUrl -replace "https://",""
Write-Host "   Add: $domain" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
