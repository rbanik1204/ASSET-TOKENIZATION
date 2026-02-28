'use client';

import React, { useState, useEffect } from 'react';
import { useAlgorandWallet } from '@/context/AlgorandWalletContext';
import { useAlgorandASA } from '@/hooks/useAlgorandASA';
import { useAlgorandPayment } from '@/hooks/useAlgorandPayment';
import AlgorandWalletButton from '@/components/algorand/AlgorandWalletButton';
import { getExplorerUrl, getCurrentAlgorandNetwork } from '@/config/algorand';

export default function AlgorandDemo() {
  const { isConnected, address, balance, network } = useAlgorandWallet();
  const { createASA, optInToASA, transferASA, getAccountAssets, isLoading: asaLoading } = useAlgorandASA();
  const { sendPayment, algoToMicroAlgo, microAlgoToAlgo, isLoading: paymentLoading } = useAlgorandPayment();

  const [assets, setAssets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'payment' | 'asa' | 'nft'>('payment');

  // Payment form
  const [paymentReceiver, setPaymentReceiver] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // ASA creation form
  const [asaName, setAsaName] = useState('');
  const [asaUnit, setAsaUnit] = useState('');
  const [asaTotal, setAsaTotal] = useState('');
  const [asaDecimals, setAsaDecimals] = useState('0');

  // Opt-in form
  const [optInAssetId, setOptInAssetId] = useState('');

  // Transfer form
  const [transferAssetId, setTransferAssetId] = useState('');
  const [transferReceiver, setTransferReceiver] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Load account assets
  useEffect(() => {
    const loadAssets = async () => {
      if (isConnected && address) {
        const accountAssets = await getAccountAssets();
        setAssets(accountAssets);
      }
    };

    loadAssets();
  }, [isConnected, address]);

  const handleSendPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const txId = await sendPayment({
      receiver: paymentReceiver,
      amount: algoToMicroAlgo(parseFloat(paymentAmount)),
      note: paymentNote,
    });

    if (txId) {
      alert(`Payment sent! Transaction ID: ${txId}`);
      setPaymentReceiver('');
      setPaymentAmount('');
      setPaymentNote('');
    }
  };

  const handleCreateASA = async (e: React.FormEvent) => {
    e.preventDefault();
    const assetId = await createASA({
      assetName: asaName,
      unitName: asaUnit,
      total: parseInt(asaTotal),
      decimals: parseInt(asaDecimals),
    });

    if (assetId) {
      alert(`Asset created! Asset ID: ${assetId}`);
      window.open(getExplorerUrl(getCurrentAlgorandNetwork(), 'asset', assetId.toString()), '_blank');
      setAsaName('');
      setAsaUnit('');
      setAsaTotal('');
      setAsaDecimals('0');
    }
  };

  const handleOptIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await optInToASA({ assetId: parseInt(optInAssetId) });

    if (success) {
      alert(`Successfully opted in to asset ${optInAssetId}!`);
      setOptInAssetId('');
      // Reload assets
      const accountAssets = await getAccountAssets();
      setAssets(accountAssets);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await transferASA({
      assetId: parseInt(transferAssetId),
      receiver: transferReceiver,
      amount: parseInt(transferAmount),
    });

    if (success) {
      alert('Asset transferred successfully!');
      setTransferAssetId('');
      setTransferReceiver('');
      setTransferAmount('');
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">△</div>
          <h1 className="text-3xl font-bold mb-2">Algorand Demo</h1>
          <p className="text-gray-600 mb-6">
            Connect your Algorand wallet to start exploring tokenization, NFTs, and payments.
          </p>
          <AlgorandWalletButton />
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-left">
            <div className="font-semibold mb-2">✨ Features:</div>
            <ul className="space-y-1 text-gray-700">
              <li>• Send ALGO payments</li>
              <li>• Create tokenized assets (ASAs)</li>
              <li>• Mint NFT credentials</li>
              <li>• Transfer assets</li>
              <li>• View transaction history</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">Algorand Demo</h1>
              <p className="text-gray-600">Network: {network.toUpperCase()}</p>
            </div>
            <AlgorandWalletButton />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <div className="text-sm opacity-90">Balance</div>
              <div className="text-2xl font-bold">
                {balance !== null ? microAlgoToAlgo(Number(balance)).toFixed(2) : '0.00'} ALGO
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="text-sm opacity-90">Assets Owned</div>
              <div className="text-2xl font-bold">{assets.length}</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="text-sm opacity-90">Network Fee</div>
              <div className="text-2xl font-bold">0.001 ALGO</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'payment'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              💸 Send Payment
            </button>
            <button
              onClick={() => setActiveTab('asa')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'asa'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              🪙 Manage Assets
            </button>
            <button
              onClick={() => setActiveTab('nft')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'nft'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎨 My Assets
            </button>
          </div>

          <div className="p-6">
            {/* Payment Tab */}
            {activeTab === 'payment' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Send ALGO Payment</h2>
                <form onSubmit={handleSendPayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Receiver Address</label>
                    <input
                      type="text"
                      value={paymentReceiver}
                      onChange={(e) => setPaymentReceiver(e.target.value)}
                      placeholder="Enter Algorand address"
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Amount (ALGO)</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.0"
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Note (Optional)</label>
                    <input
                      type="text"
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="Payment note"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={paymentLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {paymentLoading ? 'Sending...' : 'Send Payment'}
                  </button>
                </form>
              </div>
            )}

            {/* ASA Tab */}
            {activeTab === 'asa' && (
              <div className="space-y-8">
                {/* Create ASA */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Create New Asset (ASA)</h2>
                  <form onSubmit={handleCreateASA} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Asset Name</label>
                        <input
                          type="text"
                          value={asaName}
                          onChange={(e) => setAsaName(e.target.value)}
                          placeholder="Dorm Room 301"
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Unit Name</label>
                        <input
                          type="text"
                          value={asaUnit}
                          onChange={(e) => setAsaUnit(e.target.value)}
                          placeholder="DORM301"
                          maxLength={8}
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Total Supply</label>
                        <input
                          type="number"
                          value={asaTotal}
                          onChange={(e) => setAsaTotal(e.target.value)}
                          placeholder="1000"
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Decimals</label>
                        <input
                          type="number"
                          value={asaDecimals}
                          onChange={(e) => setAsaDecimals(e.target.value)}
                          placeholder="0"
                          min="0"
                          max="19"
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={asaLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {asaLoading ? 'Creating...' : 'Create Asset'}
                    </button>
                  </form>
                </div>

                <div className="border-t pt-8">
                  {/* Opt-in */}
                  <h2 className="text-2xl font-bold mb-4">Opt-in to Asset</h2>
                  <form onSubmit={handleOptIn} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Asset ID</label>
                      <input
                        type="number"
                        value={optInAssetId}
                        onChange={(e) => setOptInAssetId(e.target.value)}
                        placeholder="Enter asset ID"
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={asaLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {asaLoading ? 'Opting In...' : 'Opt-in to Asset'}
                    </button>
                  </form>
                </div>

                <div className="border-t pt-8">
                  {/* Transfer */}
                  <h2 className="text-2xl font-bold mb-4">Transfer Asset</h2>
                  <form onSubmit={handleTransfer} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Asset ID</label>
                      <input
                        type="number"
                        value={transferAssetId}
                        onChange={(e) => setTransferAssetId(e.target.value)}
                        placeholder="Enter asset ID"
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Receiver Address</label>
                      <input
                        type="text"
                        value={transferReceiver}
                        onChange={(e) => setTransferReceiver(e.target.value)}
                        placeholder="Enter receiver address"
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Amount</label>
                      <input
                        type="number"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={asaLoading}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {asaLoading ? 'Transferring...' : 'Transfer Asset'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* NFT/Assets Tab */}
            {activeTab === 'nft' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">My Assets ({assets.length})</h2>
                {assets.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-6xl mb-4">📦</div>
                    <p>No assets found. Create or opt-in to assets to see them here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assets.map((asset) => (
                      <div key={asset['asset-id']} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold">Asset #{asset['asset-id']}</div>
                          <button
                            onClick={() => window.open(getExplorerUrl(getCurrentAlgorandNetwork(), 'asset', asset['asset-id'].toString()), '_blank')}
                            className="text-blue-600 text-sm hover:underline"
                          >
                            View →
                          </button>
                        </div>
                        <div className="text-2xl font-bold text-purple-600 mb-2">
                          {asset.amount}
                        </div>
                        <div className="text-sm text-gray-500">
                          {asset['is-frozen'] ? '🔒 Frozen' : '✅ Active'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
