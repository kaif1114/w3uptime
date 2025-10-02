import { ethers } from "ethers";
import { createContractInstance, CONTRACT_ADDRESS, ContractInstance } from "common/contract";
import { prisma } from "db/client";


class BlockchainListener {
  private provider: ethers.Provider | null = null;
  private contract: ContractInstance | null = null;
  private isListening = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async startListening() {
    if (this.isListening) {
      console.log("Blockchain listener is already running");
      return;
    }

    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL;
      if (!rpcUrl) {
        throw new Error("ETHEREUM_RPC_URL environment variable is required");
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contract = createContractInstance(this.provider);

      // Test connection
      const network = await this.provider.getNetwork();
      console.log(`Connected to Ethereum network: ${network.name} (${network.chainId})`);

      // Listen for FundsDeposited events
      this.contract.on("FundsDeposited", this.handleDepositEvent.bind(this));

      // Listen for Withdrawal events
      this.contract.on("Withdrawal", this.handleWithdrawalEvent.bind(this));

      // Handle provider errors
      this.provider.on("error", this.handleProviderError.bind(this));

      this.isListening = true;
      this.reconnectAttempts = 0;
      console.log(`Listening for FundsDeposited and Withdrawal events on contract: ${CONTRACT_ADDRESS}`);

      // Process past events (last 100 blocks)
      await this.processPastEvents();

    } catch (error) {
      console.error("Failed to start blockchain listener:", error);
      await this.handleReconnect();
    }
  }

  private async processPastEvents() {
    if (!this.contract || !this.provider) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      const blocksToCheck = 50; // Reduced from 100 to be more conservative
      const chunkSize = 10; // Max blocks per request for free tier
      const fromBlock = Math.max(0, currentBlock - blocksToCheck);

      console.log(`Checking for past FundsDeposited and Withdrawal events from block ${fromBlock} to ${currentBlock} in chunks of ${chunkSize}`);

      const depositFilter = this.contract.filters.FundsDeposited();
      const withdrawalFilter = this.contract.filters.Withdrawal();
      let allEvents: ethers.Log[] = [];

      // Process in chunks to avoid rate limits
      for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock);
        
