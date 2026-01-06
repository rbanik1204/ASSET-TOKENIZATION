# Deploy TokenFactory Contract - Quick Guide

## Option 1: Using Remix IDE (Easiest - No Setup Required)

### Step 1: Open Remix
Go to: **https://remix.ethereum.org**

### Step 2: Create the Contract
1. In the File Explorer (left sidebar), create a new file: `TokenFactory.sol`
2. Copy and paste the following code:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleAssetToken is ERC20 {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals_,
        address owner
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        _mint(owner, initialSupply);
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}

contract TokenFactory {
    event TokenCreated(
        address indexed token,
        string name,
        string symbol,
        uint256 initialSupply,
        address indexed owner
    );
    
    mapping(address => address[]) public userTokens;
    address[] public allTokens;
    
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals
    ) external returns (address token) {
        SimpleAssetToken newToken = new SimpleAssetToken(
            name,
            symbol,
            initialSupply,
            decimals,
            msg.sender
        );
        
        token = address(newToken);
        userTokens[msg.sender].push(token);
        allTokens.push(token);
        
        emit TokenCreated(token, name, symbol, initialSupply, msg.sender);
    }
    
    function getUserTokens(address user) external view returns (address[] memory) {
        return userTokens[user];
    }
    
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
}
```

### Step 3: Compile
1. Click on the "Solidity Compiler" icon (3rd icon in left sidebar)
2. Select compiler version: **0.8.20** or higher
3. Click **"Compile TokenFactory.sol"**
4. Wait for green checkmark ✅

### Step 4: Deploy
1. Click "Deploy & Run Transactions" icon (4th icon)
2. **Environment**: Select "Injected Provider - MetaMask"
3. Confirm MetaMask connection
4. Make sure MetaMask is on **Sepolia Test Network**
5. **⚠️ IMPORTANT**: In the **Contract** dropdown, select **"TokenFactory"** (NOT "SimpleAssetToken")
6. **Leave the deploy parameters empty** (TokenFactory has no constructor arguments)
7. Click **"Deploy"** (orange button)
8. Confirm transaction in MetaMask
9. Wait ~12 seconds for confirmation

**Note**: If you see "SimpleAssetToken" selected by default, click the dropdown and change it to "TokenFactory". You should NOT deploy SimpleAssetToken directly - it's only used internally by the factory.

### Step 5: Copy the Address
1. After deployment, look in "Deployed Contracts" section (bottom)
2. You'll see: `TOKENFACTORY AT 0x...`
3. Click the copy icon to copy the address

### Step 6: Update Frontend Config
Open PowerShell and run:

```powershell
cd "c:\Asset Tokenization\apps\frontend"
Add-Content .env.local "`nNEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_SEPOLIA=0xYOUR_ADDRESS_HERE"
Add-Content .env.local "NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0xYOUR_ADDRESS_HERE"
```

(Replace `0xYOUR_ADDRESS_HERE` with the actual address)

---

## Option 2: Using Command Line (Requires Docker)

### Prerequisites
1. Docker Desktop running
2. Private key with Sepolia ETH

### Steps

```powershell
cd "c:\Asset Tokenization\contracts"

# Set environment variables
$env:PRIVATE_KEY = "0xYOUR_PRIVATE_KEY_HERE"
$env:SEPOLIA_RPC_URL = "https://rpc.sepolia.org"
$env:ETHERSCAN_API_KEY = "YOUR_API_KEY" # optional

# Run deployment script
.\deploy-tokenfactory-sepolia.ps1
```

The script will:
- ✅ Compile the contract
- ✅ Deploy to Sepolia
- ✅ Verify on Etherscan (if API key provided)
- ✅ Save address to `deployed-addresses.txt`

---

## Option 3: Using Node.js (Requires Compilation First)

### Step 1: Compile Contract
```powershell
cd "c:\Asset Tokenization\contracts"
docker run --rm -v "${PWD}:/workspace" -w /workspace ghcr.io/foundry-rs/foundry:latest forge build
```

### Step 2: Deploy
```powershell
$env:PRIVATE_KEY = "0xYOUR_PRIVATE_KEY_HERE"
$env:SEPOLIA_RPC_URL = "https://rpc.sepolia.org"
node deploy-tokenfactory.js
```

---

## After Deployment

### 1. Add Address to Frontend Config

Edit `apps/frontend/.env.local`:
```env
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS_SEPOLIA=0xYOUR_DEPLOYED_ADDRESS
NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
```

### 2. Update Frontend Code

The frontend will automatically be updated in the next step to use the TokenFactory.

### 3. Verify Deployment

Go to: https://sepolia.etherscan.io/address/0xYOUR_ADDRESS
- ✅ Contract should show "Contract" tag
- ✅ You can interact with it
- ✅ View transactions

---

## Troubleshooting

### "Out of gas" error
Your wallet needs Sepolia ETH. Get free test ETH from:
- https://sepoliafaucet.com/
- https://faucets.chain.link/sepolia

### "Compilation failed"
Make sure you're using Solidity 0.8.20 or higher in Remix.

### "MetaMask not detecting network"
Switch MetaMask to Sepolia:
1. Open MetaMask
2. Click network dropdown (top)
3. Select "Sepolia test network"
4. If not visible, enable "Show test networks" in settings

---

## Next Step

After deploying, I'll update the frontend to:
1. Call TokenFactory.createToken() before submission
2. Use the newly deployed token address
3. Submit to AssetApprovalQueue with real token

**Recommendation**: Use **Option 1 (Remix)** - it's the fastest and requires zero setup!
