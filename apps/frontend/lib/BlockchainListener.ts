import { ethers } from "ethers";
import { createContractInstance, CONTRACT_ADDRESS, ContractInstance } from "common/contract";
import { prisma } from "db/client";
import { Prisma } from "@prisma/client";
import { BaseBlockListener } from "./services/BaseBlockListener";

class BlockchainListener extends BaseBlockListener<ContractInstance> {
  getListenerName(): string {
    return "payment";
  }

  createContract(provider: ethers.Provider): ContractInstance {
    return createContractInstance(provider);
  }

  getEventFilters(): (ethers.DeferredTopicFilter | ethers.EventFilter)[] {
    if (!this.contract) return [];
    return [
      this.contract.filters.FundsDeposited(),
      this.contract.filters.Withdrawal()
    ];
  }

  async processEvent(event: ethers.Log): Promise<void> {
    if (!this.contract) return;

    // Parse event type
    let parsedEvent;
    try {
      parsedEvent = this.contract.interface.parseLog({
        topics: event.topics,
        data: event.data || '0x'
      });
    } catch (parseError) {
      console.error('Failed to parse event:', parseError);
      return;
    }

    // Delegate to existing handlers
    if (parsedEvent?.name === "FundsDeposited") {
      await this.processDepositEvent(event, parsedEvent.args);
    } else if (parsedEvent?.name === "Withdrawal") {
      await this.processWithdrawalEvent(event, parsedEvent.args);
    }
  }

