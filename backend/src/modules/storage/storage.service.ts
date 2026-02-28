import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as http from 'http';

export interface IpfsUploadResult {
  cid: string;
  uri: string;
  gatewayUrl: string;
  size: number;
  timestamp: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly pinataApiKey: string;
  private readonly pinataSecret: string;
  private readonly pinataGateway: string;

  constructor(private readonly configService: ConfigService) {
    this.pinataApiKey = this.configService.get<string>('ipfs.pinataApiKey') || '';
    this.pinataSecret = this.configService.get<string>('ipfs.pinataSecretKey') || '';
    this.pinataGateway = this.configService.get<string>('ipfs.gateway') || 'https://gateway.pinata.cloud/ipfs';
  }

  /**
   * Pin JSON metadata to IPFS via Pinata
   */
  async pinJSON(data: Record<string, any>, name?: string): Promise<IpfsUploadResult> {
    const body = JSON.stringify({
      pinataContent: data,
      pinataMetadata: { name: name || `assetlinked-${Date.now()}` },
    });

    const result = await this.pinataRequest('/pinning/pinJSONToIPFS', body);
    const parsed = JSON.parse(result);

    this.logger.log(`Pinned JSON to IPFS: ${parsed.IpfsHash}`);

    return {
      cid: parsed.IpfsHash,
      uri: `ipfs://${parsed.IpfsHash}`,
      gatewayUrl: `${this.pinataGateway}/${parsed.IpfsHash}`,
      size: parsed.PinSize,
      timestamp: parsed.Timestamp,
    };
  }

  /**
   * Fetch pinned content from IPFS gateway
   */
  async fetchFromIPFS(cid: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = `${this.pinataGateway}/${cid}`;
      const client = url.startsWith('https') ? https : http;
      client.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Unpin content from IPFS via Pinata
   */
  async unpin(cid: string): Promise<boolean> {
    try {
      await this.pinataRequest(`/pinning/unpin/${cid}`, null, 'DELETE');
      this.logger.log(`Unpinned CID: ${cid}`);
      return true;
    } catch {
      this.logger.warn(`Failed to unpin CID: ${cid}`);
      return false;
    }
  }

  /**
   * Build an ARC-3 compliant metadata JSON for an ASA
   */
  buildAssetMetadata(params: {
    name: string;
    unitName: string;
    description: string;
    image?: string;
    properties?: Record<string, any>;
  }) {
    return {
      name: params.name,
      unit_name: params.unitName,
      description: params.description,
      image: params.image || '',
      image_mimetype: 'image/png',
      properties: {
        ...params.properties,
        platform: 'AssetLinked',
        standard: 'ARC-3',
        created_at: new Date().toISOString(),
      },
    };
  }

  /** Check Pinata connectivity */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.pinataRequest('/data/testAuthentication', null, 'GET');
      const parsed = JSON.parse(result);
      return !!parsed.message;
    } catch {
      return false;
    }
  }

  /** Internal: Make authenticated request to Pinata API */
  private pinataRequest(path: string, body?: string | null, method = 'POST'): Promise<string> {
    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: 'api.pinata.cloud',
        path: `/api/v0${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: this.pinataApiKey,
          pinata_secret_api_key: this.pinataSecret,
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Pinata ${res.statusCode}: ${data}`));
          } else {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }
}
