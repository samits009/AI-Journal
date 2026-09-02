# PowerShell deployment script for Google Cloud Run
$ErrorActionPreference = "Stop"

$PROJECT_ID = "favorable-tree-318603"
$SERVICE_NAME = "ai-journal"
$REGION = "us-central1"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Deploying AI Journal to Google Cloud Run" -ForegroundColor Cyan
Write-Host " Project: $PROJECT_ID" -ForegroundColor Yellow
Write-Host " Service: $SERVICE_NAME" -ForegroundColor Yellow
Write-Host " Region:  $REGION" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "gcloud CLI is not installed or not in your PATH. Please install the Google Cloud SDK or run this from Google Cloud Shell."
    exit 1
}

# Set active gcloud project
Write-Host "Setting GCP project to $PROJECT_ID..." -ForegroundColor Green
gcloud config set project $PROJECT_ID

# Enable required GCP APIs
Write-Host "Ensuring required GCP APIs are enabled..." -ForegroundColor Green
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project $PROJECT_ID

# Get GEMINI_API_KEY
$geminiApiKey = $env:GEMINI_API_KEY
if (-not $geminiApiKey) {
    $secKey = Read-Host "Enter your GEMINI_API_KEY" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secKey)
    $geminiApiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
}

if (-not $geminiApiKey) {
    Write-Error "GEMINI_API_KEY is required to deploy."
    exit 1
}

# Get FIREBASE_API_KEY
$firebaseApiKey = $env:FIREBASE_API_KEY
if (-not $firebaseApiKey) {
    $secKey2 = Read-Host "Enter your FIREBASE_API_KEY" -AsSecureString
    $bstr2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secKey2)
    $firebaseApiKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr2)
}

if (-not $firebaseApiKey) {
    Write-Error "FIREBASE_API_KEY is required to deploy."
    exit 1
}

Write-Host "Deploying to Cloud Run using Google Cloud Build..." -ForegroundColor Green
gcloud run deploy $SERVICE_NAME `
    --project $PROJECT_ID `
    --region $REGION `
    --source . `
    --allow-unauthenticated `
    --set-env-vars "NODE_ENV=production,GEMINI_API_KEY=$geminiApiKey,FIREBASE_API_KEY=$firebaseApiKey"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host " IMPORTANT: Add your new Cloud Run service URL to your Firebase" -ForegroundColor Yellow
Write-Host " Authentication -> Settings -> Authorized Domains" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
