import React, { useState } from 'react';
import { X, Wallet, Copy, Check, ExternalLink, Shield, Loader2 } from 'lucide-react';
import { useAlgorand, WalletType } from '../contexts/AlgorandContext';
import { motion, AnimatePresence } from 'motion/react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'choose' | 'connecting' | 'signing' | 'success' | 'error';

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { connectWallet, signAndVerify, isConnecting, address, isAuthenticated } = useAlgorand();
  const [step, setStep] = useState<ModalStep>('choose');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletType>(null);

  const wallets = [
    { type: 'pera' as WalletType, name: 'Pera Wallet', icon: '🟢', desc: 'Mobile & Web' },
    { type: 'defly' as WalletType, name: 'Defly Wallet', icon: '🦋', desc: 'Mobile Wallet' },
  ];

  const handleConnect = async (type: WalletType) => {
    setSelectedWallet(type);
    setStep('connecting');
    setErrorMsg('');

    try {
      await connectWallet(type);
      // Wallet connected, now authenticate
      setStep('signing');
      const ok = await signAndVerify();
      if (ok) {
        setStep('success');
        setTimeout(() => {
          onClose();
          setStep('choose');
        }, 1200);
      } else {
        // Wallet connected but auth skipped/failed — still close
        setStep('success');
        setTimeout(() => {
          onClose();
          setStep('choose');
        }, 1200);
      }
    } catch (error: any) {
      if (error?.data?.type === 'CONNECT_MODAL_CLOSED' || error?.message?.includes('closed')) {
        setStep('choose');
      } else {
        setErrorMsg(error?.message || 'Connection failed');
        setStep('error');
      }
    }
  };

  const handleClose = () => {
    if (step !== 'connecting' && step !== 'signing') {
      onClose();
      setStep('choose');
      setErrorMsg('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              background: 'rgba(7, 17, 13, 0.95)',
              border: '1px solid rgba(0,224,138,0.2)',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '420px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,224,138,0.06)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f0f6f3', letterSpacing: '0.3px' }}>
                {step === 'choose' && 'Connect Wallet'}
                {step === 'connecting' && 'Connecting...'}
                {step === 'signing' && 'Authenticating...'}
                {step === 'success' && 'Connected!'}
                {step === 'error' && 'Connection Error'}
              </h2>
              <button
                onClick={handleClose}
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(240,246,243,0.6)',
                  cursor: step === 'connecting' || step === 'signing' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: step === 'connecting' || step === 'signing' ? 0.3 : 1,
                }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Step: Choose wallet */}
            {step === 'choose' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wallets.map((wallet) => (
                  <button
                    key={wallet.type}
                    onClick={() => handleConnect(wallet.type)}
                    disabled={isConnecting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px 20px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      color: '#f0f6f3',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0,224,138,0.35)';
                      e.currentTarget.style.background = 'rgba(0,224,138,0.06)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,224,138,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>{wallet.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{wallet.name}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(240,246,243,0.45)', marginTop: '2px' }}>
                        {wallet.desc}
                      </div>
                    </div>
                    <Wallet style={{ width: '16px', height: '16px', color: 'rgba(240,246,243,0.3)' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Step: Connecting */}
            {step === 'connecting' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Loader2 style={{ width: '40px', height: '40px', color: '#00e08a', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                <div style={{ fontSize: '14px', color: 'rgba(240,246,243,0.7)', marginBottom: '8px' }}>
                  Approve the connection in your <strong style={{ color: '#00e08a' }}>{selectedWallet}</strong> wallet
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(240,246,243,0.35)' }}>
                  A wallet popup should appear shortly...
                </div>
              </div>
            )}

            {/* Step: Signing / authenticating */}
            {step === 'signing' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Shield style={{ width: '40px', height: '40px', color: '#00e08a', margin: '0 auto 16px' }} />
                <div style={{ fontSize: '14px', color: 'rgba(240,246,243,0.7)', marginBottom: '8px' }}>
                  Sign a message to verify ownership
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(240,246,243,0.35)' }}>
                  Check your wallet for a signature request
                </div>
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 16px',
                  background: 'rgba(0,224,138,0.15)', border: '2px solid rgba(0,224,138,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check style={{ width: '24px', height: '24px', color: '#00e08a' }} />
                </div>
                <div style={{ fontSize: '14px', color: '#00e08a', fontWeight: 600, marginBottom: '8px' }}>
                  Wallet Connected
                </div>
                {address && (
                  <div style={{ fontSize: '12px', color: 'rgba(240,246,243,0.5)', fontFamily: 'monospace' }}>
                    {address.slice(0, 8)}...{address.slice(-6)}
                  </div>
                )}
              </div>
            )}

            {/* Step: Error */}
            {step === 'error' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <X style={{ width: '40px', height: '40px', color: '#ef4444', margin: '0 auto 16px' }} />
                <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 600, marginBottom: '8px' }}>
                  {errorMsg}
                </div>
                <button
                  onClick={() => setStep('choose')}
                  style={{
                    marginTop: '12px',
                    padding: '8px 24px',
                    borderRadius: '10px',
                    border: '1px solid rgba(0,224,138,0.3)',
                    background: 'rgba(0,224,138,0.08)',
                    color: '#00e08a',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Footer info */}
            <div style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              {[
                'WalletConnect v2 protocol',
                'Cryptographic signature verification',
                'No passwords — wallet-native auth',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(240,246,243,0.3)' }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(0,224,138,0.4)' }} />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Spin keyframe */}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ConnectedWalletInfo: React.FC = () => {
  const { address, balance, disconnectWallet, network, isAuthenticated, userRole, logout } = useAlgorand();
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = network === 'mainnet'
    ? `https://algoexplorer.io/address/${address}`
    : `https://testnet.algoexplorer.io/address/${address}`;

  const roleBadgeColor: Record<string, string> = {
    USER: '#00e08a',
    ASSET_ISSUER: '#3b82f6',
    VERIFIER: '#f59e0b',
    ADMIN: '#ef4444',
  };

  return (
    <div style={{
      background: 'rgba(7, 17, 13, 0.92)',
      border: '1px solid rgba(0,224,138,0.2)',
      borderRadius: '16px',
      padding: '20px',
      backdropFilter: 'blur(16px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#00e08a',
            boxShadow: '0 0 10px rgba(0,224,138,0.5)',
          }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#00e08a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Connected
          </span>
          {isAuthenticated && userRole && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              background: `${roleBadgeColor[userRole] || '#00e08a'}20`,
              color: roleBadgeColor[userRole] || '#00e08a',
              border: `1px solid ${roleBadgeColor[userRole] || '#00e08a'}40`,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {userRole.replace('_', ' ')}
            </span>
          )}
        </div>
        <button
          onClick={logout}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '4px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)',
            color: '#ef4444',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Disconnect
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(240,246,243,0.4)', textTransform: 'uppercase' }}>Address:</span>
          <code style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(240,246,243,0.7)', flex: 1 }}>
            {address.slice(0, 8)}...{address.slice(-6)}
          </code>
          <button onClick={copyAddress} style={{
            padding: '4px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
            background: 'transparent', cursor: 'pointer', color: 'rgba(240,246,243,0.5)',
          }}>
            {copied ? <Check style={{ width: '12px', height: '12px', color: '#00e08a' }} /> : <Copy style={{ width: '12px', height: '12px' }} />}
          </button>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{
            padding: '4px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px',
            color: 'rgba(240,246,243,0.5)',
          }}>
            <ExternalLink style={{ width: '12px', height: '12px' }} />
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(240,246,243,0.4)', textTransform: 'uppercase' }}>Balance:</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#00e08a' }}>{balance.toFixed(6)} ALGO</span>
        </div>
      </div>
    </div>
  );
};
