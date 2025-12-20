import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";
import {
  requireReputation,
  MIN_REP_FOR_PROPOSAL,
} from "./ReputationGuard";
import { generateContentHash } from "@/lib/governance";
import { JsonRpcProvider } from "ethers";
import { createGovernanceContract } from "common/governance-contract";

const createProposalSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(["FEATURE_REQUEST", "CHANGE_REQUEST"]),
  tags: z.array(z.string()).optional().default([]),
  createOnChain: z.boolean().optional().default(false),
  txHash: z.string().optional(),
});

/**
 * Verify proposal creation transaction on Sepolia blockchain
 * Extracts ProposalCreated event from transaction logs
 */
async function verifyProposalTransaction(
  txHash: string,
  contentHash: string,
  proposerAddress: string
): Promise<{ onChainId: number; blockNumber: number }> {
  const rpcUrl = process.env.ETHEREUM_RPC_URL;
  if (!rpcUrl) {
    throw new Error("ETHEREUM_RPC_URL not configured");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  
  // Get transaction receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    throw new Error("Transaction not found");
  }

  // Check if transaction was successful
  if (receipt.status !== 1) {
    throw new Error("Transaction failed on blockchain");
  }

  // Parse logs to find ProposalCreated event
  const contract = createGovernanceContract(provider);
  const proposalCreatedTopic = contract.interface.getEvent("ProposalCreated")!.topicHash;

  const proposalCreatedLog = receipt.logs.find(
    (log) => log.topics[0] === proposalCreatedTopic
  );

  if (!proposalCreatedLog) {
    throw new Error("ProposalCreated event not found in transaction logs");
  }

  // Decode event
  const parsedLog = contract.interface.parseLog({
    topics: [...proposalCreatedLog.topics],
    data: proposalCreatedLog.data,
  });

  if (!parsedLog) {
    throw new Error("Failed to parse ProposalCreated event");
  }

  const { proposalId, proposer, contentHash: eventContentHash } = parsedLog.args;

  // Verify content hash matches
  if (eventContentHash !== contentHash) {
    throw new Error("Content hash mismatch between expected and on-chain");
  }

  // Verify proposer matches user's wallet
  if (proposer.toLowerCase() !== proposerAddress.toLowerCase()) {
    throw new Error("Proposer address mismatch");
  }

  return {
    onChainId: Number(proposalId),
    blockNumber: receipt.blockNumber,
  };
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const repCheck = await requireReputation(user.id, MIN_REP_FOR_PROPOSAL);
    if (!repCheck.ok) {
      return NextResponse.json(
        {
          error: "Insufficient reputation to create proposals",
        },
        { status: 403 }
      );
    }
    const body = await req.json();
    const validation = createProposalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }

    const { title, description, type, tags, createOnChain, txHash } = validation.data;

    // Generate content hash for proposal
    const contentHash = generateContentHash(title, description);

    // Initialize on-chain fields
    let onChainData: {
      onChainId?: number;
      contentHash: string;
      creationTxHash?: string;
      votingEndsAt?: Date;
      onChainStatus: "DRAFT" | "PENDING_ONCHAIN" | "ACTIVE";
    } = {
      contentHash,
      onChainStatus: "DRAFT",
    };

    // If on-chain creation requested, verify transaction
    if (createOnChain) {
      if (!txHash) {
        return NextResponse.json(
          { error: "Transaction hash required for on-chain proposal creation" },
          { status: 400 }
        );
      }

      if (!user.walletAddress) {
        return NextResponse.json(
          { error: "User wallet address not found" },
          { status: 400 }
        );
      }

      try {
        // Verify the transaction and extract on-chain ID
        const { onChainId, blockNumber } = await verifyProposalTransaction(
          txHash,
          contentHash,
          user.walletAddress
        );

        // Calculate voting end time (7 days from now)
        const votingEndsAt = new Date();
        votingEndsAt.setDate(votingEndsAt.getDate() + 7);

        onChainData = {
          onChainId,
          contentHash,
          creationTxHash: txHash,
          votingEndsAt,
          onChainStatus: "ACTIVE",
        };

        console.log(`Verified on-chain proposal creation: ID ${onChainId}, block ${blockNumber}`);
      } catch (error) {
        console.error("Failed to verify proposal transaction:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
          { error: `Transaction verification failed: ${errorMessage}` },
          { status: 400 }
        );
      }
    }

    // Create proposal with on-chain data
    const proposal = await prisma.proposal.create({
      data: {
        title,
        description,
        type,
        tags,
        userId: user.id,
        ...onChainData,
      },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
          },
        },
      },
    });

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error("Failed to create proposal:", error);
    return NextResponse.json(
      { error: "Failed to create proposal" },
      { status: 500 }
    );
  }
});


export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Math.min(Number(searchParams.get("pageSize") || "10"), 50);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const query = searchParams.get("q");

    
    const where: Record<string, unknown> = {};

    if (type && type !== "all") {
      where.type = type;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    
    const skip = (page - 1) * pageSize;

    
    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
            },
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  walletAddress: true,
                },
              },
            },
          },
          voteCaches: true,
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  walletAddress: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.proposal.count({ where }),
    ]);

    return NextResponse.json({
      data: proposals,
      page,
      pageSize,
      total,
    });
  } catch (error) {
    console.error("Failed to fetch proposals:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
};
