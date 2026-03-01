import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAlgorand } from '../contexts/AlgorandContext';
import { useMarketplace } from '../contexts/MarketplaceContext';
import { toast } from 'sonner';

interface CreateListingModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateListingModal({ open, onClose }: CreateListingModalProps) {
  const { address, assets, isAuthenticated } = useAlgorand();
  const { createListing } = useMarketplace();

  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minPurchase, setMinPurchase] = useState('1');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAsset = assets.find((a) => String(a.id) === selectedAssetId);
  const maxQuantity = selectedAsset?.amount || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !selectedAsset) return;

    const qty = parseInt(quantity, 10);
    const price = parseFloat(pricePerUnit);
    const minP = parseInt(minPurchase, 10) || 1;

    if (!qty || qty <= 0 || qty > maxQuantity) {
      toast.error(`Quantity must be between 1 and ${maxQuantity}`);
      return;
    }
    if (!price || price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      await createListing({
        assetId: String(selectedAsset.id),
        asaId: selectedAsset.id,
        assetName: selectedAsset.name,
        unitName: selectedAsset.unitName,
        sellerAddress: address,
        pricePerUnit: price,
        quantity: qty,
        minPurchase: minP,
        description: description || undefined,
      });
      toast.success('Listing created successfully!');
      onClose();
      // Reset form
      setSelectedAssetId('');
      setPricePerUnit('');
      setQuantity('');
      setMinPurchase('1');
      setDescription('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative mx-4 w-full max-w-lg rounded-2xl border-2 border-lime-500/40 bg-black/95 p-6 shadow-[0_0_60px_rgba(0,255,0,0.15)]"
            initial={{ scale: 0.9, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 40 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-white transition"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold text-lime-400 mb-1 font-mono">
              ⊕ Create Listing
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              List your tokenized assets on the marketplace
            </p>

            {!isAuthenticated || !address ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-3">🔒</p>
                <p>Please connect your wallet and authenticate first.</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-4xl mb-3">📭</p>
                <p>You don't have any tokenized assets to list.</p>
                <p className="text-xs mt-2">Create and tokenize assets in the Tokenize page first.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Asset selection */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1 font-mono">Select Asset</label>
                  <select
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none font-mono text-sm"
                    required
                  >
                    <option value="">— Choose an asset —</option>
                    {assets.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name} ({a.unitName}) — {a.amount} available [ASA {a.id}]
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAsset && (
                  <div className="bg-gray-900/60 border border-lime-900/30 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>ASA ID:</span>
                      <span className="text-lime-400 font-mono">{selectedAsset.id}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 mt-1">
                      <span>Your Balance:</span>
                      <span className="text-white font-mono">{selectedAsset.amount} {selectedAsset.unitName}</span>
                    </div>
                  </div>
                )}

                {/* Price per unit */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1 font-mono">Price per Unit (ALGO)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none font-mono text-sm"
                    placeholder="e.g. 1.5"
                    required
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1 font-mono">
                    Quantity to List {maxQuantity > 0 && <span className="text-gray-500">(max: {maxQuantity})</span>}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={maxQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none font-mono text-sm"
                    placeholder="e.g. 100"
                    required
                  />
                </div>

                {/* Min purchase */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1 font-mono">Minimum Purchase</label>
                  <input
                    type="number"
                    min="1"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none font-mono text-sm"
                    placeholder="1"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm text-gray-300 mb-1 font-mono">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-lime-500 focus:ring-1 focus:ring-lime-500 outline-none font-mono text-sm resize-none"
                    rows={2}
                    placeholder="Optional listing description..."
                  />
                </div>

                {/* Summary */}
                {pricePerUnit && quantity && (
                  <div className="bg-lime-950/30 border border-lime-800/30 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between text-gray-300">
                      <span>Total Listing Value:</span>
                      <span className="text-lime-400 font-bold">
                        {(parseFloat(pricePerUnit) * parseInt(quantity || '0')).toFixed(3)} ALGO
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-xs">
                      <span>Platform Fee (2.5%):</span>
                      <span>
                        {((parseFloat(pricePerUnit) * parseInt(quantity || '0')) * 0.025).toFixed(4)} ALGO
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-400 text-xs">
                      <span>Seller Receives:</span>
                      <span>
                        {((parseFloat(pricePerUnit) * parseInt(quantity || '0')) * 0.975).toFixed(4)} ALGO
                      </span>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedAssetId || !pricePerUnit || !quantity}
                  className="w-full bg-lime-500 hover:bg-lime-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-xl transition font-mono flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⟳</span> Creating Listing...
                    </>
                  ) : (
                    <>⊕ Create Listing</>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
