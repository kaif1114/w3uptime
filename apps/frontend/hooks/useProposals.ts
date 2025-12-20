import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Proposal,
  ProposalsResponse,
  ProposalResponse,
  CreateProposalData,
  CreateProposalResponse,
  CreateCommentData,
  CommentResponse,
  VoteData,
  VoteResponse,
  ProposalFilters,
  ProposalComment,
} from "@/types/proposal";

const API_BASE = "/api/proposals";


export function useProposals(filters: ProposalFilters = {}) {
  return useQuery<ProposalsResponse>({
    queryKey: ["proposals", filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (filters.page) searchParams.set("page", filters.page.toString());
      if (filters.pageSize)
        searchParams.set("pageSize", filters.pageSize.toString());
      if (filters.type) searchParams.set("type", filters.type);
      if (filters.status) searchParams.set("status", filters.status);
      if (filters.q) searchParams.set("q", filters.q);

      const response = await fetch(`${API_BASE}?${searchParams.toString()}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch proposals");
      }

      return response.json();
    },
  });
}


export function useProposal(id: string) {
  return useQuery<ProposalResponse>({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${id}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch proposal");
      }

      return response.json();
    },
    enabled: !!id,
  });
}


export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation<CreateProposalResponse, Error, CreateProposalData>({
    mutationFn: async (data) => {
      const response = await fetch(API_BASE, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create proposal");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });
}


export function useVoteProposal() {
  const queryClient = useQueryClient();

  return useMutation<
    VoteResponse,
    Error,
    { proposalId: string; vote: VoteData }
  >({
    mutationFn: async ({ proposalId, vote }) => {
      const response = await fetch(`${API_BASE}/${proposalId}/vote`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(vote),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cast vote");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({
        queryKey: ["proposal", variables.proposalId],
      });
    },
  });
}


export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation<
    CommentResponse,
    Error,
    { proposalId: string; comment: CreateCommentData }
  >({
    mutationFn: async ({ proposalId, comment }) => {
      const response = await fetch(`${API_BASE}/${proposalId}/comment`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(comment),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add comment");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      
      queryClient.invalidateQueries({
        queryKey: ["proposal", variables.proposalId],
      });
      
      queryClient.invalidateQueries({
        queryKey: ["proposal-comments", variables.proposalId],
      });
    },
  });
}


export function useProposalComments(proposalId: string) {
  return useQuery<ProposalComment[]>({
    queryKey: ["proposal-comments", proposalId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/${proposalId}/comment`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Bubble up backend error message (e.g. insufficient reputation)
        let message = "Failed to fetch comments";
        try {
          const body = await response.json();
          if (body?.error) {
            message = body.error;
          }
        } catch {
          // ignore JSON parse errors and fall back to default message
        }
        throw new Error(message);
      }

      const data = await response.json();
      return data.comments;
    },
    enabled: !!proposalId,
  });
}
