# Quick Demo: Enhanced List Asset Features

## 🎯 Feature 1: Google Places Autocomplete

### Steps to Test:

1. **Navigate to List Asset**
   - URL: `/list-asset`
   - Make sure wallet is connected

2. **Try Location Search**
   ```
   Start typing: "Empire State Building"
   ↓
   See dropdown with suggestions
   ↓
   Click: "Empire State Building, New York, NY, USA"
   ↓
   ✓ See: "Location confirmed: New York, United States (Lat: 40.748817, Lng: -73.985428)"
   ```

3. **Try Another Location**
   ```
   Type: "Taj Mahal"
   Select: "Taj Mahal, Agra, Uttar Pradesh, India"
   ✓ See: "Location confirmed: Agra, India (Lat: 27.175145, Lng: 78.042142)"
   ```

---

## 🎯 Feature 2: Auto-Calculating Prices

### Demo Scenario 1: "I know total price"

```
Field: Total Supply
Enter: 10000

Field: Total Offering Price  
Enter: 5000000

Result:
  ✅ Price Per Token auto-fills: $500.00
  ✅ Summary shows:
      Total Tokens: 10,000
      Price Per Token: $500.00
      Total Offering Value: $5,000,000
```

### Demo Scenario 2: "I know price per token"

```
Field: Total Supply
Enter: 10000

Field: Price Per Token
Enter: 500

Result:
  ✅ Total Offering Price auto-fills: $5000000.00
  ✅ Same summary appears
```

### Demo Scenario 3: "I want to change supply"

```
Starting with: 10,000 tokens @ $500 each = $5M total

Change Total Supply to: 20000

Result:
  ✅ Price Per Token recalculates: $250.00
  ✅ Total stays: $5,000,000
  
  OR (if you entered price first):
  ✅ Total Price recalculates: $10,000,000
  ✅ Price Per Token stays: $500.00
```

---

## 📊 Visual Comparison

### Before
```
Location: [Text input: "Mumbai, India"]
❌ No verification
❌ No coordinates
❌ Typos possible

Pricing:
  Total Supply: [10000]
  Price/Token: [500]
  
  Manual calculation: 10,000 × $500 = ?
```

### After
```
Location: [Google Autocomplete: "Mumbai, Maharashtra, India"]
✅ Verified address
✅ GPS: 19.076090, 72.877426
✅ Auto-complete, no typos

Pricing:
  Total Supply: [10000]
  
  [Blue Card: "Auto-Calculate Pricing"]
  Total Price: [5000000] → auto-calculates Price/Token
     OR
  Price/Token: [500] → auto-calculates Total Price
  
  [Green Summary Card]
  ✓ Total Tokens: 10,000
  ✓ Price Per Token: $500.00
  ✓ Total Offering: $5,000,000
```

---

## 🎬 Complete Walkthrough

### Create Asset: "Luxury Beach Villa"

**Step 1: Asset Details**
```
Asset Name: Luxury Beach Villa
Asset Type: Real Estate
Location: Start typing "Candolim Beach, Goa"
         → Select "Candolim Beach Road, Goa, India"
         ✓ Confirmed: Goa, India (Lat: 15.518717, Lng: 73.762161)

Description: Beachfront villa with private pool...
Valuation: 10000000
Currency: USD
```

**Step 2: Tokenization**
```
Token Name: Goa Beach Villa Token
Token Symbol: GBVILLA
Total Supply: 20000

[Choose your approach]

Option A: Know total price
  Total Offering Price: 10000000
  → Price Per Token auto-fills: $500.00

Option B: Know price per token  
  Price Per Token: 500
  → Total Offering Price auto-fills: $10000000.00

✅ Summary Card Shows:
    20,000 tokens × $500 = $10,000,000
```

**Step 3: Documents**
```
Upload title deed, valuation, legal opinion...
```

**Step 4: Declaration**
```
✓ I confirm ownership
✓ I confirm accuracy
✓ I confirm compliance
```

**Submit** → Asset goes to approval queue with:
- Verified location coordinates
- Calculated tokenization structure
- All data validated

---

## 💡 Pro Tips

### Location Selection
- Type specific landmarks for best results
- Select from dropdown (don't just type and move on)
- Look for green confirmation message
- Coordinates auto-save for blockchain storage

### Price Calculation
- Start with the number you know (price OR total)
- System calculates the other automatically
- Change supply anytime - prices adjust instantly
- Watch the green summary card for confirmation

### Validation
- Step 1 requires location selection (not just typed text)
- Step 2 validates either pricePerToken OR totalPrice exists
- All calculations rounded to 2 decimals for USD

---

## 🐛 Common Issues

**"Location not confirmed"**
- Solution: Select from dropdown, don't just type

**"Price not calculating"**
- Solution: Enter Total Supply first (required)

**"API key error"**
- Solution: Admin needs to configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

---

## 🚀 What This Enables

**For Asset Owners:**
- Submit properties with GPS-verified locations
- No math errors in tokenization
- Professional presentation to investors

**For Investors:**
- Trust location data (Google-verified)
- Clear tokenization structure
- No confusion about pricing

**For Platform:**
- High-quality data for listings
- Map integration ready (lat/lng stored)
- Reduced submission errors
