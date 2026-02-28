import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AlgorandProvider } from './contexts/AlgorandContext';
import { AssetRegistryProvider } from './contexts/AssetRegistryContext';
import { GovernanceProvider } from './contexts/GovernanceContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <AlgorandProvider>
      <AssetRegistryProvider>
        <GovernanceProvider>
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
        </GovernanceProvider>
      </AssetRegistryProvider>
    </AlgorandProvider>
  );
}
