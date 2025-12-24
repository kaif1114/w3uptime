import { ethers } from "ethers";
import { prisma } from "db/client";

export abstract class BaseBlockListener<TContract extends ethers.BaseContract> {
  protected provider: ethers.Provider | null = null;
  protected contract: TContract | null = null;
  protected isListening = false;
  protected lastProcessedBlock = 0;
  protected pollingInterval = 12000; // 12 seconds
  protected pollingTimer: NodeJS.Timeout | null = null;
  protected maxReconnectAttempts = 5;
  protected reconnectAttempts = 0;
  protected chunkSize = 10;

  // Abstract methods each listener implements
  abstract getListenerName(): string;
  abstract getEventFilters(): (ethers.DeferredTopicFilter | ethers.EventFilter)[];
  abstract processEvent(event: ethers.Log): Promise<void>;
  abstract createContract(provider: ethers.Provider): TContract;

  async start() {
    if (this.isListening) {
      console.log(`[${this.getListenerName()}] Already running`);
      return;
    }

    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL;
      if (!rpcUrl) {
        throw new Error("ETHEREUM_RPC_URL environment variable is required");
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contract = this.createContract(this.provider);

      const network = await this.provider.getNetwork();
      console.log(`[${this.getListenerName()}] Connected to ${network.name}`);

      // Load last processed block from DB
      this.lastProcessedBlock = await this.getStartBlock();

      this.isListening = true;
      this.reconnectAttempts = 0;

      // Process past events since last sync
      await this.processPastEvents();

      // Start polling loop
      this.pollForNewBlocks();

      console.log(`[${this.getListenerName()}] Started at block ${this.lastProcessedBlock}`);
    } catch (error) {
      console.error(`[${this.getListenerName()}] Failed to start:`, error);
      await this.handleReconnect();
    }
  }

  async stop() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }

    // Save current block height
    await this.saveLastProcessedBlock(this.lastProcessedBlock);

    if (this.provider) {
      this.provider = null;
    }

    this.contract = null;
    this.isListening = false;
    console.log(`[${this.getListenerName()}] Stopped at block ${this.lastProcessedBlock}`);
  }

  private async pollForNewBlocks() {
    if (!this.isListening || !this.provider) return;

    try {
      const currentBlock = await this.provider.getBlockNumber();

      if (currentBlock > this.lastProcessedBlock) {
        console.log(`[${this.getListenerName()}] New blocks: ${this.lastProcessedBlock + 1} to ${currentBlock}`);

        await this.processBlockRange(
          this.lastProcessedBlock + 1,
          currentBlock
        );

        this.lastProcessedBlock = currentBlock;

        // Persist every 100 blocks
        if (currentBlock % 100 === 0) {
          await this.saveLastProcessedBlock(currentBlock);
        }
      }

      this.reconnectAttempts = 0; // Reset on success
    } catch (error) {
      console.error(`[${this.getListenerName()}] Polling error:`, error);
      await this.handleReconnect();
      return; // Don't schedule next poll
    }

    // Schedule next poll
    this.pollingTimer = setTimeout(() => this.pollForNewBlocks(), this.pollingInterval);
  }

  private async processBlockRange(fromBlock: number, toBlock: number) {
    if (!this.contract) return;

    const filters = this.getEventFilters();

    for (let start = fromBlock; start <= toBlock; start += this.chunkSize) {
      const end = Math.min(start + this.chunkSize - 1, toBlock);

      try {
        // Query all event types in parallel using contract.queryFilter
        // This automatically filters by contract address AND event signature
        const eventArrays = await Promise.all(
          filters.map(async (filter) => {
            // contract.queryFilter handles DeferredTopicFilter correctly and includes contract address
            return await (this.contract!.queryFilter as (
              filter: ethers.DeferredTopicFilter | ethers.EventFilter,
              fromBlock: number,
              toBlock: number
            ) => Promise<ethers.Log[]>)(filter, start, end);
          })
        );

        // Flatten and sort by block number
        const allEvents = eventArrays.flat().sort((a, b) => a.blockNumber - b.blockNumber);

        if (allEvents.length > 0) {
          console.log(`[${this.getListenerName()}] Found ${allEvents.length} events in blocks ${start}-${end}`);
        }

        for (const event of allEvents) {
          await this.processEvent(event);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (chunkError) {
        console.error(`[${this.getListenerName()}] Error in blocks ${start}-${end}:`, chunkError);
        // Continue with next chunk
      }
    }
  }

  private async processPastEvents() {
    if (!this.provider || !this.contract) return;

    const currentBlock = await this.provider.getBlockNumber();
    const blocksToCheck = 50;
    const fromBlock = Math.max(0, currentBlock - blocksToCheck);

    console.log(`[${this.getListenerName()}] Checking past events from ${fromBlock} to ${currentBlock}`);

    await this.processBlockRange(fromBlock, currentBlock);
    this.lastProcessedBlock = currentBlock;
  }

  private async getStartBlock(): Promise<number> {
    try {
      const syncState = await prisma.blockchainSyncState.findUnique({
        where: { listenerName: this.getListenerName() }
      });

      if (syncState) {
        console.log(`[${this.getListenerName()}] Resuming from block ${syncState.lastBlock}`);
        return syncState.lastBlock;
      }
    } catch (error) {
      console.warn(`[${this.getListenerName()}] Could not load sync state:`, error);
    }

    // Default: start from 50 blocks ago
    const currentBlock = await this.provider!.getBlockNumber();
    return Math.max(0, currentBlock - 50);
  }

  private async saveLastProcessedBlock(block: number) {
    try {
      await prisma.blockchainSyncState.upsert({
        where: { listenerName: this.getListenerName() },
        create: {
          listenerName: this.getListenerName(),
          lastBlock: block
        },
        update: {
          lastBlock: block
        }
      });
    } catch (error) {
      console.error(`[${this.getListenerName()}] Failed to save sync state:`, error);
    }
  }

  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[${this.getListenerName()}] Max reconnect attempts reached`);
      await this.stop();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`[${this.getListenerName()}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.isListening = false;
    if (this.provider) this.provider = null;
    if (this.contract) this.contract = null;

    setTimeout(() => this.start(), delay);
  }

  getStatus() {
    return {
      isListening: this.isListening,
      hasProvider: !!this.provider,
      hasContract: !!this.contract,
      reconnectAttempts: this.reconnectAttempts,
      lastProcessedBlock: this.lastProcessedBlock
    };
  }
}
