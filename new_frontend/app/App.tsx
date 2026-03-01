import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AlgorandProvider } from './contexts/AlgorandContext';
import { AssetRegistryProvider } from './contexts/AssetRegistryContext';
import { GovernanceProvider } from './contexts/GovernanceContext';
import { KycProvider } from './contexts/KycContext';
import { MarketplaceProvider } from './contexts/MarketplaceContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AlgorandProvider>
      <KycProvider>
      <AssetRegistryProvider>
        <GovernanceProvider>
          <MarketplaceProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#000',
                color: '#fff',
                border: '2px solid #00ff00',
                fontFamily: 'monospace',
                fontWeight: 'bold',
              },
            }}
          />
          </MarketplaceProvider>
        </GovernanceProvider>
      </AssetRegistryProvider>
      </KycProvider>
    </AlgorandProvider>
  );
}
