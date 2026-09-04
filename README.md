# 📔 AI Journal

> An intelligent, private, full-stack reflective journaling web application powered by **Google Gemini**, built with **React 19**, **TypeScript**, **Tailwind CSS**, and **Node.js/Express**, backed by **Cloud Firestore** and **Firebase Authentication**, deployed on **Google Cloud Run**.

[![Google Cloud Run](https://img.shields.io/badge/Google%20Cloud-Cloud%20Run-4285F4?logo=google-cloud&logoColor=white)](https://cloud.google.com/run)
[![Gemini](https://img.shields.io/badge/Google%20Gen%20AI-Gemini%20API-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev/)

---

## 🌟 Overview & Features

AI Journal empowers users to document daily reflections, track mood trends, and engage in meaningful, context-aware conversations with Google's Gemini AI. Each journal entry maintains its own dedicated chat stream where Gemini acts as an empathetic, constructive companion.

- 🔒 **End-to-End User Isolation & Privacy**: Every entry and conversation is strictly partitioned per user in Cloud Firestore using authenticated user IDs (`userId`).
- 🤖 **Multi-Turn Contextual AI Conversations**: Gemini has full context of the active journal entry (title, content, tags, mood, and past dialogue) to provide thoughtful guidance.
- 🛡️ **Enterprise-Grade Secret Management**: API keys (`GEMINI_API_KEY`, `FIREBASE_API_KEY`) are fetched dynamically from **Google Cloud Secret Manager** or injected via Cloud Run `--set-secrets`.
- ⚡ **Realtime Cloud Firestore Synchronization**: Instant synchronization of entries, reflections, and chat streams across devices.
- 🎨 **Modern, Responsive UI**: Built with React 19, Tailwind CSS, Lucide icons, and Motion for fluid interactions, dark theme aesthetics, and seamless responsiveness.

---

## 🏗️ Architecture & Project Structure

```
AI-Journal/
├── src/                          # Frontend Application (React 19 + TypeScript + Vite)
│   ├── components/
│   │   ├── Auth.tsx              # Firebase Google Auth & Email login/signup
│   │   ├── ChatArea.tsx          # Multi-turn Gemini AI chat interface
│   │   ├── Dashboard.tsx         # Sidebar, entry list, mood filters, search
│   │   ├── EntryEditor.tsx       # Rich journal editor (content, tags, mood)
│   │   └── Navbar.tsx            # Header, user profile, sign out
│   ├── services/
│   │   └── firebase.ts           # Firebase client initialization & auth listener
│   ├── types.ts                  # Shared TypeScript interfaces (JournalEntry, Message)
│   ├── App.tsx                   # Main app component & state management
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Tailwind CSS styles
├── server.ts                     # Backend Server (Express + Google GenAI + Secret Manager)
├── firestore.rules               # Cloud Firestore Security Rules
├── Dockerfile                    # Multi-stage production container build
├── deploy.ps1                    # Automated deployment script for Windows PowerShell
├── deploy.sh                     # Automated deployment script for Linux / macOS / Cloud Shell
├── package.json                  # Dependencies & build scripts
├── vite.config.ts                # Vite configuration & server proxy
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## 🔐 Firestore Security Rules

User data security and privacy are enforced at the database level using Firebase Security Rules. Clients can only read, create, update, or delete entries belonging strictly to their authenticated account.

The project includes `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can access their own journal entries and subcollections
    match /users/{userId}/entries/{entryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Security Model Highlights:
1. **Authentication Enforcement (`request.auth != null`)**: Anonymous/unauthenticated requests are denied.
2. **User Isolation (`request.auth.uid == userId`)**: Users can only access documents under `/users/{their_own_uid}/*`. Cross-user data snooping is prevented at the database kernel.

To deploy security rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```
Or paste the contents of `firestore.rules` directly into the **Firebase Console → Firestore Database → Rules** tab and click **Publish**.

---

## 🚀 Deployment to Google Cloud Run

> [!IMPORTANT]
> **Required Submission Label**: The Cloud Run service **must** be labeled with `dev-tutorial=cloud-run-ai-challenge` for automated verification. Both automated deploy scripts (`deploy.ps1` and `deploy.sh`) automatically apply this label.

### Option 1: One-Click Automated Deployment

#### On Windows (PowerShell):
```powershell
.\deploy.ps1
```

#### On Linux / macOS / Google Cloud Shell:
```bash
chmod +x deploy.sh
./deploy.sh
```

Both scripts automatically:
1. Enable the required GCP APIs (`run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `secretmanager.googleapis.com`).
2. Securely prompt for your `GEMINI_API_KEY` and `FIREBASE_API_KEY` without echoing them.
3. Store secrets in **Google Cloud Secret Manager**.
4. Grant the default Cloud Run service account the `roles/secretmanager.secretAccessor` role.
5. Deploy the container to Cloud Run with:
   - Public access enabled (`--allow-unauthenticated`)
   - Secret Manager bindings (`--set-secrets`)
   - **Verification Label**: `--labels dev-tutorial=cloud-run-ai-challenge`

---

### Option 2: Manual Deployment via `gcloud` CLI

#### 1. Set Project and Region
```bash
PROJECT_ID="favorable-tree-318603"
REGION="us-central1"
SERVICE_NAME="ai-journal"

gcloud config set project $PROJECT_ID
```

#### 2. Enable Required APIs
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project $PROJECT_ID
```

#### 3. Create Secrets in Secret Manager
```bash
# Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project $PROJECT_ID

# Firebase Web API Key
echo -n "YOUR_FIREBASE_API_KEY" | gcloud secrets create firebase-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project $PROJECT_ID
```

#### 4. Grant Secret Access to Cloud Run Service Account
```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA_EMAIL="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project $PROJECT_ID

gcloud secrets add-iam-policy-binding firebase-api-key \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --project $PROJECT_ID
```

#### 5. Deploy to Cloud Run with Mandatory Challenge Label
```bash
gcloud run deploy $SERVICE_NAME \
  --project $PROJECT_ID \
  --region $REGION \
  --source . \
  --allow-unauthenticated \
  --labels "dev-tutorial=cloud-run-ai-challenge" \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest,FIREBASE_API_KEY=firebase-api-key:latest"
```

#### 6. If Service is Already Deployed: Update Label
If your service is already deployed and you only need to ensure the verification label is applied:
```bash
gcloud run services update ai-journal \
  --region us-central1 \
  --project favorable-tree-318603 \
  --update-labels dev-tutorial=cloud-run-ai-challenge
```

#### 7. Retrieve Live Cloud Run URL
```bash
gcloud run services describe ai-journal \
  --region us-central1 \
  --project favorable-tree-318603 \
  --format="value(status.url)"
```

---

## 🌐 Post-Deployment: Configure Firebase Authorized Domains

After your Cloud Run service is deployed:
1. Copy your Cloud Run service domain (e.g. `ai-journal-xxx-uc.a.run.app`).
2. Go to **[Firebase Console](https://console.firebase.google.com/)** → Select Project → **Authentication** → **Settings** tab.
3. Under **Authorized domains**, click **Add domain**.
4. Paste your Cloud Run domain (`ai-journal-xxx-uc.a.run.app`) and save.

---

## 💻 Local Development

### 1. Prerequisites
- Node.js 20+
- npm or bun
- A Google Gemini API key ([Google AI Studio](https://aistudio.google.com/))
- A Firebase project with Authentication (Google / Email) and Cloud Firestore enabled

### 2. Setup Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY="your-gemini-api-key"
FIREBASE_API_KEY="your-firebase-web-api-key"
PORT=8080
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### 5. Build and Test Production Bundle Locally
```bash
npm run build
npm start
```

---

## 📋 Submission Checklist Verification

- [x] **Live Cloud Run URL**: Publicly accessible, containerized web service.
- [x] **Verification Label**: `dev-tutorial=cloud-run-ai-challenge` configured on Cloud Run service and scripted in `deploy.ps1` and `deploy.sh`.
- [x] **Public Git Repository**: Frontend + backend source code included.
- [x] **`README.md`**: Complete architectural overview, step-by-step deployment guide, and local development instructions.
- [x] **Firestore Security Rules**: Documented in `README.md` and included in [`firestore.rules`](file:///firestore.rules).