        try {
          console.log(`Querying events from block ${start} to ${end}`);
          
          // Query both deposit and withdrawal events
          const [depositEvents, withdrawalEvents] = await Promise.all([
            this.contract.queryFilter(depositFilter, start, end),
            this.contract.queryFilter(withdrawalFilter, start, end)
          ]);
          
          console.log(`Found ${depositEvents.length} deposit events and ${withdrawalEvents.length} withdrawal events in blocks ${start}-${end}`);
          allEvents = allEvents.concat(depositEvents, withdrawalEvents);
          
          // Small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (chunkError) {
          console.error(`Error querying events for blocks ${start}-${end}:`, chunkError);
          // Continue with next chunk even if one fails
        }
      }

      for (const event of allEvents) {
        await this.processEvent(event, undefined);
      }

      console.log(`Processed ${allEvents.length} past events (deposits and withdrawals) from ${blocksToCheck} blocks`);
    } catch (error) {
      console.error("Error processing past events:", error);
    }
  }

  private async handleDepositEvent(...args: unknown[]) {
    // Last argument is the event
    const event = args[args.length - 1] as { log?: ethers.Log; args: unknown[] } & ethers.Log;
    const log = event.log || event;
    await this.processDepositEvent(log, event.args);
  }

  private async handleWithdrawalEvent(...args: unknown[]) {
    // Last argument is the event  
    const event = args[args.length - 1] as { log?: ethers.Log; args: unknown[] } & ethers.Log;
    const log = event.log || event;
    await this.processWithdrawalEvent(log, event.args);
  }

  private async processEvent(event: ethers.Log, precomputedArgs?: unknown[]) {
    try {
      if (!this.contract) return;

      // Determine event type by parsing the log
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

      if (parsedEvent?.name === "FundsDeposited") {
        await this.processDepositEvent(event, precomputedArgs);
      } else if (parsedEvent?.name === "Withdrawal") {
        await this.processWithdrawalEvent(event, precomputedArgs);
      }
    } catch (error) {
      console.error("Error processing event:", error);
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

      // Validate this is from our contract
      if (event.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        console.warn('Event not from our contract, skipping:', event.address);
        return;
      }

      // Use precomputed args if available (from ContractEventPayload), otherwise parse
      let from: string, amount: bigint, timestamp: bigint;
      
      if (precomputedArgs && precomputedArgs.length >= 3) {
        from = precomputedArgs[0] as string;
        amount = precomputedArgs[1] as bigint;
        timestamp = precomputedArgs[2] as bigint;
        console.log('Using precomputed args from ContractEventPayload');
      } else {
        // Fallback to parsing the log manually
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

      // Check if transaction already exists
      const existingTransaction = await prisma.transaction.findUnique({
        where: { transactionHash: event.transactionHash }
      });

      if (existingTransaction) {
        console.log("Transaction already processed:", event.transactionHash);
        return;
      }

      const normalizedAddress = from.toLowerCase();

      console.log("Normalized address:", normalizedAddress);

      // Find or create user
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

      // Process the deposit in a transaction
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

        // Update user balance
        const amountWei = BigInt(amount.toString());
        const amountEth = Number(amountWei) / Math.pow(10, 18);
        const balanceIncrement = Math.floor(amountEth * 1000); // Store as integer (1000 = 1 ETH)

        await tx.user.update({
          where: { walletAddress: normalizedAddress },
          data: {
            balance: {
              increment: balanceIncrement
            }
          }
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

      // Validate this is from our contract
      if (event.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) {
        console.warn('Event not from our contract, skipping:', event.address);
        return;
      }

      // Use precomputed args if available (from ContractEventPayload), otherwise parse
      let user: string, amount: bigint, nonce: bigint, timestamp: bigint;
      
      if (precomputedArgs && precomputedArgs.length >= 4) {
        user = precomputedArgs[0] as string;
        amount = precomputedArgs[1] as bigint;
        nonce = precomputedArgs[2] as bigint;
        timestamp = precomputedArgs[3] as bigint;
        console.log('Using precomputed args from ContractEventPayload');
      } else {
        // Fallback to parsing the log manually
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

      // Check if transaction already exists with this hash
      const existingTransaction = await prisma.transaction.findUnique({
        where: { transactionHash: event.transactionHash }
      });

      if (existingTransaction) {
        console.log("Transaction already processed:", event.transactionHash);
        // If it exists but is still pending, update it to confirmed
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

      // Find user - withdrawal events only come from existing users
      const existingUser = await prisma.user.findUnique({
        where: { walletAddress: normalizedAddress }
      });

      if (!existingUser) {
        console.error("User not found for withdrawal:", normalizedAddress);
        return;
      }

      // Look for any pending withdrawal for this user with matching amount
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

      // Process the withdrawal in a transaction
      await prisma.$transaction(async (tx) => {
        if (pendingWithdrawal) {
          // Update existing pending withdrawal
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
          // Create new withdrawal record (fallback case)
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

        // Update user balance (decrement for confirmed withdrawal)
        const amountWei = BigInt(amount.toString());
        const amountEth = Number(amountWei) / Math.pow(10, 18);
        const balanceDecrement = Math.floor(amountEth * 1000); // Store as integer (1000 = 1 ETH)

        await tx.user.update({
          where: { walletAddress: normalizedAddress },
          data: {
            balance: {
              decrement: balanceDecrement
            }
          }
        });
      });

      console.log(`Withdrawal processed successfully for user ${normalizedAddress}: ${ethers.formatEther(amount)} ETH`);

    } catch (error) {
      console.error("Error processing withdrawal event:", error);
    }
  }

  private async handleProviderError(error: unknown) {
    console.error("Provider error:", error);
    this.isListening = false;
    await this.handleReconnect();
  }

  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached. Stopping blockchain listener.");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      await this.stopListening();
      await this.startListening();
    }, delay);
  }

  async stopListening() {
    if (!this.isListening) return;

    if (this.contract) {
      // Remove all listeners for FundsDeposited events
      this.contract.removeAllListeners();
      this.contract = null;
    }

    if (this.provider) {
      this.provider.removeAllListeners("error");
      this.provider = null;
    }

    this.isListening = false;
    console.log("Stopped blockchain listener");
  }

  getStatus() {
    return {
      isListening: this.isListening,
      contractAddress: CONTRACT_ADDRESS,
      hasProvider: !!this.provider,
      hasContract: !!this.contract,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Global instance
let blockchainListener: BlockchainListener | null = null;

export function startBlockchainListener() {
  if (blockchainListener) {
    console.log("Blockchain listener already exists");
    return blockchainListener;
  }

  blockchainListener = new BlockchainListener();
  
  blockchainListener.startListening().catch((error) => {
    console.error("Failed to start blockchain listener:", error);
  });

  return blockchainListener;
}

export function stopBlockchainListener() {
  if (blockchainListener) {
    blockchainListener.stopListening();
    blockchainListener = null;
  }
}

export function getBlockchainListenerStatus() {
  return blockchainListener?.getStatus() || {
    isListening: false,
    contractAddress: CONTRACT_ADDRESS,
    hasProvider: false,
    hasContract: false,
    reconnectAttempts: 0
  };
}