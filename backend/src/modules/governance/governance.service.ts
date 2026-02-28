import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal, ProposalStatus, Vote } from './entities/proposal.entity';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
  ) {}

  async findAllProposals(
    pagination: PaginationDto,
    filters?: { status?: ProposalStatus; type?: string },
  ): Promise<PaginatedResponseDto<Proposal>> {
    const { page, limit } = pagination;
    const qb = this.proposalRepo.createQueryBuilder('proposal');

    if (filters?.status) {
      qb.andWhere('proposal.status = :status', { status: filters.status });
    }
    if (filters?.type) {
      qb.andWhere('proposal.type = :type', { type: filters.type });
    }

    qb.orderBy('proposal.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }

  async findProposal(id: string): Promise<Proposal> {
    const proposal = await this.proposalRepo.findOne({ where: { id } });
    if (!proposal) throw new NotFoundException(`Proposal ${id} not found`);
    return proposal;
  }

  async createProposal(data: Partial<Proposal>): Promise<Proposal> {
    const proposal = this.proposalRepo.create(data);
    const saved = await this.proposalRepo.save(proposal);
    this.logger.log(`Proposal created: ${saved.id} — ${saved.title}`);
    return saved;
  }

  async castVote(
    proposalId: string,
    voterAddress: string,
    vote: 'for' | 'against',
    weight: number,
    txId?: string,
  ): Promise<Vote> {
    const proposal = await this.findProposal(proposalId);

    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException('Proposal is not active');
    }
    if (new Date() > proposal.votingEnds) {
      throw new BadRequestException('Voting period has ended');
    }

    // Check for duplicate vote
    const existing = await this.voteRepo.findOne({
      where: { proposalId, voterAddress },
    });
    if (existing) {
      throw new BadRequestException('Already voted on this proposal');
    }

    const voteRecord = this.voteRepo.create({
      proposalId,
      voterAddress,
      vote,
      weight,
      txId,
    });
    const savedVote = await this.voteRepo.save(voteRecord);

    // Update proposal tallies
    if (vote === 'for') {
      proposal.votesFor = Number(proposal.votesFor) + weight;
    } else {
      proposal.votesAgainst = Number(proposal.votesAgainst) + weight;
    }
    await this.proposalRepo.save(proposal);

    return savedVote;
  }

  async getVotes(proposalId: string): Promise<Vote[]> {
    return this.voteRepo.find({
      where: { proposalId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStats() {
    const total = await this.proposalRepo.count();
    const active = await this.proposalRepo.count({ where: { status: ProposalStatus.ACTIVE } });
    const passed = await this.proposalRepo.count({ where: { status: ProposalStatus.PASSED } });
    const rejected = await this.proposalRepo.count({ where: { status: ProposalStatus.REJECTED } });

    return { total, active, passed, rejected };
  }
}
