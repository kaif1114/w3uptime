import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import WorkerManager from "@/lib/workerManager";
import { escalationQueue } from "@/lib/queue";


export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const workerManager = WorkerManager.getInstance();
    const workerStatus = workerManager.getStatus();
    
    
    const queueStats = {
      waiting: await escalationQueue.getWaiting().then(jobs => jobs.length),
      active: await escalationQueue.getActive().then(jobs => jobs.length),
      completed: await escalationQueue.getCompleted().then(jobs => jobs.length),
      failed: await escalationQueue.getFailed().then(jobs => jobs.length),
      delayed: await escalationQueue.getDelayed().then(jobs => jobs.length),
    };

    return NextResponse.json({
      workers: workerStatus,
      queue: {
        name: 'escalation',
        stats: queueStats,
        totalJobs: Object.values(queueStats).reduce((sum, count) => sum + count, 0),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting worker status:", error);
    return NextResponse.json(
      { 
        error: "Failed to get worker status",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});


export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const { action } = body;

    const workerManager = WorkerManager.getInstance();

    switch (action) {
      case 'restart':
        await workerManager.restartWorkers();
        return NextResponse.json({
          message: "Workers restarted successfully",
          timestamp: new Date().toISOString(),
        });

      case 'start':
        await workerManager.initializeWorkers();
        return NextResponse.json({
          message: "Workers started successfully",
          timestamp: new Date().toISOString(),
        });

      case 'stop':
        await workerManager.stopWorkers();
        return NextResponse.json({
          message: "Workers stopped successfully",
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported actions: start, stop, restart" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error controlling workers:", error);
    return NextResponse.json(
      { 
        error: "Failed to control workers",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});