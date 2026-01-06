# 🚀 Deployment Checklist - Asset Tokenization Platform

## Pre-Deployment Checklist

### 1. Environment Configuration ✅
- [ ] WalletConnect Project ID added to `.env.local`
- [ ] All contract addresses configured
- [ ] API URLs configured (if using backend)
- [ ] Environment variables documented

### 2. Smart Contract Integration 🔗
- [ ] Smart contracts deployed to network
- [ ] Contract addresses verified on block explorer
- [ ] ABI fragments or full ABIs updated in `apps/frontend/src/config/contracts.ts`
- [ ] Contract functions tested on testnet
- [ ] Gas limits optimized

### 3. Data Integration 📊
- [ ] Mock data replaced with real blockchain calls
- [ ] API endpoints implemented (if using)
- [ ] Data fetching hooks implemented
- [ ] Error handling added for failed requests
- [ ] Loading states properly shown

### 4. Testing 🧪

#### Functionality Testing
- [ ] Wallet connection works (MetaMask, WalletConnect)
- [ ] Network switching works
- [ ] Asset listing loads from blockchain
- [ ] Asset detail page shows correct data
- [ ] Trading (buy/sell) transactions work
- [ ] Portfolio updates after trades
- [ ] Income claiming works
- [ ] Admin approval/rejection works

#### UI/UX Testing
- [ ] All pages load without errors
- [ ] Navigation works correctly
- [ ] Responsive design on mobile
- [ ] Responsive design on tablet
- [ ] Loading states display properly
- [ ] Error messages are user-friendly
- [ ] Success messages confirm actions

#### Security Testing
- [ ] No private keys in code
- [ ] Environment variables not committed
- [ ] Transaction confirmation required
- [ ] Price impact warnings shown
- [ ] Slippage protection works
- [ ] Admin access properly restricted

### 5. Performance Optimization ⚡
- [ ] Build completes without warnings
- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] Lazy loading implemented where needed
- [ ] No console errors in production

### 6. Browser Compatibility 🌐
- [ ] Chrome tested
- [ ] Firefox tested
- [ ] Safari tested
- [ ] Edge tested
- [ ] Mobile browsers tested

### 7. Documentation 📚
- [ ] README.md complete
- [ ] Environment variables documented
- [ ] Setup instructions clear
- [ ] API documentation (if applicable)
- [ ] Known issues documented

## Production Deployment Steps

## Local Development (Single Command)

```bash
cd "c:\Asset Tokenization"
npm run dev:local
```

This starts Anvil, deploys contracts, merges deployed addresses into `apps/frontend/.env.local`, and runs the frontend at `http://localhost:3000`.

### Option 1: Vercel (Recommended)

#### Step 1: Prepare Repository
```bash
cd "c:\Asset Tokenization"
git init
git add .
git commit -m "Initial commit"
```

#### Step 2: Push to GitHub
```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/asset-tokenization.git
git push -u origin main
```

#### Step 3: Deploy to Vercel
1. Go to https://vercel.com
2. Click "Import Project"
3. Select your GitHub repository
4. Configure:
   - Framework Preset: **Next.js**
   - Root Directory: `apps/frontend`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add Environment Variables:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - `NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS`
   - `NEXT_PUBLIC_PRIMARY_SALE_ADDRESS`
   - `NEXT_PUBLIC_PLATFORM_FEE_CONTROLLER_ADDRESS`
   - `NEXT_PUBLIC_ORACLE_PRICE_FEED_ADDRESS`
   - `NEXT_PUBLIC_PROOF_OF_RESERVE_ADDRESS`
   - `NEXT_PUBLIC_AMM_POOL_ADDRESS` (optional; per-token pool)
6. Click "Deploy"

#### Step 4: Verify Deployment
- [ ] Site loads at Vercel URL
- [ ] Wallet connection works
- [ ] All pages accessible
- [ ] Transactions work on mainnet/testnet

### Option 2: Netlify

> Note: Netlify deploys are only viable for static exports. This project uses Next.js API routes, so prefer Vercel or Firebase.

#### Step 1: Build Application
```bash
cd "c:\Asset Tokenization\apps\frontend"
npm run build
```

#### Step 2: Deploy to Netlify
1. Go to https://netlify.com
2. Drag and drop `out` folder (after export)
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. Add environment variables in Netlify dashboard

### Option 3: Custom Server

### Option 4: Firebase (Recommended if you want Firebase-managed hosting)

This repo includes a basic Firebase Hosting config in [firebase.json](firebase.json) pointing at `apps/frontend`.

