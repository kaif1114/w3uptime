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

      // Handle provider errors
      this.provider.on("error", this.handleProviderError.bind(this));

      this.isListening = true;
      this.reconnectAttempts = 0;
      console.log(`Listening for FundsDeposited events on contract: ${CONTRACT_ADDRESS}`);

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

      console.log(`Checking for past FundsDeposited events from block ${fromBlock} to ${currentBlock} in chunks of ${chunkSize}`);

      const filter = this.contract.filters.FundsDeposited();
      let allEvents: ethers.Log[] = [];

      // Process in chunks to avoid rate limits
      for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock);
        
        try {
          console.log(`Querying events from block ${start} to ${end}`);
          const chunkEvents = await this.contract.queryFilter(filter, start, end);
          console.log(`Found ${chunkEvents.length} events in blocks ${start}-${end}`);
          allEvents = allEvents.concat(chunkEvents);
          
          // Small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (chunkError) {
          console.error(`Error querying events for blocks ${start}-${end}:`, chunkError);
          // Continue with next chunk even if one fails
        }
      }

      for (const event of allEvents) {
        await this.processDepositEvent(event, undefined);
      }

      console.log(`Processed ${allEvents.length} past deposit events from ${blocksToCheck} blocks`);
    } catch (error) {
      console.error("Error processing past events:", error);
    }
  }

  private async handleDepositEvent(_from: string, _amount: bigint, _timestamp: bigint, event: any) {
    // The event parameter is actually a ContractEventPayload, extract the log
    const log = event.log || event;
    await this.processDepositEvent(log, event.args);
  }

  private async processDepositEvent(event: ethers.Log, precomputedArgs?: any[]) {
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
        [from, amount, timestamp] = precomputedArgs;
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

  private async handleProviderError(error: any) {
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