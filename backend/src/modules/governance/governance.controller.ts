import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { GovernanceService } from './governance.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ProposalStatus } from './entities/proposal.entity';
import { Public } from '../auth/guards/jwt-auth.guard';

@ApiTags('Governance')
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Public()
  @Get('proposals')
  @ApiOperation({ summary: 'List governance proposals' })
  @ApiQuery({ name: 'status', required: false, enum: ProposalStatus })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'Paginated proposals' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: ProposalStatus,
    @Query('type') type?: string,
  ) {
    return this.governanceService.findAllProposals(pagination, { status, type });
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Get governance statistics' })
  getStats() {
    return this.governanceService.getStats();
  }

  @Public()
  @Get('proposals/:id')
  @ApiOperation({ summary: 'Get proposal by ID' })
  findOne(@Param('id') id: string) {
    return this.governanceService.findProposal(id);
  }

  @Post('proposals')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new proposal (auth required)' })
  @ApiResponse({ status: 201, description: 'Proposal created' })
  createProposal(@Body() body: any) {
    return this.governanceService.createProposal(body);
  }

  @Post('proposals/:id/vote')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cast a vote (auth required)' })
  @ApiResponse({ status: 201, description: 'Vote recorded' })
  castVote(
    @Param('id') id: string,
    @Body() body: { voterAddress: string; vote: 'for' | 'against'; weight: number; txId?: string },
  ) {
    return this.governanceService.castVote(id, body.voterAddress, body.vote, body.weight, body.txId);
  }

  @Public()
  @Get('proposals/:id/votes')
  @ApiOperation({ summary: 'Get all votes for a proposal' })
  getVotes(@Param('id') id: string) {
    return this.governanceService.getVotes(id);
  }
}
