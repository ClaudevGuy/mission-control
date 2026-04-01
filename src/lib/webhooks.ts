import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function deliverWebhook(params: {
  projectId: string;
  event: string;       // e.g., "agent.run.completed"
  payload: unknown;
}): Promise<void> {
  // 1. Find all active webhooks for this project that subscribe to this event
  const webhooks = await prisma.webhook.findMany({
    where: {
      projectId: params.projectId,
      status: "ACTIVE",
      events: { has: params.event },
    },
  });

  if (webhooks.length === 0) return;

  const body = JSON.stringify({
    event: params.event,
    timestamp: new Date().toISOString(),
    payload: params.payload,
  });

  // 2. For each webhook, deliver the payload
  await Promise.allSettled(
    webhooks.map(async (webhook) => {
      try {
        // a. Sign the payload with HMAC-SHA256 using the webhook secret
        const signature = crypto
          .createHmac("sha256", webhook.secret)
          .update(body)
          .digest("hex");

        // b. POST to the webhook URL with the signed payload
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": `sha256=${signature}`,
            "X-Webhook-Event": params.event,
            "X-Webhook-Timestamp": new Date().toISOString(),
          },
          body,
          signal: AbortSignal.timeout(10_000), // 10s timeout
        });

        // c. Update lastDelivery and successRate
        const newRate = response.ok
          ? Math.min(100, webhook.successRate * 0.95 + 100 * 0.05)
          : Math.max(0, webhook.successRate * 0.95);

        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastDelivery: new Date(),
            successRate: Math.round(newRate * 100) / 100,
          },
        });
      } catch (error) {
        // d. Log any failures and degrade success rate
        console.error(
          `Webhook delivery failed for ${webhook.id} (${webhook.url}):`,
          error
        );

        const degradedRate = Math.max(0, webhook.successRate * 0.95);
        await prisma.webhook
          .update({
            where: { id: webhook.id },
            data: {
              lastDelivery: new Date(),
              successRate: Math.round(degradedRate * 100) / 100,
            },
          })
          .catch(() => {});
      }
    })
  );
}
