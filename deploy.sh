#!/usr/bin/env bash
set -e

PROJECT_ID="favorable-tree-318603"
SERVICE_NAME="ai-journal"
REGION="us-central1"

echo "============================================================"
echo " Deploying AI Journal to Google Cloud Run"
echo " Project: $PROJECT_ID  |  Region: $REGION"
echo "============================================================"

# ── Step 1: Set active project ────────────────────────────────
gcloud config set project "$PROJECT_ID"

# ── Step 2: Enable required GCP APIs (including Secret Manager) ──
echo ""
echo "[1/5] Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT_ID"

# ── Step 3: Collect secrets ───────────────────────────────────
echo ""
echo "[2/5] Collecting API keys..."

if [ -z "$GEMINI_API_KEY" ]; then
  read -rsp "Enter your GEMINI_API_KEY (input hidden): " GEMINI_API_KEY
  echo ""
fi
if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY is required."
  exit 1
fi

if [ -z "$FIREBASE_API_KEY" ]; then
  read -rsp "Enter your FIREBASE_API_KEY (input hidden): " FIREBASE_API_KEY
  echo ""
fi
if [ -z "$FIREBASE_API_KEY" ]; then
  echo "Error: FIREBASE_API_KEY is required."
  exit 1
fi

# ── Step 4: Store secrets in Secret Manager ───────────────────
echo ""
echo "[3/5] Storing secrets in Google Cloud Secret Manager..."

store_secret() {
  local secret_name="$1"
  local secret_value="$2"

  # Create the secret if it doesn't exist yet
  if ! gcloud secrets describe "$secret_name" --project "$PROJECT_ID" &>/dev/null; then
    echo "  Creating secret: $secret_name"
    gcloud secrets create "$secret_name" \
      --replication-policy="automatic" \
      --project "$PROJECT_ID"
  fi

  # Add the new secret version
  echo "$secret_value" | gcloud secrets versions add "$secret_name" \
    --data-file=- \
    --project "$PROJECT_ID"

  echo "  ✓ Secret stored: $secret_name"
}

store_secret "gemini-api-key" "$GEMINI_API_KEY"
store_secret "firebase-api-key" "$FIREBASE_API_KEY"

# ── Step 5: Grant Cloud Run service account access to secrets ─
echo ""
echo "[4/5] Granting Cloud Run service account access to secrets..."

# The default Cloud Run service account
SA_EMAIL="${PROJECT_ID//[^0-9]/}" # extract numeric project number
SA_EMAIL_FULL="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"

grant_secret_access() {
  local secret_name="$1"
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --member="serviceAccount:${SA_EMAIL_FULL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project "$PROJECT_ID" \
    --quiet 2>/dev/null || true
  echo "  ✓ Access granted: $secret_name → $SA_EMAIL_FULL"
}

grant_secret_access "gemini-api-key"
grant_secret_access "firebase-api-key"

# ── Step 6: Deploy to Cloud Run using --set-secrets ───────────
echo ""
echo "[5/5] Deploying to Cloud Run (secrets injected from Secret Manager)..."

gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --source . \
  --allow-unauthenticated \
  --labels "dev-tutorial=cloud-run-ai-challenge" \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest,FIREBASE_API_KEY=firebase-api-key:latest"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --format='value(status.url)' \
  --project "$PROJECT_ID")

echo ""
echo "============================================================"
echo " ✅ Deployment Complete!"
echo ""
echo " Service URL: $SERVICE_URL"
echo ""
echo " Secrets stored securely in: Secret Manager"
echo "   • gemini-api-key"
echo "   • firebase-api-key"
echo ""
echo " IMPORTANT: Add the service URL to Firebase Authorized Domains:"
echo "   Firebase Console → Authentication → Settings → Authorized Domains"
echo "   Add: ${SERVICE_URL#https://}"
echo "============================================================"
