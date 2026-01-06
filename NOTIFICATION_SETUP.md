# 📧 Real Email & SMS Notification System

## ✅ What's Been Implemented

### 1. **Notification Service** (`src/services/notification.service.ts`)
- ✅ SendGrid integration for email notifications
- ✅ Twilio integration for SMS notifications
- ✅ Beautiful HTML email templates for all events
- ✅ SMS templates with concise messages
- ✅ Configuration validation

### 2. **Notification API** (`src/app/api/notifications/send/route.ts`)
- ✅ POST endpoint to send notifications
- ✅ GET endpoint to check service status
- ✅ Error handling and validation

### 3. **Blockchain Event Monitor** (`src/services/event-monitor.service.ts`)
- ✅ Real-time blockchain event listener
- ✅ Automatically triggers notifications for:
  - Asset Approved (TokenRegistered event)
  - Tokens Purchased (TokensPurchased event)
  - Income Deposited (IncomeDeposited event)
- ✅ Fetches metadata to get contact details
- ✅ Respects notification consent

### 4. **List Asset Form Updates**
- ✅ Optional email field
- ✅ Optional phone field
- ✅ Notification consent checkbox (required if contact provided)
- ✅ Contact details stored in metadata
- ✅ Web3 UX compliant (wallet = identity)

---

## 🚀 Setup Instructions

### Step 1: Get SendGrid API Key (Email)

1. Go to [SendGrid](https://app.sendgrid.com/)
2. Sign up or log in
3. Navigate to **Settings → API Keys**
4. Click **Create API Key**
5. Name it "Asset Tokenization"
6. Choose **Full Access**
7. Copy the API key

### Step 2: Get Twilio Credentials (SMS)

1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up or log in
3. Get your **Account SID** and **Auth Token** from the dashboard
4. Buy a phone number:
   - Navigate to **Phone Numbers → Buy a Number**
   - Choose a number with SMS capability
   - Complete purchase

### Step 3: Configure Environment Variables

Update `.env.local` with your credentials:

```env
# SendGrid Email Service
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio SMS Service
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

**Important:** Replace placeholder values with your actual credentials!

### Step 4: Verify Sender Email (SendGrid)

1. In SendGrid dashboard, go to **Settings → Sender Authentication**
2. Verify your sender email or domain
3. Use the verified email in `SENDGRID_FROM_EMAIL`

---

## 🏃 Running the System

### Option 1: Development Mode (Recommended)

Start the Next.js app and event monitor separately:

**Terminal 1 - Next.js App:**
```bash
cd apps/frontend
npm run dev
```

**Terminal 2 - Event Monitor:**
```bash
cd apps/frontend
npx tsx src/services/event-monitor.service.ts
```

### Option 2: Production Mode

The event monitor should run as a background service:

```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start src/services/event-monitor.service.ts --name event-monitor

# Or using nohup
nohup npx tsx src/services/event-monitor.service.ts &
```

---

## 🧪 Testing the System

### Test Notification API

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ASSET_APPROVED",
    "recipientEmail": "test@example.com",
    "recipientPhone": "+15551234567",
    "data": {
      "assetName": "Luxury Villa",
      "tokenAddress": "0x1234..."
    }
  }'
```

### Check Service Status

```bash
curl http://localhost:3000/api/notifications/send
```

Response should show:
```json
{
  "configured": {
    "email": true,
    "sms": true
  },
  "message": "Notification service status"
}
```

---

## 📋 Notification Flow

### When User Lists Asset:

1. **User connects wallet** → Wallet = identity ✓
2. **User fills asset details** → Required fields
3. **User optionally provides**:
   - Email address
   - Mobile number
4. **User checks consent** → Required if contact provided
5. **Submit asset** → Contact details saved in metadata

### When Events Happen:

#### Asset Approved:
- Event monitor detects `TokenRegistered` event
- Fetches metadata to get owner's contact info
- If consent = true → Sends email + SMS
- ✉️ Email: "Asset Approved for Tokenization"
- 📱 SMS: "Your asset has been approved"

#### Tokens Purchased:
- Event monitor detects `TokensPurchased` event
- Fetches token owner's metadata
- If consent = true → Sends email + SMS
- ✉️ Email: "New Token Purchase"
- 📱 SMS: "X tokens purchased from your asset"

#### Income Deposited:
- Event monitor detects `IncomeDeposited` event
- Fetches token owner's metadata
- If consent = true → Sends email + SMS
- ✉️ Email: "Income Deposited"
- 📱 SMS: "Income deposited, claim it now"

---

## 🔒 Privacy & Compliance

✅ **Opt-in only**: Contact fields are optional
✅ **Explicit consent**: Checkbox required for notifications
✅ **Wallet-first**: All notifications also appear in-app
✅ **No mandatory email/phone**: Web3 UX preserved
✅ **Data stored on IPFS**: Contact info in metadata

---

## 📊 Notification Templates

### Email Templates (HTML)
- ✅ Professional design
- ✅ Asset details included
- ✅ Direct links to platform
- ✅ Branded colors

### SMS Templates
- ✅ Concise (under 160 characters)
- ✅ Clear action items
- ✅ Asset name included
- ✅ No spam language

---

## 🐛 Troubleshooting

### Email not sending?
1. Check `SENDGRID_API_KEY` is correct
2. Verify sender email in SendGrid dashboard
3. Check SendGrid activity feed for errors

### SMS not sending?
1. Verify Twilio credentials
2. Check phone number has SMS capability
3. Ensure recipient number includes country code (+1, +91, etc.)
4. Check Twilio console for delivery status

### Event monitor not detecting events?
1. Ensure contracts are deployed on Sepolia
2. Check `NEXT_PUBLIC_SEPOLIA_RPC_URL` is working
3. Verify contract addresses in `config/contracts.ts`
4. Check console logs for errors

---

## 💰 Cost Estimation

### SendGrid (Email):
- **Free tier**: 100 emails/day forever
- **Paid**: $19.95/month for 50,000 emails

### Twilio (SMS):
- **Pay-as-you-go**: ~$0.0075 per SMS (US)
- **No monthly fee**: Only pay for what you use
- **Estimate**: 1,000 SMS = ~$7.50

### Total Monthly Cost (Small Scale):
- Emails: $0 (free tier)
- SMS: $7.50 (if 1,000 notifications)
- **Total**: ~$7.50/month

---

## 🎯 Next Steps

1. ✅ Get API keys from SendGrid and Twilio
2. ✅ Configure `.env.local` with real credentials
3. ✅ Start event monitor in background
4. ✅ Test with real asset submission
5. ✅ Monitor SendGrid/Twilio dashboards
6. ✅ Deploy to production

---

## 📞 Support

If you encounter issues:
1. Check `.env.local` has correct API keys
2. Review console logs for error messages
3. Test API endpoint with curl
4. Check SendGrid/Twilio dashboards for delivery status

**This system is PRODUCTION-READY** once you add your API keys! 🚀
