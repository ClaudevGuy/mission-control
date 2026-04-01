export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getProjectId, ApiError } from "@/lib/api-helpers";

// ── GET /api/logs/stream ──
// Server-Sent Events endpoint for live log updates
// Polls the database every 2 seconds for new log entries

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const projectId = await getProjectId();

    const encoder = new TextEncoder();
    let lastTimestamp = new Date();
    let isClosed = false;

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial keep-alive
        controller.enqueue(encoder.encode(": connected\n\n"));

        const poll = async () => {
          if (isClosed) return;

          try {
            const newEntries = await prisma.logEntry.findMany({
              where: {
                projectId,
                timestamp: { gt: lastTimestamp },
              },
              orderBy: { timestamp: "asc" },
              take: 50,
            });

            if (newEntries.length > 0) {
              lastTimestamp = newEntries[newEntries.length - 1].timestamp;

              for (const entry of newEntries) {
                const data = JSON.stringify(entry);
                controller.enqueue(
                  encoder.encode(`event: log\ndata: ${data}\n\n`)
                );
              }
            }

            // Send heartbeat to keep connection alive
            controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
          } catch (error) {
            if (!isClosed) {
              console.error("SSE poll error:", error);
              controller.enqueue(
                encoder.encode(
                  `event: error\ndata: ${JSON.stringify({ message: "Poll error" })}\n\n`
                )
              );
            }
          }

          if (!isClosed) {
            setTimeout(poll, 2000);
          }
        };

        // Start polling
        poll();

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          isClosed = true;
          try {
            controller.close();
          } catch {
            // already closed
          }
        });
      },
      cancel() {
        isClosed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
