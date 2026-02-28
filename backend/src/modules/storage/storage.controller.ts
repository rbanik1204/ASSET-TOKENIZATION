import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { StorageService } from './storage.service';

@ApiTags('Storage / IPFS')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('pin')
  @ApiOperation({ summary: 'Pin JSON metadata to IPFS via Pinata' })
  @ApiBody({ schema: { type: 'object', properties: { data: { type: 'object' }, name: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Content pinned to IPFS' })
  async pinJSON(@Body() body: { data: Record<string, any>; name?: string }) {
    return this.storageService.pinJSON(body.data, body.name);
  }

  @Get('fetch/:cid')
  @ApiOperation({ summary: 'Fetch content from IPFS by CID' })
  @ApiResponse({ status: 200, description: 'IPFS content returned' })
  async fetchContent(@Param('cid') cid: string) {
    return this.storageService.fetchFromIPFS(cid);
  }

  @Delete('unpin/:cid')
  @ApiOperation({ summary: 'Unpin content from IPFS' })
  @ApiResponse({ status: 200, description: 'Content unpinned' })
  async unpin(@Param('cid') cid: string) {
    const result = await this.storageService.unpin(cid);
    return { success: result, cid };
  }

  @Post('metadata')
  @ApiOperation({ summary: 'Build ARC-3 compliant asset metadata' })
  @ApiBody({ schema: { type: 'object', properties: { name: { type: 'string' }, unitName: { type: 'string' }, description: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'Metadata built and pinned' })
  async buildAndPinMetadata(
    @Body() body: { name: string; unitName: string; description: string; image?: string; properties?: Record<string, any> },
  ) {
    const metadata = this.storageService.buildAssetMetadata(body);
    return this.storageService.pinJSON(metadata, `${body.name}-metadata`);
  }
}