**Choose one:**
- **Firebase App Hosting (best for full-stack Next.js/SSR):** Recommended by Firebase for full-stack Next.js apps.
- **Framework-aware Firebase Hosting (preview):** Firebase CLI deploys SSR/server logic to Cloud Functions.

#### Step 1: Install Firebase CLI + login
```bash
npm install -g firebase-tools
firebase login
```

#### Step 2: Link your Firebase project
```bash
firebase use --add
```

Then replace `__FIREBASE_PROJECT_ID__` in [.firebaserc](.firebaserc) with your real Firebase project id.

#### Step 3A: Deploy with Firebase App Hosting (recommended)

Create an App Hosting backend (Console or CLI) and point it at this repo + branch.
For monorepos, configure App Hosting to use the `apps/frontend` directory.

#### Step 3B: Deploy with framework-aware Firebase Hosting (preview)

Enable the web frameworks preview and initialize hosting:
```bash
firebase experiments:enable webframeworks
firebase init hosting
```

During prompts:
- “Do you want to use a web framework?” → **Yes**
- Select **Next.js**
- Source directory → `apps/frontend`

Deploy:
```bash
firebase deploy
```

#### Step 1: Build for Production
```bash
cd "c:\Asset Tokenization\apps\frontend"
npm run build
```

#### Step 2: Set Up Server
```bash
# Install PM2 for process management
npm install -g pm2

# Start application
pm2 start npm --name "asset-tokenization" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

#### Step 3: Configure Nginx (Optional)
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Post-Deployment Checklist

### Immediate Verification ✓
- [ ] Application loads successfully
- [ ] SSL certificate active (HTTPS)
- [ ] Wallet connection functional
- [ ] Network detection working
- [ ] Assets loading from blockchain
- [ ] Transactions executing successfully

### Monitoring Setup 📊
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Analytics configured (Google Analytics, etc.)
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Transaction monitoring setup

### Security Hardening 🔒
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Rate limiting implemented (if needed)
- [ ] DDoS protection active

### SEO & Marketing 🎯
- [ ] Meta tags configured
- [ ] Open Graph tags added
- [ ] Sitemap generated
- [ ] robots.txt configured
- [ ] Google Search Console verified

## Rollback Plan 🔄

If deployment fails:

1. **Identify Issue**
   - Check Vercel/Netlify logs
   - Check browser console
   - Review error messages

2. **Quick Fixes**
   - Update environment variables
   - Re-deploy with fixes
   - Clear cache and redeploy

3. **Rollback Steps**
   - Vercel: Click "Rollback" on previous deployment
   - Netlify: Click "Publish Deploy" on previous version
   - Custom: `git revert` and redeploy

## Network-Specific Configurations

### Mainnet Deployment
- [ ] Mainnet contract addresses configured
- [ ] Mainnet RPC endpoints configured
- [ ] Transaction fees acceptable
- [ ] Gas limit tested with real transactions
- [ ] Fallback RPC endpoints configured

### Testnet Deployment (Recommended First)
- [ ] Sepolia contract addresses configured
- [ ] Test tokens available
- [ ] Faucet links documented
- [ ] Testing guide created

## Monitoring & Maintenance

### Daily Tasks
- [ ] Check error logs
- [ ] Monitor transaction success rate
- [ ] Review user feedback

### Weekly Tasks
- [ ] Review analytics
- [ ] Check performance metrics
- [ ] Update documentation if needed

### Monthly Tasks
- [ ] Security audit
- [ ] Dependency updates
- [ ] Performance optimization review
- [ ] User experience improvements

## Emergency Contacts

### Technical Issues
- Vercel Support: https://vercel.com/support
- WalletConnect: https://discord.gg/walletconnect
- wagmi: https://github.com/wagmi-dev/wagmi/issues

### Blockchain Issues
- Etherscan: https://etherscan.io/contactus
- Infura: https://infura.io/support

## Success Metrics

Track these post-deployment:
- [ ] Uptime > 99.9%
- [ ] Page load time < 3s
- [ ] Transaction success rate > 95%
- [ ] User wallet connection rate
- [ ] Active users
- [ ] Total value locked (TVL)

---

## 🎉 Deployment Complete!

Once all items are checked, your Asset Tokenization Platform is live!

### Next Steps After Launch:
1. Monitor first 24 hours closely
2. Gather user feedback
3. Plan feature iterations
4. Scale infrastructure as needed

**Remember**: Start with testnet, verify everything, then deploy to mainnet!

Good luck! 🚀
