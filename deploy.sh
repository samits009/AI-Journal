#!/usr/bin/env bash
set -e

PROJECT_ID="favorable-tree-318603"
SERVICE_NAME="ai-journal"
REGION="us-central1"

echo "============================================================"
echo " Deploying AI Journal to Google Cloud Run"
echo " Project: $PROJECT_ID"
echo " Service: $SERVICE_NAME"
echo " Region:  $REGION"
echo "============================================================"

# Set active gcloud project
echo "Setting GCP project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

# Enable required GCP APIs
echo "Ensuring required GCP APIs are enabled..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project "$PROJECT_ID"

# Prompt for GEMINI_API_KEY if not already set
if [ -z "$GEMINI_API_KEY" ]; then
  read -rsp "Enter your GEMINI_API_KEY (input hidden): " GEMINI_API_KEY
  echo ""
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY is required to deploy."
  exit 1
fi

# Prompt for FIREBASE_API_KEY if not already set
if [ -z "$FIREBASE_API_KEY" ]; then
  read -rsp "Enter your FIREBASE_API_KEY (input hidden): " FIREBASE_API_KEY
  echo ""
fi

if [ -z "$FIREBASE_API_KEY" ]; then
  echo "Error: FIREBASE_API_KEY is required to deploy."
  exit 1
fi

echo "Deploying to Cloud Run using Google Cloud Build..."
gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --source . \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,GEMINI_API_KEY=$GEMINI_API_KEY,FIREBASE_API_KEY=$FIREBASE_API_KEY"

echo ""
echo "============================================================"
echo " Deployment Complete!"
echo " Get your service URL with:"
echo "   gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format='value(status.url)'"
echo ""
echo " IMPORTANT: Copy the service URL and add it to your Firebase"
echo " Authentication -> Settings -> Authorized Domains"
echo "============================================================"
