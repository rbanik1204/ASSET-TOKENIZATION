# Google Maps API Setup Guide

## 🔑 Get Your API Key

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Project name: `Asset Tokenization Platform`
4. Click **Create**

### Step 2: Enable Required APIs

1. In the dashboard, go to **APIs & Services** → **Library**
2. Enable these APIs:
   - ✅ **Places API**
   - ✅ **Maps JavaScript API**
   - ✅ **Geocoding API**

### Step 3: Create API Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **API Key**
3. Copy the generated API key
4. Click **Edit API key** to configure restrictions

### Step 4: Restrict API Key (Security)

#### Application Restrictions
Select: **HTTP referrers (web sites)**

Add these referrers:
```
https://asset-linked-c4ef2.web.app/*
https://asset-linked-c4ef2.firebaseapp.com/*
http://localhost:3000/*
```

#### API Restrictions
Select: **Restrict key**

Select these APIs:
- ✅ Places API
- ✅ Maps JavaScript API
- ✅ Geocoding API

Click **Save**

---

## 🔧 Configure Your Project

### Add to Environment File

**File:** `apps/frontend/.env.local`

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBfX0z3OTwsjveFSrV32qSumParIhJpHy4
```

Replace `AIzaSyBfX0z3OTwsjveFSrV32qSumParIhJpHy4` with your actual key.

### Restart Development Server

```bash
cd apps/frontend
npm run dev
```

---

## 💰 Pricing & Limits

### Free Tier (Generous)

#### Places Autocomplete
- **Monthly Free**: 1,000 requests
- **Cost After**: $0.017 per request
- **Per-second Limit**: 1,000 requests

#### Geocoding API
- **Monthly Free**: 40,000 requests
- **Cost After**: $0.005 per request

### Expected Usage

For typical asset tokenization platform:
- **~5 autocomplete requests per asset** (user typing)
- **1 geocode request per asset** (final selection)
- **100 assets/month** = ~600 requests total
- **Cost**: $0 (well within free tier)

### Enable Billing (Required)

Even though you're in free tier, Google requires billing to be enabled:

1. Go to **Billing** in Google Cloud Console
2. Click **Link a billing account**
3. Enter payment information
4. Set billing alert at $10/month (safety net)

**Note:** You won't be charged unless you exceed free tier limits.

---

## ✅ Verify Setup

### Test in Browser Console

Open browser DevTools and run:

```javascript
// Check if API loaded
console.log(window.google?.maps?.places ? 'Places API loaded ✓' : 'Not loaded ✗');
```

### Test on List Asset Page

1. Go to `/list-asset`
2. In location field, start typing: `"New York"`
3. ✅ Should see dropdown with suggestions
4. ✅ Select location and see confirmation with coordinates

---

## 🐛 Troubleshooting

### Error: "This API project is not authorized..."

**Cause:** Domain not in HTTP referrers list

**Solution:**
1. Go to Credentials → Edit API key
2. Add your domain to HTTP referrers
3. For local dev: Add `http://localhost:3000/*`

### Error: "ApiNotActivatedMapError"

**Cause:** Required API not enabled

**Solution:**
1. Go to APIs & Services → Library
2. Search for the missing API
3. Click **Enable**

### Error: "REQUEST_DENIED"

**Cause:** Billing not enabled or API key restrictions too strict

**Solution:**
1. Enable billing in Google Cloud
2. Check API restrictions allow Places/Maps/Geocoding
3. Verify domain restrictions

### "Loading location search..." Forever

**Cause:** API key not found or invalid

**Solution:**
1. Check `.env.local` has correct key
2. Verify key format: `AIzaSy...` (39 characters)
3. Restart development server
4. Clear browser cache

### No Autocomplete Suggestions

**Cause:** JavaScript API not loaded properly

**Solution:**
1. Check browser console for errors
2. Verify internet connection
3. Try clearing cookies/cache
4. Check API key restrictions

---

## 🔒 Security Best Practices

### ✅ DO

- Use HTTP referrer restrictions
- Restrict to specific APIs only
- Set up billing alerts ($10/month)
- Monitor usage in Google Cloud Console
- Rotate API keys periodically (every 6 months)

### ❌ DON'T

- Share API key in public repos (use `.env.local`)
- Use unrestricted API keys in production
- Skip billing setup (required by Google)
- Forget to add production domain to referrers

---

## 📊 Monitor Usage

### Google Cloud Console

1. Go to **APIs & Services** → **Dashboard**
2. View requests per API
3. Check quota usage
4. Set up alerts

### Example Dashboard View
```
Places API (New)
├─ Requests (7 days): 247
├─ Quota usage: 24.7% of free tier
└─ Estimated cost: $0.00

Maps JavaScript API
├─ Requests (7 days): 183
└─ Estimated cost: $0.00

Geocoding API
├─ Requests (7 days): 52
└─ Estimated cost: $0.00
```

---

## 🚀 Production Deployment

### Before Deploying

1. ✅ Update HTTP referrers with production domain
2. ✅ Verify billing is enabled
3. ✅ Test on staging environment
4. ✅ Set up monitoring alerts

### Add Production Domain

In Google Cloud Console → Credentials:
```
HTTP referrers:
  https://asset-linked-c4ef2.web.app/*
  https://asset-linked-c4ef2.firebaseapp.com/*
  https://your-custom-domain.com/*
```

### Environment Variables

**Firebase Hosting:**

In `.env.production`:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

Or use Firebase Functions Config:
```bash
firebase functions:config:set google.maps_key="AIzaSy..."
```

---

## 🆘 Support

### Official Resources

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Places API Guide](https://developers.google.com/maps/documentation/places/web-service/overview)
- [Billing Guide](https://developers.google.com/maps/billing/understanding-cost-of-use)
- [Google Cloud Support](https://cloud.google.com/support)

### Common Questions

**Q: Do I need a credit card?**
A: Yes, even for free tier. You won't be charged unless you exceed limits.

**Q: Can I use one API key for multiple projects?**
A: Technically yes, but not recommended. Create separate keys for better security and monitoring.

**Q: What happens if I exceed free tier?**
A: You'll be charged automatically. Set billing alerts to avoid surprises.

**Q: Can I use this for commercial projects?**
A: Yes, Google Maps Platform is designed for commercial use.

---

## ✨ Summary

**Setup Time:** ~10 minutes

**Steps:**
1. ✅ Create Google Cloud project
2. ✅ Enable 3 APIs (Places, Maps, Geocoding)
3. ✅ Create API key
4. ✅ Restrict key (HTTP referrers + API restrictions)
5. ✅ Add key to `.env.local`
6. ✅ Enable billing (free tier sufficient)
7. ✅ Test on `/list-asset` page

**Result:** Professional location search with GPS coordinates! 🗺️
