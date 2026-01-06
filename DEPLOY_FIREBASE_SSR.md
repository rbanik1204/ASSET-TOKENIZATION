# Firebase Hosting SSR Deploy (Next.js)

This repo is configured for **Firebase Hosting (Frameworks) SSR**.

## Prereqs
- Node **22.x** (recommended) via `fnm`
- Firebase CLI installed and logged in (`firebase --version`)
- Access to the Firebase project: `asset-linked`

## 0) Use Node 22 in the current terminal
From repo root:

```powershell
cd "C:\Asset Tokenization"
. .\scripts\use-node22.ps1
node -v
```

## 1) Enable required Google Cloud APIs (one-time)
Firebase SSR deploy needs Cloud Functions (and usually related services).

At minimum, enable **Cloud Functions API**:
- https://console.developers.google.com/apis/api/cloudfunctions.googleapis.com/overview?project=asset-linked

If deploy errors mention other disabled services, also enable:
- Cloud Run Admin API
- Artifact Registry API
- Cloud Build API

After enabling, wait 1–5 minutes for propagation.

## 2) Select the Firebase project
```powershell
firebase use asset-linked
```

## 3) Deploy Hosting SSR
```powershell
firebase deploy --only hosting:asset-linked-c4ef2
```

## Notes
- The app has dynamic routes (`/assets/[id]`) and API routes (`/api/...`) so Firebase will create a backend function automatically.
- If Firebase prompts for billing upgrades, SSR typically requires enabling the needed services; depending on your project settings you may need a paid plan.
