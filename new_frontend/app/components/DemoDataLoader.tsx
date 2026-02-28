import { useEffect } from 'react';
import { useAssetRegistry } from '../contexts/AssetRegistryContext';
import { useGovernance } from '../contexts/GovernanceContext';
import { useAlgorand } from '../contexts/AlgorandContext';

export const DemoDataLoader: React.FC = () => {
  const { createASA, createListing, assets, listings, updateVerificationStatus } = useAssetRegistry();
  const { createProposal, proposals } = useGovernance();
  const { address } = useAlgorand();

  useEffect(() => {
    // Only load demo data once
    if (assets.length > 0 || !address) return;

    const loadDemoData = async () => {
      // Create sample assets
      const asset1Id = await createASA({
        name: 'Downtown Manhattan Office Tower',
        unitName: 'DMOT',
        totalSupply: 1000000,
        decimals: 0,
        category: 'real-estate',
        description: 'Premium Class A office space in the heart of Manhattan financial district. 45-story tower with modern amenities.',
        creator: address,
        defaultFrozen: false,
        url: 'https://example.com/dmot',
      });

      const asset2Id = await createASA({
        name: 'Gold Reserve Vault Certificate',
        unitName: 'GRVC',
        totalSupply: 500000,
        decimals: 2,
        category: 'commodities',
        description: 'Tokenized gold reserves stored in Swiss vaults. Each token represents 1 gram of 99.99% pure gold.',
        creator: address,
        defaultFrozen: false,
      });

      const asset3Id = await createASA({
        name: 'Carbon Credit Portfolio 2026',
        unitName: 'CCP26',
        totalSupply: 250000,
        decimals: 0,
        category: 'carbon-credits',
        description: 'Verified carbon offset credits from renewable energy projects across Southeast Asia.',
        creator: address,
        defaultFrozen: false,
      });

      const asset4Id = await createASA({
        name: 'Industrial Equipment Lease',
        unitName: 'IEL',
        totalSupply: 100000,
        decimals: 0,
        category: 'securities',
        description: 'Fractional ownership of industrial manufacturing equipment lease agreements.',
        creator: address,
        defaultFrozen: false,
      });

      // Wait a bit for assets to be created, then approve first 3
      setTimeout(() => {
        // Auto-approve first three assets
        updateVerificationStatus(asset1Id, 'approved', undefined);
        updateVerificationStatus(asset2Id, 'approved', undefined);
        updateVerificationStatus(asset3Id, 'approved', undefined);
        
        // Create marketplace listings for approved assets
        setTimeout(() => {
          const approvedAssets = assets.filter(a => a.verificationStatus === 'approved');
          
          if (listings.length === 0 && approvedAssets.length > 0) {
            approvedAssets.slice(0, 3).forEach((asset, index) => {
              if (asset.assetId) {
                createListing({
                  assetId: asset.assetId,
                  assetName: asset.name,
                  seller: address,
                  pricePerUnit: [25.5, 0.05, 12.0][index],
                  unitsAvailable: [5000, 100000, 10000][index],
                  totalValue: [127500, 5000, 120000][index],
                });
              }
            });
          }
        }, 500);
      }, 500);
    };

    // Create sample governance proposals
    if (proposals.length === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);

      createProposal({
        title: 'Increase Minimum Verification Threshold',
        description: 'Proposal to raise the minimum asset value requirement for verification from $10,000 to $50,000 to ensure higher quality listings.',
        proposer: address,
        votingEnds: tomorrow,
        totalVotingPower: 1000000,
        quorumRequired: 510000,
        type: 'parameter',
      });

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 14);

      createProposal({
        title: 'Add Real Estate Appraisal Requirement',
        description: 'Require third-party appraisal for all real estate tokenization above $1M valuation.',
        proposer: address,
        votingEnds: nextWeek,
        totalVotingPower: 1000000,
        quorumRequired: 510000,
        type: 'governance',
      });
    }

    loadDemoData();
  }, [address, assets.length, proposals.length]);

  return null;
};