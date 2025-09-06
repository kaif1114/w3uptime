export enum ProposalType {
  FEATURE_REQUEST = "FEATURE_REQUEST",
  CHANGE_REQUEST = "CHANGE_REQUEST",
}

export enum ProposalStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  IMPLEMENTED = "IMPLEMENTED",
}

export enum VoteType {
  UPVOTE = "UPVOTE",
  DOWNVOTE = "DOWNVOTE",
}

export interface User {
  id: string;
  walletAddress: string;
}

export interface ProposalVote {
  id: string;
  proposalId: string;
  userId: string;
  vote: VoteType;
  createdAt: Date;
}

export interface ProposalComment {
  id: string;
  proposalId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: User;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: ProposalType;
  status: ProposalStatus;
  tags: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  votes: ProposalVote[];
  comments: ProposalComment[];
}

export interface CreateProposalData {
  title: string;
  description: string;
  type: ProposalType;
  tags?: string[];
}

export interface CreateCommentData {
  content: string;
}

export interface VoteData {
  vote: VoteType;
}

export interface ProposalsResponse {
  data: Proposal[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProposalResponse {
  proposal: Proposal;
}

export interface CommentResponse {
  comment: ProposalComment;
}

export interface VoteResponse {
  vote: ProposalVote;
  message?: string;
}

export interface CreateProposalResponse {
  proposal: Proposal;
}

export interface ProposalFilters {
  page?: number;
  pageSize?: number;
  type?: ProposalType;
  status?: ProposalStatus;
  q?: string;
}
