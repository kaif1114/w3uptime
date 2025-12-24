import "server-only";


export async function register() {
  
  if (process.env.NEXT_RUNTIME !== "edge") {
    
    const { initializeConnection } = await import("@/lib/pg");
    console.log("Initializing PostgreSQL connection on application startup...");
    initializeConnection();

    
    try {
      console.log("Initializing escalation workers...");
      const { WorkerManager } = await import("@/lib/workerManager");

      const workerManager = WorkerManager.getInstance();
      await workerManager.initializeWorkers();
      console.log("Escalation workers initialized successfully");
    } catch (error) {
      console.error("Failed to initialize escalation workers:", error);
    }

    
    try {
      console.log("Initializing blockchain listener...");
      const { startBlockchainListener } = await import("@/lib/BlockchainListener");
      
      startBlockchainListener();
      console.log("Blockchain listener initialized successfully");
    } catch (error) {
      console.error("Failed to initialize blockchain listener:", error);
    }

    // Start governance proposal listener
    try {
      console.log("Initializing governance proposal listener...");
      const { startProposalListener } = await import("@/lib/services/ProposalListener");
      
      await startProposalListener();
      console.log("Governance proposal listener initialized successfully");
    } catch (error) {
      console.error("Failed to initialize governance proposal listener:", error);
    }

    // Start vote cache listener
    try {
      console.log("Initializing vote cache listener...");
      const { startVoteCacheListener } = await import("@/lib/services/VoteCacheListener");
      
      await startVoteCacheListener();
      console.log("Vote cache listener initialized successfully");
    } catch (error) {
      console.error("Failed to initialize vote cache listener:", error);
    }
  }
}