  private async processDepositEvent(event: ethers.Log, precomputedArgs?: unknown[]) {
    try {
      if (!this.contract) return;

      console.log('Processing deposit event:', {
        address: event.address,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        hasPrecomputedArgs: !!precomputedArgs
      });

      // Verify event is from our contract
      if (event.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        console.warn('Event not from our contract, skipping:', event.address);
        return;
      }

      // Parse event arguments
      let from: string, amount: bigint, timestamp: bigint;

      if (precomputedArgs && precomputedArgs.length >= 3) {
        from = precomputedArgs[0] as string;
        amount = precomputedArgs[1] as bigint;
        timestamp = precomputedArgs[2] as bigint;
        console.log('Using precomputed args from ContractEventPayload');
      } else {
        // Parse manually
        console.log('Parsing log manually');

        if (!event.topics || event.topics.length === 0) {
          console.warn('Event has no topics, cannot parse');
          return;
        }

        let parsedEvent;
        try {
          parsedEvent = this.contract.interface.parseLog({
            topics: event.topics,
            data: event.data || '0x'
          });
        } catch (parseError) {
          console.error('Failed to parse event log:', parseError);
          return;
        }

        if (!parsedEvent || parsedEvent.name !== "FundsDeposited") {
          console.log('Not a FundsDeposited event or parsing failed');
          return;
        }

        if (!parsedEvent.args || parsedEvent.args.length < 3) {
          console.error('Parsed event missing required arguments:', parsedEvent.args);
          return;
        }

        [from, amount, timestamp] = parsedEvent.args;
      }

      console.log("Processing deposit event:", {
        from,
        amount: ethers.formatEther(amount),
        timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      });

      // Check for duplicate transaction
      const existingTransaction = await prisma.transaction.findUnique({
        where: { transactionHash: event.transactionHash }
      });

      if (existingTransaction) {
        console.log("Transaction already processed:", event.transactionHash);
        return;
      }

      const normalizedAddress = from.toLowerCase();

      console.log("Normalized address:", normalizedAddress);

      // Get or create user
      let user = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            walletAddress: normalizedAddress,
            balance: 0,
            type: 'USER'
          }
        });
      }

      // Create transaction and update balance atomically
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            type: 'DEPOSIT',
            fromAddress: normalizedAddress,
            amount: amount.toString(),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            status: 'CONFIRMED',
            createdAt: new Date(Number(timestamp) * 1000),
            processedAt: new Date(),
            userId: user!.id
          }
        });

        const amountDecimal = new Prisma.Decimal(amount.toString());
        await tx.user.update({
          where: { walletAddress: normalizedAddress },
          data: {
            balance: {
              increment: amountDecimal,
            },
          },
        });
      });

      console.log(`Deposit processed successfully for user ${normalizedAddress}: ${ethers.formatEther(amount)} ETH`);

    } catch (error) {
      console.error("Error processing deposit event:", error);
    }
  }

  private async processWithdrawalEvent(event: ethers.Log, precomputedArgs?: unknown[]) {
    try {
      if (!this.contract) return;

      console.log('Processing withdrawal event:', {
        address: event.address,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        hasPrecomputedArgs: !!precomputedArgs
      });

      // Verify event is from our contract
      if (event.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        console.warn('Event not from our contract, skipping:', event.address);
        return;
      }

      // Parse event arguments
      let user: string, amount: bigint, nonce: bigint, timestamp: bigint;

      if (precomputedArgs && precomputedArgs.length >= 4) {
        user = precomputedArgs[0] as string;
        amount = precomputedArgs[1] as bigint;
        nonce = precomputedArgs[2] as bigint;
        timestamp = precomputedArgs[3] as bigint;
        console.log('Using precomputed args from ContractEventPayload');
      } else {
        // Parse manually
        console.log('Parsing log manually');

        if (!event.topics || event.topics.length === 0) {
          console.warn('Event has no topics, cannot parse');
          return;
        }

        let parsedEvent;
        try {
          parsedEvent = this.contract.interface.parseLog({
            topics: event.topics,
            data: event.data || '0x'
          });
        } catch (parseError) {
          console.error('Failed to parse event log:', parseError);
          return;
        }

        if (!parsedEvent || parsedEvent.name !== "Withdrawal") {
          console.log('Not a Withdrawal event or parsing failed');
          return;
        }

        if (!parsedEvent.args || parsedEvent.args.length < 4) {
          console.error('Parsed event missing required arguments:', parsedEvent.args);
          return;
        }

        [user, amount, nonce, timestamp] = parsedEvent.args;
      }

      console.log("Processing withdrawal event:", {
        user,
        amount: ethers.formatEther(amount),
        nonce: nonce.toString(),
        timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber
      });

      // Check for duplicate transaction
      const existingTransaction = await prisma.transaction.findUnique({
        where: { transactionHash: event.transactionHash }
      });

      if (existingTransaction) {
        console.log("Transaction already processed:", event.transactionHash);

        if (existingTransaction.status === 'PENDING') {
          await prisma.transaction.update({
            where: { id: existingTransaction.id },
            data: {
              status: 'CONFIRMED',
              blockNumber: event.blockNumber,
              processedAt: new Date()
            }
          });
        }
        return;
      }

      const normalizedAddress = user.toLowerCase();
      console.log("Normalized address:", normalizedAddress);

      // Verify user exists
      const existingUser = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress }
      });

      if (!existingUser) {
        console.error("User not found for withdrawal:", normalizedAddress);
        return;
      }

      // Check for pending withdrawal
      const amountString = amount.toString();
      const pendingWithdrawal = await prisma.transaction.findFirst({
        where: {
          type: 'WITHDRAWAL',
          toAddress: normalizedAddress,
          amount: amountString,
          status: 'PENDING',
          userId: existingUser.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Update or create transaction and update balance atomically
      await prisma.$transaction(async (tx) => {
        if (pendingWithdrawal) {
          // Update pending withdrawal
          await tx.transaction.update({
            where: { id: pendingWithdrawal.id },
            data: {
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
              status: 'CONFIRMED',
              processedAt: new Date()
            }
          });
        } else {
          // Create new withdrawal record
          await tx.transaction.create({
            data: {
              type: 'WITHDRAWAL',
              toAddress: normalizedAddress,
              amount: amount.toString(),
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
              status: 'CONFIRMED',
              createdAt: new Date(Number(timestamp) * 1000),
              processedAt: new Date(),
              userId: existingUser.id
            }
          });
        }

        const amountDecimal = new Prisma.Decimal(amount.toString());
        await tx.user.update({
          where: { walletAddress: normalizedAddress },
          data: {
            balance: {
              decrement: amountDecimal,
            },
          },
        });
      });

      console.log(`Withdrawal processed successfully for user ${normalizedAddress}: ${ethers.formatEther(amount)} ETH`);

    } catch (error) {
      console.error("Error processing withdrawal event:", error);
    }
  }

  getStatus() {
    return {
      ...super.getStatus(),
      contractAddress: CONTRACT_ADDRESS
    };
  }
}

// Singleton instance
let blockchainListener: BlockchainListener | null = null;

export function startBlockchainListener() {
  if (blockchainListener) {
    console.log("Blockchain listener already exists");
    return blockchainListener;
  }

  blockchainListener = new BlockchainListener();

  blockchainListener.start().catch((error) => {
    console.error("Failed to start blockchain listener:", error);
  });

  return blockchainListener;
}

export function stopBlockchainListener() {
  if (blockchainListener) {
    blockchainListener.stop();
    blockchainListener = null;
  }
}

export function getBlockchainListenerStatus() {
  return blockchainListener?.getStatus() || {
    isListening: false,
    contractAddress: CONTRACT_ADDRESS,
    hasProvider: false,
    hasContract: false,
    reconnectAttempts: 0,
    lastProcessedBlock: 0
  };
}
