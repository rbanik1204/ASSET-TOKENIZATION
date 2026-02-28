import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AlgorandService } from '../wallet/services/algorand.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Contract identifiers matching the PyTeal build output.
 */
export enum ContractName {
  ASSET_REGISTRY = 'AssetRegistry',
  VERIFICATION = 'Verification',
  MARKETPLACE_ESCROW = 'MarketplaceEscrow',
  GOVERNANCE_VOTING = 'GovernanceVoting',
  INCOME_DISTRIBUTION = 'IncomeDistribution',
}

export interface ContractAbi {
  name: string;
  methods: Array<{
    name: string;
    desc?: string;
    args: Array<{ type: string; name?: string; desc?: string }>;
    returns: { type: string; desc?: string };
  }>;
  networks?: Record<string, { appID: number }>;
}

export interface DeploymentManifest {
  version: string;
  network: string;
  deployer: string;
  deployed_at: string;
  contracts: Record<
    string,
    { app_id?: number; app_address?: string; error?: string }
  >;
}

interface ContractRecord {
  name: ContractName;
  abi: ContractAbi;
  approvalTeal: string;
  clearTeal: string;
  appId: number | null;       // populated from manifest
  appAddress: string | null;
}

@Injectable()
export class ContractsService implements OnModuleInit {
  private readonly logger = new Logger(ContractsService.name);
  private contracts = new Map<ContractName, ContractRecord>();
  private manifest: DeploymentManifest | null = null;

  /** Paths (relative to the monorepo root) */
  private readonly buildDir = path.resolve(
    __dirname,
    '..', '..', '..', '..', 'contracts', 'build',
  );
  private readonly abiDir = path.resolve(
    __dirname,
    '..', '..', '..', '..', 'contracts', 'abi',
  );
  private readonly deployDir = path.resolve(
    __dirname,
    '..', '..', '..', '..', 'contracts', 'deploy',
  );

  private static readonly FILE_MAP: Record<
    ContractName,
    { approval: string; clear: string; abi: string }
  > = {
    [ContractName.ASSET_REGISTRY]: {
      approval: 'asset_registry_approval.teal',
      clear: 'asset_registry_clear.teal',
      abi: 'asset_registry_contract.json',
    },
    [ContractName.VERIFICATION]: {
      approval: 'verification_approval.teal',
      clear: 'verification_clear.teal',
      abi: 'verification_contract.json',
    },
    [ContractName.MARKETPLACE_ESCROW]: {
      approval: 'marketplace_approval.teal',
      clear: 'marketplace_clear.teal',
      abi: 'marketplace_contract.json',
    },
    [ContractName.GOVERNANCE_VOTING]: {
      approval: 'governance_approval.teal',
      clear: 'governance_clear.teal',
      abi: 'governance_contract.json',
    },
    [ContractName.INCOME_DISTRIBUTION]: {
      approval: 'income_approval.teal',
      clear: 'income_clear.teal',
      abi: 'income_contract.json',
    },
  };

  constructor(private readonly algorand: AlgorandService) {}

  async onModuleInit() {
    this.loadContracts();
    this.loadManifest();
    this.logger.log(
      `Loaded ${this.contracts.size} contract ABIs` +
        (this.manifest ? ` — deployment manifest v${this.manifest.version}` : ''),
    );
  }

  // ── Loaders ────────────────────────────────────────────────────────────

  private loadContracts(): void {
    for (const [name, files] of Object.entries(ContractsService.FILE_MAP)) {
      try {
        const approvalPath = path.join(this.buildDir, files.approval);
        const clearPath = path.join(this.buildDir, files.clear);
        const abiPath = path.join(this.buildDir, files.abi);

        const approvalTeal = fs.readFileSync(approvalPath, 'utf-8');
        const clearTeal = fs.readFileSync(clearPath, 'utf-8');
        const abi: ContractAbi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));

        this.contracts.set(name as ContractName, {
          name: name as ContractName,
          abi,
          approvalTeal,
          clearTeal,
          appId: null,
          appAddress: null,
        });
      } catch (err: any) {
        this.logger.warn(`Could not load contract ${name}: ${err.message}`);
      }
    }
  }

  private loadManifest(): void {
    const manifestPath = path.join(this.deployDir, 'deployment_manifest.json');
    if (!fs.existsSync(manifestPath)) return;

    try {
      this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (this.manifest?.contracts) {
        for (const [name, data] of Object.entries(this.manifest.contracts)) {
          const record = this.contracts.get(name as ContractName);
          if (record && data.app_id) {
            record.appId = data.app_id;
            record.appAddress = data.app_address || null;
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not load deployment manifest: ${err.message}`);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /** Get all loaded contract records. */
  getAll(): ContractRecord[] {
    return Array.from(this.contracts.values());
  }

  /** Get a single contract. */
  getContract(name: ContractName): ContractRecord | undefined {
    return this.contracts.get(name);
  }

  /** Get the ABI for a contract. */
  getAbi(name: ContractName): ContractAbi | undefined {
    return this.contracts.get(name)?.abi;
  }

  /** Get the deployed app ID for a contract (or null). */
  getAppId(name: ContractName): number | null {
    return this.contracts.get(name)?.appId ?? null;
  }

  /** Get the unified ABI manifest. */
  getUnifiedAbi(): Record<string, ContractAbi> {
    const result: Record<string, ContractAbi> = {};
    for (const [name, record] of this.contracts.entries()) {
      result[name] = record.abi;
    }
    return result;
  }

  /** Get the deployment manifest (or null if not deployed). */
  getDeploymentManifest(): DeploymentManifest | null {
    return this.manifest;
  }

  /** Summary for the /contracts/info endpoint. */
  getSummary() {
    return {
      totalContracts: this.contracts.size,
      contracts: Array.from(this.contracts.entries()).map(([name, c]) => ({
        name,
        methods: c.abi.methods?.length ?? 0,
        methodNames: c.abi.methods?.map((m) => m.name) ?? [],
        appId: c.appId,
        appAddress: c.appAddress,
        deployed: c.appId !== null,
      })),
      deployment: this.manifest
        ? {
            version: this.manifest.version,
            network: this.manifest.network,
            deployer: this.manifest.deployer,
            deployedAt: this.manifest.deployed_at,
          }
        : null,
    };
  }

  /** Compile TEAL source to bytecode via algod. */
  async compileTeal(source: string): Promise<Uint8Array> {
    const client = this.algorand.getAlgodClient();
    const result = await client.compile(Buffer.from(source)).do();
    return new Uint8Array(Buffer.from(result.result, 'base64'));
  }

  /** Read application global state. */
  async readAppGlobalState(appId: number): Promise<Record<string, any>> {
    const client = this.algorand.getAlgodClient();
    const appInfo = await client.getApplicationByID(appId).do();
    const state: Record<string, any> = {};

    const globalState = (appInfo as any).params?.['global-state'] || [];
    for (const kv of globalState) {
      const key = Buffer.from(kv.key, 'base64').toString('utf-8');
      if (kv.value.type === 1) {
        state[key] = Buffer.from(kv.value.bytes, 'base64').toString('hex');
      } else {
        state[key] = kv.value.uint;
      }
    }
    return state;
  }
}
