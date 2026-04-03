/**
 * @mission-control/sdk
 *
 * Lightweight SDK to send AI agent events to a Mission Control dashboard.
 *
 * Usage:
 *   import { MissionControl } from '@mission-control/sdk'
 *
 *   const mc = new MissionControl({
 *     url: 'https://your-dashboard.vercel.app',
 *     apiKey: 'mc_your_api_key',
 *     source: 'my-app',
 *   })
 *
 *   // Track an agent run
 *   await mc.trackRun({
 *     agent: { id: 'agent-1', name: 'CodeReviewer' },
 *     status: 'completed',
 *     model: 'claude-sonnet-4-6',
 *     tokensIn: 150,
 *     tokensOut: 89,
 *     cost: 0.0023,
 *     duration: 1840,
 *   })
 */

// ── Types ──

export interface MissionControlConfig {
  /** URL of your Mission Control instance (e.g. https://mc.example.com) */
  url: string;
  /** API key from Settings → API Keys */
  apiKey: string;
  /** Source identifier (e.g. 'paperclip', 'crewai', 'my-app') */
  source: string;
}

export interface AgentRef {
  /** Unique agent ID in your system */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** Optional description */
  description?: string;
  /** Model being used (e.g. 'claude-sonnet-4-6') */
  model?: string;
}

export interface TrackRunOptions {
  agent: AgentRef;
  status: "started" | "completed" | "failed";
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackStatusOptions {
  agent: AgentRef;
  status: string;
  metadata?: Record<string, unknown>;
}

export interface TrackCostOptions {
  agent: AgentRef;
  cost: number;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  metadata?: Record<string, unknown>;
}

type EventType =
  | "agent.run.started"
  | "agent.run.completed"
  | "agent.run.failed"
  | "agent.status.changed"
  | "cost.incurred";

interface IngestEvent {
  type: EventType;
  source: string;
  agent: AgentRef;
  data?: Record<string, unknown>;
}

// ── Client ──

export class MissionControl {
  private url: string;
  private apiKey: string;
  private source: string;

  constructor(config: MissionControlConfig) {
    this.url = config.url.replace(/\/$/, ""); // strip trailing slash
    this.apiKey = config.apiKey;
    this.source = config.source;
  }

  /**
   * Send a raw event to the ingest endpoint.
   * Most users should use trackRun(), trackStatus(), or trackCost() instead.
   */
  async send(event: IngestEvent): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.url}/api/events/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        return { ok: false, error: data.error || `HTTP ${res.status}` };
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  /**
   * Send a batch of events (up to 100).
   */
  async sendBatch(events: IngestEvent[]): Promise<{ ok: boolean; processed?: number; error?: string }> {
    try {
      const res = await fetch(`${this.url}/api/events/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ events }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Unknown error" }));
        return { ok: false, error: data.error || `HTTP ${res.status}` };
      }

      const data = await res.json();
      return { ok: true, processed: data.processed };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  /**
   * Track an agent run (started, completed, or failed).
   *
   * @example
   * await mc.trackRun({
   *   agent: { id: 'a1', name: 'CodeReviewer', model: 'claude-sonnet-4-6' },
   *   status: 'completed',
   *   tokensIn: 150,
   *   tokensOut: 89,
   *   cost: 0.0023,
   *   duration: 1840,
   * })
   */
  async trackRun(options: TrackRunOptions) {
    const typeMap: Record<string, EventType> = {
      started: "agent.run.started",
      completed: "agent.run.completed",
      failed: "agent.run.failed",
    };

    return this.send({
      type: typeMap[options.status] || "agent.run.completed",
      source: this.source,
      agent: {
        ...options.agent,
        ...(options.model && { model: options.model }),
      },
      data: {
        status: options.status,
        tokensIn: options.tokensIn,
        tokensOut: options.tokensOut,
        cost: options.cost,
        duration: options.duration,
        error: options.error,
        metadata: options.metadata,
      },
    });
  }

  /**
   * Track an agent status change.
   *
   * @example
   * await mc.trackStatus({
   *   agent: { id: 'a1', name: 'CodeReviewer' },
   *   status: 'idle',
   * })
   */
  async trackStatus(options: TrackStatusOptions) {
    return this.send({
      type: "agent.status.changed",
      source: this.source,
      agent: options.agent,
      data: {
        status: options.status,
        metadata: options.metadata,
      },
    });
  }

  /**
   * Track a cost event (useful for tracking spend independently of runs).
   *
   * @example
   * await mc.trackCost({
   *   agent: { id: 'a1', name: 'CodeReviewer' },
   *   cost: 0.05,
   *   model: 'claude-sonnet-4-6',
   * })
   */
  async trackCost(options: TrackCostOptions) {
    return this.send({
      type: "cost.incurred",
      source: this.source,
      agent: options.agent,
      data: {
        cost: options.cost,
        tokensIn: options.tokensIn,
        tokensOut: options.tokensOut,
        metadata: options.metadata,
      },
    });
  }
}

export default MissionControl;
