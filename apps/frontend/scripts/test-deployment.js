#!/usr/bin/env node
/**
 * Test script for the post-approval deployment pipeline
 * Usage: node scripts/test-deployment.js
 */

const submissionId = process.argv[2] || 'test-' + Date.now();
const metadataURI = process.argv[3] || 'ipfs://bafkreiabcd1234567890examplehash';

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testDeployment() {
  console.log('\n🧪 Testing Post-Approval Deployment Pipeline');
  console.log('='.repeat(60));
  console.log(`📋 Submission ID: ${submissionId}`);
  console.log(`📄 Metadata URI: ${metadataURI}`);
  console.log(`🌐 API Endpoint: ${API_URL}/api/admin/deploy-asset`);
  console.log('='.repeat(60) + '\n');

  const payload = {
    submissionId,
    metadataURI,
    metadata: {
      assetDetails: {
        name: 'Test Asset Token',
        type: 'Real Estate',
        description: 'A test asset for deployment pipeline validation',
      },
      tokenization: {
        tokenName: 'Test Real Estate Token',
        tokenSymbol: 'TRET',
        totalSupply: '1000000',
      },
      income: {
        enabled: true,
        frequency: 'monthly',
      },
    },
  };

  console.log('📤 Sending deployment request...\n');

  try {
    const response = await fetch(`${API_URL}/api/admin/deploy-asset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('\n📥 Response Status:', response.status);
    console.log('='.repeat(60));
    
    if (response.ok || response.status === 206) {
      console.log('\n✅ DEPLOYMENT PIPELINE RESULT:\n');
      console.log(`Success: ${data.success ? '✅' : '❌'}`);
      console.log(`Submission ID: ${data.submissionId}`);
      
      console.log('\n📊 Step Results:');
      console.log('  1. Metadata Frozen:       ', data.steps.metadataFrozen ? '✅' : '❌');
      console.log('  2. Token Deployed:        ', data.steps.tokenDeployed ? '✅' : '❌');
      if (data.steps.tokenAddress) {
        console.log(`     → Token Address:       ${data.steps.tokenAddress}`);
      }
      console.log('  3. Income Contract:       ', data.steps.incomeContractDeployed ? '✅' : '❌');
      if (data.steps.incomeContract) {
        console.log(`     → Income Contract:     ${data.steps.incomeContract}`);
      }
      console.log('  4. AMM Pool Deployed:     ', data.steps.ammPoolDeployed ? '✅' : '❌');
      if (data.steps.ammPoolAddress) {
        console.log(`     → Pool Address:        ${data.steps.ammPoolAddress}`);
      }
      console.log('  5. Liquidity Initialized: ', data.steps.liquidityInitialized ? '✅' : '❌');
      console.log('  6. Oracle Verified:       ', data.steps.oracleVerified ? '✅' : '❌');
      console.log('  7. Indexed:               ', data.steps.indexed ? '✅' : '❌');
      console.log('  8. Marketplace Visible:   ', data.steps.marketplaceVisible ? '✅' : '❌');
      
      if (data.error) {
        console.log('\n⚠️  Error:', data.error);
      }
      
      if (data.steps.marketplaceVisible) {
        console.log('\n🎉 DEPLOYMENT COMPLETE - Asset is now visible in marketplace!');
      } else {
        console.log('\n⚠️  PARTIAL DEPLOYMENT - Asset requires manual intervention');
      }
    } else {
      console.log('\n❌ DEPLOYMENT FAILED:\n');
      console.log('Error:', data.error || 'Unknown error');
      console.log('\nFull Response:', JSON.stringify(data, null, 2));
    }

    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('\n💥 Request failed:', error.message);
    console.error('\nMake sure:');
    console.error('  1. Next.js dev server is running (npm run dev)');
    console.error('  2. Environment variables are configured in .env.local');
    console.error('  3. ADMIN_DEPLOYER_PRIVATE_KEY has sufficient ETH on Sepolia');
    process.exit(1);
  }
}

testDeployment();
