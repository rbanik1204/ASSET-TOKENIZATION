-- Migration: Add Algorand ASA Support
-- Version: 2.0
-- Date: 2026-02-28
-- Description: Add ASA fields to track on-chain Algorand Standard Assets

-- Add ASA columns to assets table
ALTER TABLE assets 
ADD COLUMN asa_id BIGINT UNIQUE,
ADD COLUMN asa_creator VARCHAR(58),
ADD COLUMN asa_network VARCHAR(20) DEFAULT 'testnet',
ADD COLUMN asa_manager VARCHAR(58),
ADD COLUMN asa_reserve VARCHAR(58),
ADD COLUMN asa_freeze VARCHAR(58),
ADD COLUMN asa_clawback VARCHAR(58),
ADD COLUMN asa_total_supply BIGINT,
ADD COLUMN asa_decimals INT DEFAULT 0,
ADD COLUMN asa_unit_name VARCHAR(8),
ADD COLUMN asa_metadata_hash VARCHAR(64),
ADD COLUMN asa_url VARCHAR(96),
ADD COLUMN asa_created_at TIMESTAMP,
ADD COLUMN asa_tx_id VARCHAR(52),
ADD COLUMN verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verification_date TIMESTAMP;

-- Create index on ASA ID for quick lookups
CREATE INDEX idx_assets_asa_id ON assets(asa_id);
CREATE INDEX idx_assets_verified ON assets(verified);
CREATE INDEX idx_assets_asa_network ON assets(asa_network);

-- Create transactions table for atomic swaps
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    tx_id VARCHAR(52) UNIQUE NOT NULL,
    group_id VARCHAR(52),
    transaction_type VARCHAR(20) NOT NULL, -- 'payment', 'asset_transfer', 'atomic_swap'
    from_address VARCHAR(58) NOT NULL,
    to_address VARCHAR(58) NOT NULL,
    asset_id BIGINT, -- NULL for ALGO payments
    amount BIGINT NOT NULL,
    fee BIGINT,
    note TEXT,
    confirmed_round BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    network VARCHAR(20) DEFAULT 'testnet'
);

-- Create index on transactions
CREATE INDEX idx_transactions_tx_id ON transactions(tx_id);
CREATE INDEX idx_transactions_from ON transactions(from_address);
CREATE INDEX idx_transactions_to ON transactions(to_address);
CREATE INDEX idx_transactions_asset ON transactions(asset_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- Create asset_holders table
CREATE TABLE IF NOT EXISTS asset_holders (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id),
    asa_id BIGINT NOT NULL,
    holder_address VARCHAR(58) NOT NULL,
    balance BIGINT NOT NULL DEFAULT 0,
    opted_in BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, holder_address)
);

-- Create index on asset holders
CREATE INDEX idx_asset_holders_asset ON asset_holders(asset_id);
CREATE INDEX idx_asset_holders_address ON asset_holders(holder_address);
CREATE INDEX idx_asset_holders_asa ON asset_holders(asa_id);

-- Create income_distributions table (for Week 6)
CREATE TABLE IF NOT EXISTS income_distributions (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id),
    asa_id BIGINT NOT NULL,
    distribution_round INT NOT NULL,
    total_amount BIGINT NOT NULL, -- Total ALGO distributed (microAlgos)
    per_unit_amount BIGINT NOT NULL, -- ALGO per ASA unit
    distribution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tx_id VARCHAR(52),
    status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'completed', 'failed'
);

-- Create income_claims table
CREATE TABLE IF NOT EXISTS income_claims (
    id SERIAL PRIMARY KEY,
    distribution_id INT REFERENCES income_distributions(id),
    holder_address VARCHAR(58) NOT NULL,
    claimable_amount BIGINT NOT NULL,
    claimed_amount BIGINT DEFAULT 0,
    claim_date TIMESTAMP,
    claim_tx_id VARCHAR(52),
    status VARCHAR(20) DEFAULT 'unclaimed', -- 'unclaimed', 'claimed', 'failed'
    UNIQUE(distribution_id, holder_address)
);

-- Create verification_logs table (for Week 3)
CREATE TABLE IF NOT EXISTS verification_logs (
    id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(id),
    asa_id BIGINT NOT NULL,
    verifier_address VARCHAR(58) NOT NULL,
    verification_status VARCHAR(20) NOT NULL, -- 'approved', 'rejected'
    reason TEXT,
    tx_id VARCHAR(52),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON COLUMN assets.asa_id IS 'Algorand Standard Asset ID from blockchain';
COMMENT ON COLUMN assets.asa_creator IS 'Algorand address that created the ASA';
COMMENT ON COLUMN assets.asa_network IS 'testnet or mainnet';
COMMENT ON COLUMN assets.asa_manager IS 'Address that can modify ASA configuration';
COMMENT ON COLUMN assets.asa_freeze IS 'Address that can freeze ASA for accounts';
COMMENT ON COLUMN assets.asa_clawback IS 'Address that can reclaim ASA';
COMMENT ON COLUMN assets.verified IS 'Whether asset has been verified by admin/oracle';
COMMENT ON TABLE transactions IS 'All Algorand transactions (payments, ASA transfers, atomic swaps)';
COMMENT ON TABLE asset_holders IS 'Track ASA holders and balances';
COMMENT ON TABLE income_distributions IS 'Revenue distribution events to ASA holders';
COMMENT ON TABLE income_claims IS 'Individual holder income claims';
COMMENT ON TABLE verification_logs IS 'Asset verification audit trail';

-- Create view for asset with Algorand data
CREATE OR REPLACE VIEW assets_with_algorand AS
SELECT 
    a.*,
    CASE 
        WHEN a.asa_id IS NOT NULL THEN 
            CONCAT('https://', 
                   CASE WHEN a.asa_network = 'mainnet' THEN '' ELSE 'testnet.' END,
                   'algoexplorer.io/asset/', 
                   a.asa_id)
    END as explorer_url,
    COUNT(DISTINCT ah.holder_address) as holder_count,
    SUM(ah.balance) as circulating_supply
FROM assets a
LEFT JOIN asset_holders ah ON a.id = ah.asset_id
GROUP BY a.id;

-- Create view for transaction history
CREATE OR REPLACE VIEW transaction_history AS
SELECT 
    t.*,
    a.name as asset_name,
    a.asa_unit_name,
    CONCAT('https://', 
           CASE WHEN t.network = 'mainnet' THEN '' ELSE 'testnet.' END,
           'algoexplorer.io/tx/', 
           t.tx_id) as transaction_url
FROM transactions t
LEFT JOIN assets a ON t.asset_id = a.asa_id
ORDER BY t.timestamp DESC;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON assets TO backend_user;
-- GRANT SELECT, INSERT ON transactions TO backend_user;
-- GRANT SELECT, INSERT, UPDATE ON asset_holders TO backend_user;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Algorand ASA migration completed successfully!';
    RAISE NOTICE 'Added columns: asa_id, asa_creator, asa_network, and more to assets table';
    RAISE NOTICE 'Created tables: transactions, asset_holders, income_distributions, income_claims, verification_logs';
    RAISE NOTICE 'Created views: assets_with_algorand, transaction_history';
END $$;
