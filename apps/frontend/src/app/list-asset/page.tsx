'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi';
import { useRouter } from 'next/navigation';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import { getContractsForChain, ABIS } from '@/config/contracts';
import { parseUnits, decodeEventLog } from 'viem';

export default function ListAssetPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const contracts = getContractsForChain(chainId || 11155111);
  
  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<'idle' | 'deploying-token' | 'submitting-approval'>('idle');
  const [deployedTokenAddress, setDeployedTokenAddress] = useState<`0x${string}` | null>(null);
  const [metadataURI, setMetadataURI] = useState<string>('');

  // Handle token deployment success
  useEffect(() => {
    if (isTxSuccess && submissionStep === 'deploying-token' && txHash && publicClient) {
      (async () => {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          
          // Extract token address from TokenCreated event
          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: ABIS.TOKEN_FACTORY,
                data: log.data,
                topics: log.topics,
              });
              
              if (decoded.eventName === 'TokenCreated' && decoded.args) {
                const tokenAddr = (decoded.args as any).token as `0x${string}`;
                setDeployedTokenAddress(tokenAddr);
                console.log('✅ Token deployed:', tokenAddr);
                
                // Now submit to approval queue
                setSubmissionStep('submitting-approval');
                writeContract({
                  address: contracts.ASSET_APPROVAL_QUEUE as `0x${string}`,
                  abi: ABIS.ASSET_APPROVAL_QUEUE,
                  functionName: 'submit',
                  args: [tokenAddr, metadataURI],
                  gas: 500000n,
                });
                break;
              }
            } catch {
              continue;
            }
          }
        } catch (error) {
          console.error('Failed to process token deployment:', error);
          alert('Token deployed but failed to extract address. Please try again.');
          setIsSubmitting(false);
          setSubmissionStep('idle');
        }
      })();
    }
  }, [isTxSuccess, submissionStep, txHash, publicClient, contracts, metadataURI]);

  // Handle approval queue submission success
  useEffect(() => {
    if (isTxSuccess && submissionStep === 'submitting-approval') {
      alert('Asset submitted successfully to the approval queue! The admin will review your submission.');
      router.push('/portfolio');
      setSubmissionStep('idle');
    }
  }, [isTxSuccess, submissionStep, router]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      console.error('Transaction error:', writeError);
      alert(`Transaction failed: ${writeError.message}`);
      setIsSubmitting(false);
    }
  }, [writeError]);
  
  const [formData, setFormData] = useState({
    // Asset Details
    assetName: '',
    assetType: 'real-estate',
    location: {
      address: '',
      lat: 0,
      lng: 0,
      placeId: '',
      city: '',
      country: ''
    },
    jurisdiction: 'india',
    description: '',
    valuationAmount: '',
    valuationCurrency: 'USD',
    
    // Tokenization Config
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '',
    pricePerToken: '',
    totalPrice: '',
    
    // Legal Documents
    titleDeedFile: null as File | null,
    valuationReportFile: null as File | null,
    legalOpinionFile: null as File | null,
    
    // Optional Contact Details (Web3 UX)
    contactEmail: '',
    contactPhone: '',
    
    // Declaration
    ownershipDeclaration: false,
    accuracyDeclaration: false,
    complianceDeclaration: false,
    notificationConsent: false,
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        
        // Auto-calculate price per token from total price and supply
        if (name === 'totalPrice' && updated.totalSupply) {
          const total = parseFloat(value) || 0;
          const supply = parseFloat(updated.totalSupply) || 1;
          updated.pricePerToken = (total / supply).toFixed(2);
        }
        
        // Auto-calculate total price from price per token and supply
        if (name === 'pricePerToken' && updated.totalSupply) {
          const price = parseFloat(value) || 0;
          const supply = parseFloat(updated.totalSupply) || 0;
          updated.totalPrice = (price * supply).toFixed(2);
        }
        
        // Auto-calculate from supply changes
        if (name === 'totalSupply') {
          const supply = parseFloat(value) || 1;
          if (updated.totalPrice) {
            const total = parseFloat(updated.totalPrice) || 0;
            updated.pricePerToken = (total / supply).toFixed(2);
          } else if (updated.pricePerToken) {
            const price = parseFloat(updated.pricePerToken) || 0;
            updated.totalPrice = (price * supply).toFixed(2);
          }
        }
        
        return updated;
      });
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
    }
  };
  
  const uploadToIPFS = async (file: File): Promise<string> => {
    // In Next.js, NEXT_PUBLIC_ env vars are inlined at build time
    const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
    
    console.log('🔐 Pinata JWT available:', PINATA_JWT ? 'Yes' : 'No');
    console.log('📤 Uploading file to IPFS:', file.name, 'Size:', file.size, 'bytes');
    
    if (!PINATA_JWT) {
      const errorMsg = 'Pinata JWT not configured. Check NEXT_PUBLIC_PINATA_JWT in .env.local';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    return new Promise((resolve, reject) => {
      // Setup progress tracking interval
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[file.name] || 0;
          if (current >= 90) { // Stop at 90% until actual upload completes
            clearInterval(interval);
            return prev;
          }
          return { ...prev, [file.name]: current + 15 };
        });
      }, 500);

      // Create FormData for Pinata upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Optional: Add metadata
      const metadata = JSON.stringify({
        name: file.name,
      });
      formData.append('pinataMetadata', metadata);

      console.log('📡 Sending to Pinata API...');

      // Upload to Pinata
      fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
        },
        body: formData,
      })
        .then(response => {
          console.log('📥 Pinata response status:', response.status, response.statusText);
          if (!response.ok) {
            return response.text().then(text => {
              console.error('❌ Pinata error response:', text);
              throw new Error(`Pinata upload failed (${response.status}): ${text}`);
            });
          }
          return response.json();
        })
        .then(data => {
          clearInterval(interval);
          console.log('✅ Pinata upload success! CID:', data.IpfsHash);
          // Set progress to 100%
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          // Return IPFS URI
          resolve(`ipfs://${data.IpfsHash}`);
        })
        .catch(error => {
          clearInterval(interval);
          console.error('❌ IPFS upload error:', error);
          reject(error);
        });
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!contracts.ASSET_APPROVAL_QUEUE) {
      alert('AssetApprovalQueue contract not configured for this network');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Upload documents to IPFS
      const documentCIDs: Record<string, string> = {};
      
      console.log('📄 Uploading documents to IPFS...');
      if (formData.titleDeedFile) {
        console.log('📄 Uploading Title Deed...');
        documentCIDs.titleDeed = await uploadToIPFS(formData.titleDeedFile);
        console.log('✅ Title Deed uploaded:', documentCIDs.titleDeed);
      }
      if (formData.valuationReportFile) {
        console.log('📄 Uploading Valuation Report...');
        documentCIDs.valuationReport = await uploadToIPFS(formData.valuationReportFile);
        console.log('✅ Valuation Report uploaded:', documentCIDs.valuationReport);
      }
      if (formData.legalOpinionFile) {
        console.log('📄 Uploading Legal Opinion...');
        documentCIDs.legalOpinion = await uploadToIPFS(formData.legalOpinionFile);
        console.log('✅ Legal Opinion uploaded:', documentCIDs.legalOpinion);
      }
      
      console.log('📦 All document CIDs:', documentCIDs);
      
      // 2. Create metadata JSON
      const metadata = {
        assetDetails: {
          name: formData.assetName,
          type: formData.assetType,
          location: formData.location,
          jurisdiction: formData.jurisdiction,
          description: formData.description,
          valuation: {
            amount: formData.valuationAmount,
            currency: formData.valuationCurrency
          }
        },
        tokenization: {
          tokenName: formData.tokenName,
          tokenSymbol: formData.tokenSymbol,
          totalSupply: formData.totalSupply,
          pricePerToken: formData.pricePerToken
        },
        documents: documentCIDs,
        submitter: address,
        submittedAt: new Date().toISOString(),
        contact: {
          email: formData.contactEmail || null,
          phone: formData.contactPhone || null,
          notificationConsent: formData.notificationConsent
        },
        declarations: {
          ownership: formData.ownershipDeclaration,
          accuracy: formData.accuracyDeclaration,
          compliance: formData.complianceDeclaration
        }
      };
      
      console.log('📋 Metadata object:', metadata);
      
      // 3. Upload metadata to IPFS
      console.log('📤 Uploading metadata JSON to IPFS...');
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const metadataFile = new File([metadataBlob], 'metadata.json');
      const uploadedMetadataURI = await uploadToIPFS(metadataFile);
      setMetadataURI(uploadedMetadataURI);
      console.log('✅ Metadata uploaded! URI:', uploadedMetadataURI);
      
      // 4. Create Algorand ASA (if Algorand wallet connected)
      console.log('🟣 Creating Algorand Standard Asset...');
      try {
        const asaResponse = await fetch('/api/algorand/create-asa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assetName: formData.assetName.substring(0, 32),
            unitName: formData.tokenSymbol.substring(0, 8),
            totalSupply: parseInt(formData.totalSupply),
            decimals: 0,
            metadata: {
              assetType: formData.assetType,
              location: formData.location.address,
              valuation: parseFloat(formData.valuationAmount),
              documentHash: uploadedMetadataURI,
              description: formData.description
            },
            url: typeof window !== 'undefined' ? `${window.location.origin}/assets/pending` : uploadedMetadataURI
          })
        });
        const asaResult = await asaResponse.json();
        if (asaResult.success) {
          console.log('✅ ASA created! ID:', asaResult.asaId);
          console.log('🔗 Explorer:', asaResult.explorerUrl);
          alert(`Algorand ASA created! ID: ${asaResult.asaId}\n\nView on AlgoExplorer:\n${asaResult.explorerUrl}`);
        } else {
          console.warn('⚠️ ASA creation failed:', asaResult.message);
        }
      } catch (asaError) {
        console.warn('⚠️ ASA creation failed:', asaError);
        // Continue with ERC20 deployment even if ASA fails
      }
      
      // 5. Deploy ERC20 token via TokenFactory
      console.log('Deploying ERC20 token for asset...');
      
      if (!contracts.TOKEN_FACTORY) {
        alert('TokenFactory not configured. Please contact support.');
        setIsSubmitting(false);
        return;
      }
      
      const totalSupplyUnits = parseUnits(formData.totalSupply, 18);
      
      // Deploy new token via factory
      setSubmissionStep('deploying-token');
      writeContract({
        address: contracts.TOKEN_FACTORY as `0x${string}`,
        abi: ABIS.TOKEN_FACTORY,
        functionName: 'createToken',
        args: [
          formData.tokenName,
          formData.tokenSymbol,
          totalSupplyUnits,
          18 // decimals
        ],
      });
      
      console.log('⏳ Token deployment transaction sent. Please confirm in MetaMask...');
      console.log('Metadata URI:', uploadedMetadataURI);
      
      // The rest is handled by useEffect hooks above
      
    } catch (error) {
      console.error('Submission error:', error);
      alert(`Failed to submit asset: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSubmitting(false);
      setSubmissionStep('idle');
    }
  };
  
  const isStep1Valid = formData.assetName && formData.location.address && formData.description && formData.valuationAmount;
  const isStep2Valid = formData.tokenName && formData.tokenSymbol && formData.totalSupply && (formData.pricePerToken || formData.totalPrice);
  const isStep3Valid = formData.titleDeedFile && formData.valuationReportFile;
  
  // Step 4: Validate declarations + notification consent if contact details provided
  const hasContactDetails = formData.contactEmail || formData.contactPhone;
  const isStep4Valid = 
    formData.ownershipDeclaration && 
    formData.accuracyDeclaration && 
    formData.complianceDeclaration &&
    (!hasContactDetails || formData.notificationConsent); // Consent required only if contact details provided
  
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Wallet Required</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please connect your wallet to submit an asset for tokenization.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            List Your Asset
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Tokenize your real-world asset and reach global investors. Complete all steps to submit your asset for review.
          </p>
        </div>
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    currentStep === step
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30'
                      : currentStep > step
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {currentStep > step ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>
                  <span className="text-xs mt-2 text-slate-600 dark:text-slate-400 hidden sm:block">
                    {step === 1 && 'Details'}
                    {step === 2 && 'Tokenization'}
                    {step === 3 && 'Documents'}
                    {step === 4 && 'Declaration'}
                  </span>
                </div>
                {step < 4 && (
                  <div className={`h-1 flex-1 mx-2 transition-all ${
                    currentStep > step ? 'bg-green-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 sm:p-8">
          
          {/* Step 1: Asset Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Asset Details</h2>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Asset Name *
                </label>
                <input
                  type="text"
                  name="assetName"
                  value={formData.assetName}
                  onChange={handleInputChange}
                  placeholder="e.g., Luxury Villa in Goa"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Asset Type *
                  </label>
                  <select
                    name="assetType"
                    value={formData.assetType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="real-estate">Real Estate</option>
                    <option value="commercial-property">Commercial Property</option>
                    <option value="agricultural-land">Agricultural Land</option>
                    <option value="rental-property">Rental Property</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Jurisdiction *
                  </label>
                  <select
                    name="jurisdiction"
                    value={formData.jurisdiction}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="india">India</option>
                    <option value="uae">UAE</option>
                    <option value="singapore">Singapore</option>
                    <option value="uk">United Kingdom</option>
                    <option value="us">United States</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Location * (Exact Address)
                </label>
                <GooglePlacesAutocomplete
                  value={formData.location.address}
                  onChange={(locationData) => {
                    setFormData(prev => ({
                      ...prev,
                      location: {
                        address: locationData.address,
                        lat: locationData.lat,
                        lng: locationData.lng,
                        placeId: locationData.placeId,
                        city: locationData.city || '',
                        country: locationData.country || ''
                      }
                    }));
                  }}
                  placeholder="Start typing to search for exact location..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {formData.location.lat !== 0 && formData.location.lng !== 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Location confirmed: {formData.location.city}, {formData.location.country} (Lat: {formData.location.lat.toFixed(6)}, Lng: {formData.location.lng.toFixed(6)})
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide detailed information about the asset, including key features, amenities, and investment highlights..."
                  required
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Valuation Amount *
                  </label>
                  <input
                    type="number"
                    name="valuationAmount"
                    value={formData.valuationAmount}
                    onChange={handleInputChange}
                    placeholder="e.g., 5000000"
                    required
                    min="0"
                    step="any"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Currency
                  </label>
                  <select
                    name="valuationCurrency"
                    value={formData.valuationCurrency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="INR">INR</option>
                    <option value="AED">AED</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Tokenization Configuration */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Tokenization Configuration</h2>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-1">Fractionalization Settings</p>
                    <p>Define how your asset will be split into tradable tokens. Each token represents fractional ownership.</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Token Name *
                  </label>
                  <input
                    type="text"
                    name="tokenName"
                    value={formData.tokenName}
                    onChange={handleInputChange}
                    placeholder="e.g., Goa Villa Token"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Token Symbol *
                  </label>
                  <input
                    type="text"
                    name="tokenSymbol"
                    value={formData.tokenSymbol}
                    onChange={handleInputChange}
                    placeholder="e.g., GVILLA"
                    required
                    maxLength={10}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Total Supply *
                </label>
                <input
                  type="number"
                  name="totalSupply"
                  value={formData.totalSupply}
                  onChange={handleInputChange}
                  placeholder="e.g., 10000"
                  required
                  min="1"
                  step="1"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total number of tokens to create</p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2 items-center mb-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Auto-Calculate Pricing</span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">Enter either Total Price OR Price Per Token - the other will calculate automatically</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-blue-900 dark:text-blue-200 mb-2">
                      Total Offering Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">$</span>
                      <input
                        type="number"
                        name="totalPrice"
                        value={formData.totalPrice}
                        onChange={handleInputChange}
                        placeholder="e.g., 5000000"
                        min="0"
                        step="any"
                        className="w-full pl-7 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-blue-900 dark:text-blue-200 mb-2">
                      Price Per Token (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">$</span>
                      <input
                        type="number"
                        name="pricePerToken"
                        value={formData.pricePerToken}
                        onChange={handleInputChange}
                        placeholder="e.g., 500"
                        min="0"
                        step="any"
                        className="w-full pl-7 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {formData.totalSupply && formData.pricePerToken && formData.totalPrice && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">Tokenization Summary</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-300">Total Tokens:</span>
                          <span className="font-semibold text-green-900 dark:text-green-100">{parseFloat(formData.totalSupply).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-300">Price Per Token:</span>
                          <span className="font-semibold text-green-900 dark:text-green-100">${parseFloat(formData.pricePerToken).toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-green-300 dark:bg-green-700 my-2"></div>
                        <div className="flex justify-between">
                          <span className="text-green-700 dark:text-green-300 font-semibold">Total Offering Value:</span>
                          <span className="font-bold text-lg text-green-900 dark:text-green-100">${parseFloat(formData.totalPrice).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Step 3: Document Upload */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Legal Documentation</h2>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <p className="font-semibold mb-1">Required Documents</p>
                    <p>All documents will be uploaded to IPFS for permanent, decentralized storage. Files must be in PDF format.</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Title Deed / Ownership Proof * <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, 'titleDeedFile')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
                {formData.titleDeedFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {formData.titleDeedFile.name}
                    {uploadProgress[formData.titleDeedFile.name] && uploadProgress[formData.titleDeedFile.name] < 100 && (
                      <span className="ml-2">({uploadProgress[formData.titleDeedFile.name]}%)</span>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Professional Valuation Report * <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, 'valuationReportFile')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
                {formData.valuationReportFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {formData.valuationReportFile.name}
                    {uploadProgress[formData.valuationReportFile.name] && uploadProgress[formData.valuationReportFile.name] < 100 && (
                      <span className="ml-2">({uploadProgress[formData.valuationReportFile.name]}%)</span>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Legal Opinion (Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, 'legalOpinionFile')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
                {formData.legalOpinionFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {formData.legalOpinionFile.name}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 4: Declarations */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Legal Declarations</h2>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                  <input
                    type="checkbox"
                    name="ownershipDeclaration"
                    checked={formData.ownershipDeclaration}
                    onChange={handleInputChange}
                    className="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Ownership Declaration</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      I confirm that I am the legal owner or authorized representative of this asset, and I have the right to tokenize and offer it for investment.
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                  <input
                    type="checkbox"
                    name="accuracyDeclaration"
                    checked={formData.accuracyDeclaration}
                    onChange={handleInputChange}
                    className="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Accuracy Declaration</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      All information provided is accurate, complete, and up-to-date to the best of my knowledge. I understand that providing false information may result in legal consequences.
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                  <input
                    type="checkbox"
                    name="complianceDeclaration"
                    checked={formData.complianceDeclaration}
                    onChange={handleInputChange}
                    className="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">Compliance Declaration</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      I understand and agree to comply with all applicable laws, regulations, and platform policies. I acknowledge that my submission will be reviewed and may be rejected if it does not meet compliance requirements.
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Optional Contact Details Section */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mt-8">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">📬 Contact Details (Optional)</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Optional. Used only for important asset-related updates. You can still receive all notifications inside the platform.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Email Address <span className="text-slate-500 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleInputChange}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      For off-platform email updates about your asset
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Mobile Number <span className="text-slate-500 text-xs">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                      placeholder="+1 234 567 8900"
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      For SMS alerts about critical asset events
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Notification Consent - Required if contact details provided */}
              {(formData.contactEmail || formData.contactPhone) && (
                <div className="mt-6">
                  <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all">
                    <input
                      type="checkbox"
                      name="notificationConsent"
                      checked={formData.notificationConsent}
                      onChange={handleInputChange}
                      className="mt-1 w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        Notification Consent <span className="text-red-500">*</span>
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        I agree to receive notifications related to my asset via the contact details provided. You will still receive all notifications inside the platform.
                      </p>
                    </div>
                  </label>
                </div>
              )}
              
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mt-6">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">What Happens Next?</h3>
                <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">1.</span>
                    <span>Your submission will be reviewed by our compliance team (typically 3-5 business days)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">2.</span>
                    <span>We'll verify all documents and perform due diligence on the asset</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">3.</span>
                    <span>If approved, we'll configure oracle feeds for real-time verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">4.</span>
                    <span>Your asset will be deployed and listed on the marketplace</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">5.</span>
                    <span>You'll receive notifications throughout the process</span>
                  </li>
                </ol>
              </div>
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={
                  (currentStep === 1 && !isStep1Valid) ||
                  (currentStep === 2 && !isStep2Valid) ||
                  (currentStep === 3 && !isStep3Valid)
                }
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next Step
              </button>
            ) : (
              <button
                type="submit"
                disabled={!isStep4Valid || isSubmitting || isWritePending || isTxLoading}
                className="px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSubmitting || isWritePending || isTxLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {submissionStep === 'deploying-token' 
                      ? (isWritePending ? 'Confirm Token Deployment...' : 'Deploying Token...') 
                      : submissionStep === 'submitting-approval'
                      ? (isWritePending ? 'Confirm Submission...' : 'Submitting to Queue...')
                      : 'Processing...'}
                  </>
                ) : (
                  <>
                    Submit to Approval Queue
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
