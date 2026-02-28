import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  createdAt: Date;
  votingEnds: Date;
  status: 'active' | 'passed' | 'rejected' | 'expired';
  votesFor: number;
  votesAgainst: number;
  totalVotingPower: number;
  quorumRequired: number;
  type: 'parameter' | 'asset-approval' | 'governance' | 'emergency';
  votes: Array<{
    voter: string;
    vote: 'for' | 'against';
    weight: number;
    timestamp: Date;
  }>;
}

interface GovernanceContextType {
  proposals: Proposal[];
  createProposal: (proposal: Omit<Proposal, 'id' | 'createdAt' | 'status' | 'votesFor' | 'votesAgainst' | 'votes'>) => string;
  castVote: (proposalId: string, voter: string, vote: 'for' | 'against', weight: number) => void;
  getProposal: (id: string) => Proposal | undefined;
  getActiveProposals: () => Proposal[];
}

const GovernanceContext = createContext<GovernanceContextType | undefined>(undefined);

export const useGovernance = () => {
  const context = useContext(GovernanceContext);
  if (!context) {
    throw new Error('useGovernance must be used within GovernanceProvider');
  }
  return context;
};

export const GovernanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const createProposal = useCallback((proposal: Omit<Proposal, 'id' | 'createdAt' | 'status' | 'votesFor' | 'votesAgainst' | 'votes'>): string => {
    const newProposal: Proposal = {
      ...proposal,
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      status: 'active',
      votesFor: 0,
      votesAgainst: 0,
      votes: [],
    };

    setProposals(prev => [newProposal, ...prev]);
    return newProposal.id;
  }, []);

  const castVote = useCallback((proposalId: string, voter: string, vote: 'for' | 'against', weight: number) => {
    setProposals(prev =>
      prev.map(proposal => {
        if (proposal.id !== proposalId) return proposal;

        // Check if voter already voted
        const existingVote = proposal.votes.find(v => v.voter === voter);
        if (existingVote) {
          throw new Error('Voter has already voted on this proposal');
        }

        const newVote = { voter, vote, weight, timestamp: new Date() };
        const updatedVotes = [...proposal.votes, newVote];
        const votesFor = updatedVotes.filter(v => v.vote === 'for').reduce((sum, v) => sum + v.weight, 0);
        const votesAgainst = updatedVotes.filter(v => v.vote === 'against').reduce((sum, v) => sum + v.weight, 0);

        // Update status based on voting results
        let status = proposal.status;
        const totalVotes = votesFor + votesAgainst;
        const quorumMet = totalVotes >= proposal.quorumRequired;

        if (new Date() > proposal.votingEnds) {
          if (quorumMet) {
            status = votesFor > votesAgainst ? 'passed' : 'rejected';
          } else {
            status = 'expired';
          }
        }

        return {
          ...proposal,
          votes: updatedVotes,
          votesFor,
          votesAgainst,
          status,
        };
      })
    );
  }, []);

  const getProposal = useCallback((id: string) => {
    return proposals.find(p => p.id === id);
  }, [proposals]);

  const getActiveProposals = useCallback(() => {
    return proposals.filter(p => p.status === 'active' && new Date() <= p.votingEnds);
  }, [proposals]);

  const value: GovernanceContextType = {
    proposals,
    createProposal,
    castVote,
    getProposal,
    getActiveProposals,
  };

  return <GovernanceContext.Provider value={value}>{children}</GovernanceContext.Provider>;
};
