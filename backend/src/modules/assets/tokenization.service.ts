import {
  Injectable, Logger, NotFoundException, BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import algosdk from 'algosdk';
import { createHash } from 'crypto';

import { AlgorandService } from '../wallet/services/algorand.service';
import { StorageService } from '../storage/storage.service';
import { KycService } from '../kyc/kyc.service';
import { Asset, AssetCategory, TokenizationStatus, VerificationStatus } from './entities/asset.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { AssetHolder } from './entities/asset-holder.entity';
import { PrepareTokenizationDto, ConfirmTokenizationDto, ComplianceActionDto } from './dto/create-asset.dto';

// ── Supply-rule constraints ─────────────────────────────────────
const SUPPLY_RULES: Record<AssetCategory, { maxSupply: number; maxDecimals: number }> = {
  [AssetCategory.REAL_ESTATE]:      { maxSupply: 100_000_000,       maxDecimals: 6 },
  [AssetCategory.ENERGY]:           { maxSupply: 1_000_000_000,     maxDecimals: 6 },
  [AssetCategory.COMMODITIES]:      { maxSupply: 10_000_000_000,    maxDecimals: 8 },
  [AssetCategory.INFRASTRUCTURE]:   { maxSupply: 500_000_000,       maxDecimals: 6 },
  [AssetCategory.SECURITIES]:       { maxSupply: 1_000_000_000,     maxDecimals: 8 },
  [AssetCategory.OTHER]:            { maxSupply: 10_000_000_000,    maxDecimals: 19 },
};

/**
 * Orchestrates the full tokenization pipeline:
 *   Prepare → IPFS pin → Build unsigned txn → Confirm on-chain → DB link
 */
@Injectable()
export class TokenizationService {
  private readonly logger = new Logger(TokenizationService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepo: Repository<Asset>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    @InjectRepository(AssetHolder)
    private readonly holderRepo: Repository<AssetHolder>,
    private readonly algorand: AlgorandService,
    private readonly storage: StorageService,
    private readonly kycService: KycService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // 1.  PREPARE  —  validate → pin IPFS → build unsigned txn
  // ═══════════════════════════════════════════════════════════════

  async prepare(dto: PrepareTokenizationDto) {
    // ── 0. KYC gate — creator must be verified ────────────
    const kycVerified = await this.kycService.isVerified(dto.creator);
    if (!kycVerified) {
      throw new ForbiddenException(
        'KYC verification required before tokenizing assets. ' +
        'Please complete your identity verification first.',
      );
    }

    // ── 1a. Enforce category-specific supply rules ────────
    this.enforceSupplyRules(dto);

    // ── 1b. Build ARC-3 metadata JSON ─────────────────────
    const arc3Metadata = this.buildARC3Metadata(dto);

    // ── 1c. Pin metadata to IPFS ──────────────────────────
    let ipfsResult: { cid: string; uri: string; gatewayUrl: string };
    try {
      ipfsResult = await this.storage.pinJSON(arc3Metadata, `${dto.unitName}-metadata`);
      this.logger.log(`Pinned ARC-3 metadata → CID: ${ipfsResult.cid}`);
    } catch (err) {
      this.logger.warn(`IPFS pin failed (Pinata), using local fallback — ${err}`);
      // Generate a deterministic mock CID for demo / when Pinata keys aren't set
      const hash = createHash('sha256')
        .update(JSON.stringify(arc3Metadata))
        .digest('hex')
        .slice(0, 46);
      ipfsResult = {
        cid: `Qm${hash}`,
        uri: `ipfs://Qm${hash}`,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/Qm${hash}`,
      };
    }

    // ── 1d. Compute metadata hash (SHA-256, first 32 bytes) ─
    const metadataBytes = new TextEncoder().encode(JSON.stringify(arc3Metadata));
    const hashBuffer = createHash('sha256').update(metadataBytes).digest();
    const metadataHash = new Uint8Array(hashBuffer.buffer, 0, 32);

    // ── 1e. Save DRAFT asset record in DB ─────────────────
    const asset = this.assetRepo.create({
      name: dto.name,
      unitName: dto.unitName,
      description: dto.description || '',
      category: dto.category,
      totalSupply: dto.totalSupply,
      decimals: dto.decimals,
      ownerAddress: dto.creator,
      asaCreator: dto.creator,
      asaManager: dto.manager || dto.creator,
      asaReserve: dto.reserve || dto.creator,
      asaFreeze: dto.freeze || dto.creator,
      asaClawback: dto.clawback || dto.creator,
      asaNetwork: this.algorand.getNetwork(),
      asaUrl: dto.url || ipfsResult.gatewayUrl,
      defaultFrozen: dto.defaultFrozen ?? false,
      freezeEnabled: !!(dto.freeze || dto.creator),
      clawbackEnabled: !!(dto.clawback || dto.creator),
      metadataHash: Buffer.from(metadataHash).toString('hex'),
      ipfsCid: ipfsResult.cid,
      ipfsMetadataUri: ipfsResult.uri,
      ipfsDocumentCids: dto.documentCids || [],
      supportingDocuments: dto.supportingDocuments || [],
      pricePerUnit: dto.pricePerUnit ?? 0,
      currency: dto.currency || 'ALGO',
      tokenizationStatus: TokenizationStatus.METADATA_PINNED,
      verificationStatus: VerificationStatus.PENDING,
    });

    const saved = await this.assetRepo.save(asset);
    this.logger.log(`Asset draft created: ${saved.id} — ${saved.name}`);

    // ── 1f. Build unsigned ASA creation transaction ───────
    const suggestedParams = await this.algorand.getSuggestedParams();

    const asaUrl = (dto.url || `ipfs://${ipfsResult.cid}#arc3`).slice(0, 96);

    const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
      sender: dto.creator,
      total: BigInt(dto.totalSupply),
      decimals: dto.decimals,
      defaultFrozen: dto.defaultFrozen ?? false,
      manager: dto.manager || dto.creator,
      reserve: dto.reserve || dto.creator,
      freeze: dto.freeze || dto.creator,
      clawback: dto.clawback || dto.creator,
      unitName: dto.unitName,
      assetName: dto.name.slice(0, 32), // Algorand max 32 chars
      assetURL: asaUrl,
      assetMetadataHash: metadataHash,
      suggestedParams,
    });

    // Encode the unsigned txn to base64 so the frontend can deserialize & sign
    const unsignedTxnBytes = algosdk.encodeUnsignedTransaction(txn);
    const unsignedTxnB64 = Buffer.from(unsignedTxnBytes).toString('base64');

    return {
      assetRecordId: saved.id,
      unsignedTxn: unsignedTxnB64,
      ipfs: {
        cid: ipfsResult.cid,
        uri: ipfsResult.uri,
        gatewayUrl: ipfsResult.gatewayUrl,
      },
      metadata: arc3Metadata,
      metadataHash: Buffer.from(metadataHash).toString('hex'),
      suggestedParams: {
        fee: Number(suggestedParams.fee),
        firstValid: Number(suggestedParams.firstValid),
        lastValid: Number(suggestedParams.lastValid),
        genesisID: suggestedParams.genesisID,
        genesisHash: suggestedParams.genesisHash,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 2.  CONFIRM  —  link on-chain ASA to DB record
  // ═══════════════════════════════════════════════════════════════

  async confirm(dto: ConfirmTokenizationDto) {
    const asset = await this.assetRepo.findOne({ where: { id: dto.assetRecordId } });
    if (!asset) throw new NotFoundException(`Asset record ${dto.assetRecordId} not found`);

    if (asset.tokenizationStatus === TokenizationStatus.FULLY_LINKED) {
      throw new BadRequestException('Asset is already fully tokenized');
    }

    // Verify the transaction on-chain
    let confirmedRound: number | undefined;
    try {
      const txInfo = await this.algorand.getAlgodClient()
        .pendingTransactionInformation(dto.txId)
        .do();

      confirmedRound = typeof txInfo?.confirmedRound === 'bigint'
        ? Number(txInfo.confirmedRound)
        : txInfo?.confirmedRound;

      if (!confirmedRound || confirmedRound === 0) {
        // Txn may still be pending — wait a bit
        await new Promise(r => setTimeout(r, 4500));
        const retryInfo = await this.algorand.getAlgodClient()
          .pendingTransactionInformation(dto.txId)
          .do();
        confirmedRound = typeof retryInfo?.confirmedRound === 'bigint'
          ? Number(retryInfo.confirmedRound)
          : retryInfo?.confirmedRound;
      }
    } catch (err) {
      this.logger.warn(`Could not verify txn ${dto.txId} on-chain: ${err}`);
      // Still proceed — the txId + asaId may be valid; indexer will catch up
    }

    // Update asset record with on-chain data
    asset.asaId = dto.asaId;
    asset.asaTxId = dto.txId;
    asset.tokenizationStatus = TokenizationStatus.ASA_CREATED;

    // Verify ASA exists on-chain via indexer (best-effort)
    try {
      const assetInfo = await this.algorand.getAssetInfo(dto.asaId);
      const params = assetInfo?.asset?.params || assetInfo?.params || {};
      // Ensure core fields match
      if (params['unit-name'] && params['unit-name'] !== asset.unitName) {
        this.logger.warn(`Unit-name mismatch: chain=${params['unit-name']} db=${asset.unitName}`);
      }
      asset.tokenizationStatus = TokenizationStatus.FULLY_LINKED;
    } catch {
      this.logger.warn(`Indexer lookup for ASA ${dto.asaId} not yet available`);
      // Mark as ASA_CREATED — async indexer sync will upgrade later
      asset.tokenizationStatus = TokenizationStatus.ASA_CREATED;
    }

    const saved = await this.assetRepo.save(asset);

    // Record the creation transaction in DB
    try {
      await this.txRepo.save(this.txRepo.create({
        txId: dto.txId,
        transactionType: TransactionType.ASSET_CREATE,
        fromAddress: asset.asaCreator,
        toAddress: asset.asaCreator,
        assetId: dto.asaId,
        amount: asset.totalSupply,
        network: asset.asaNetwork,
        confirmedRound: confirmedRound ?? undefined,
        note: `ASA created: ${asset.name} (${asset.unitName})`,
      }));
    } catch (err) {
      this.logger.warn(`Failed to record creation txn: ${err}`);
    }

    // Create initial holder record
    try {
      await this.holderRepo.save(this.holderRepo.create({
        asaId: dto.asaId,
        holderAddress: asset.asaCreator,
        balance: asset.totalSupply,
        optedIn: true,
      }));
    } catch (err) {
      this.logger.warn(`Failed to create holder record: ${err}`);
    }

    this.logger.log(
      `Asset tokenized: ${saved.id} → ASA ${dto.asaId} — ` +
      `IPFS ${saved.ipfsCid} — status: ${saved.tokenizationStatus}`,
    );

    return {
      id: saved.id,
      asaId: saved.asaId,
      txId: saved.asaTxId,
      tokenizationStatus: saved.tokenizationStatus,
      ipfsCid: saved.ipfsCid,
      explorerUrl: this.algorand.getExplorerAssetUrl(dto.asaId),
      explorerTxUrl: this.algorand.getExplorerTxUrl(dto.txId),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3.  COMPLIANCE — freeze / clawback unsigned txn builders
  // ═══════════════════════════════════════════════════════════════

  /**
   * Build an unsigned Asset Freeze transaction.
   * The frontend wallet must sign and submit it.
   */
  async buildFreezeTxn(asaId: number, targetAddress: string, frozen: boolean, senderAddress: string) {
    const asset = await this.assetRepo.findOne({ where: { asaId } });
    if (!asset) throw new NotFoundException(`Asset with ASA ID ${asaId} not found`);
    if (!asset.freezeEnabled) throw new ForbiddenException('Freeze is disabled for this asset');
    if (asset.asaFreeze !== senderAddress) {
      throw new ForbiddenException('Only the freeze address can freeze/unfreeze');
    }

    const suggestedParams = await this.algorand.getSuggestedParams();
    const txn = algosdk.makeAssetFreezeTxnWithSuggestedParamsFromObject({
      sender: senderAddress,
      assetIndex: asaId,
      freezeTarget: targetAddress,
      frozen,
      suggestedParams,
    });

    const txnB64 = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');

    return {
      unsignedTxn: txnB64,
      action: frozen ? 'freeze' : 'unfreeze',
      asaId,
      targetAddress,
    };
  }

  /**
   * Build an unsigned Asset Clawback (revocation) transaction.
   * The frontend wallet must sign and submit it.
   */
  async buildClawbackTxn(dto: ComplianceActionDto, senderAddress: string) {
    const asset = await this.assetRepo.findOne({ where: { asaId: dto.asaId } });
    if (!asset) throw new NotFoundException(`Asset with ASA ID ${dto.asaId} not found`);
    if (!asset.clawbackEnabled) throw new ForbiddenException('Clawback is disabled for this asset');
    if (asset.asaClawback !== senderAddress) {
      throw new ForbiddenException('Only the clawback address can revoke tokens');
    }
    if (!dto.targetAddress) throw new BadRequestException('targetAddress is required for clawback');
    if (!dto.amount) throw new BadRequestException('amount is required for clawback');

    const suggestedParams = await this.algorand.getSuggestedParams();
    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: senderAddress,          // clawback address sends the txn
      receiver: asset.asaCreator,     // tokens go back to creator
      assetIndex: dto.asaId,
      amount: BigInt(dto.amount),
      assetSender: dto.targetAddress,       // address to clawback from (revocation target)
      suggestedParams,
    });

    const txnB64 = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');

    // Update compliance note
    if (dto.reason) {
      asset.complianceNote = [asset.complianceNote, `[${new Date().toISOString()}] Clawback: ${dto.reason}`]
        .filter(Boolean).join('\n');
      await this.assetRepo.save(asset);
    }

    return {
      unsignedTxn: txnB64,
      action: 'clawback',
      asaId: dto.asaId,
      targetAddress: dto.targetAddress,
      amount: dto.amount,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 4.  STATUS  —  get tokenization pipeline status for an asset
  // ═══════════════════════════════════════════════════════════════

  async getTokenizationStatus(id: string) {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException(`Asset ${id} not found`);

    return {
      id: asset.id,
      name: asset.name,
      unitName: asset.unitName,
      category: asset.category,
      totalSupply: asset.totalSupply,
      decimals: asset.decimals,
      asaId: asset.asaId,
      asaTxId: asset.asaTxId,
      tokenizationStatus: asset.tokenizationStatus,
      verificationStatus: asset.verificationStatus,
      ipfs: {
        cid: asset.ipfsCid,
        metadataUri: asset.ipfsMetadataUri,
        documentCids: asset.ipfsDocumentCids,
      },
      compliance: {
        defaultFrozen: asset.defaultFrozen,
        isFrozen: asset.isFrozen,
        freezeEnabled: asset.freezeEnabled,
        clawbackEnabled: asset.clawbackEnabled,
        freezeAddress: asset.asaFreeze,
        clawbackAddress: asset.asaClawback,
        note: asset.complianceNote,
      },
      onChain: asset.asaId
        ? {
            explorerUrl: this.algorand.getExplorerAssetUrl(asset.asaId),
            txUrl: asset.asaTxId ? this.algorand.getExplorerTxUrl(asset.asaTxId) : null,
            network: asset.asaNetwork,
          }
        : null,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  /**
   * List all assets for an owner with tokenization details.
   */
  async listByOwner(ownerAddress: string) {
    const assets = await this.assetRepo.find({
      where: { ownerAddress },
      order: { createdAt: 'DESC' },
    });

    return assets.map(a => ({
      id: a.id,
      name: a.name,
      unitName: a.unitName,
      asaId: a.asaId,
      category: a.category,
      totalSupply: a.totalSupply,
      tokenizationStatus: a.tokenizationStatus,
      verificationStatus: a.verificationStatus,
      ipfsCid: a.ipfsCid,
      defaultFrozen: a.defaultFrozen,
      createdAt: a.createdAt,
    }));
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Enforce category-specific supply rules.
   */
  private enforceSupplyRules(dto: PrepareTokenizationDto) {
    const rules = SUPPLY_RULES[dto.category] || SUPPLY_RULES[AssetCategory.OTHER];

    if (dto.totalSupply > rules.maxSupply) {
      throw new BadRequestException(
        `Total supply ${dto.totalSupply} exceeds maximum ${rules.maxSupply} for category '${dto.category}'`,
      );
    }
    if (dto.decimals > rules.maxDecimals) {
      throw new BadRequestException(
        `Decimals ${dto.decimals} exceeds maximum ${rules.maxDecimals} for category '${dto.category}'`,
      );
    }
    // Unit name must be alphanumeric, max 8 chars (already validated by DTO)
    // Total supply must be >= 1 (already validated by DTO)
  }

  /**
   * Build an ARC-3 compliant metadata JSON for the ASA.
   * https://arc.algorand.foundation/ARCs/arc-0003
   */
  private buildARC3Metadata(dto: PrepareTokenizationDto) {
    return {
      name: dto.name,
      unit_name: dto.unitName,
      description: dto.description || `${dto.name} tokenized on Algorand Asset Protocol`,
      decimals: dto.decimals,
      total: dto.totalSupply,
      image: '',
      image_mimetype: '',
      external_url: dto.url || '',
      properties: {
        ...dto.properties,
        category: dto.category,
        platform: 'Algorand Asset Protocol',
        standard: 'ARC-3',
        default_frozen: dto.defaultFrozen ?? false,
        freeze_enabled: !!(dto.freeze || dto.creator),
        clawback_enabled: !!(dto.clawback || dto.creator),
        price_per_unit: dto.pricePerUnit ?? 0,
        currency: dto.currency || 'ALGO',
        document_cids: dto.documentCids || [],
        created_at: new Date().toISOString(),
      },
    };
  }
}
