# @mission-control/sdk

Lightweight SDK to send AI agent events to a [Mission Control](https://github.com/ClaudevGuy/mission-control) dashboard.

## Install

```bash
npm install @mission-control/sdk
```

## Quick Start

```typescript
import { MissionControl } from '@mission-control/sdk'

const mc = new MissionControl({
  url: 'https://your-dashboard.vercel.app',
  apiKey: 'mc_your_api_key',  // from Settings → API Keys
  source: 'my-app',
})

// Track a completed agent run
await mc.trackRun({
  agent: { id: 'agent-1', name: 'CodeReviewer', model: 'claude-sonnet-4-6' },
  status: 'completed',
  tokensIn: 150,
  tokensOut: 89,
  cost: 0.0023,
  duration: 1840,
})
```

## API

### `new MissionControl(config)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | string | Yes | Your Mission Control dashboard URL |
| `apiKey` | string | Yes | API key from Settings → API Keys |
| `source` | string | Yes | Identifier for your app (e.g. 'my-saas', 'paperclip') |

### `mc.trackRun(options)`

Track an agent run (started, completed, or failed).

```typescript
await mc.trackRun({
  agent: { id: 'a1', name: 'DataPipeline' },
  status: 'completed',  // 'started' | 'completed' | 'failed'
  model: 'gpt-4o',
  tokensIn: 500,
  tokensOut: 200,
  cost: 0.01,
  duration: 3200,  // ms
})
```

### `mc.trackStatus(options)`

Track a status change without a run.

```typescript
await mc.trackStatus({
  agent: { id: 'a1', name: 'DataPipeline' },
  status: 'paused',
})
```

### `mc.trackCost(options)`

Track cost independently of runs.

```typescript
await mc.trackCost({
  agent: { id: 'a1', name: 'DataPipeline' },
  cost: 0.05,
  model: 'claude-sonnet-4-6',
})
```

### `mc.send(event)` / `mc.sendBatch(events)`

Send raw events for full control. Batch supports up to 100 events.

## Event Types

| Type | Description |
|------|-------------|
| `agent.run.started` | Agent began executing a task |
| `agent.run.completed` | Agent finished successfully |
| `agent.run.failed` | Agent run failed with error |
| `agent.status.changed` | Agent status changed (idle, running, paused, etc.) |
| `cost.incurred` | Cost event without a full run |

## Framework Examples

### With Paperclip

```typescript
import { MissionControl } from '@mission-control/sdk'

const mc = new MissionControl({
  url: process.env.MISSION_CONTROL_URL!,
  apiKey: process.env.MISSION_CONTROL_KEY!,
  source: 'paperclip',
})

// After each agent completes work:
paperclip.on('agent:complete', async (result) => {
  await mc.trackRun({
    agent: { id: result.agentId, name: result.agentName },
    status: 'completed',
    cost: result.cost,
    duration: result.duration,
  })
})
```

### With CrewAI

```python
# Python: use requests directly
import requests

requests.post(
    f"{MISSION_CONTROL_URL}/api/events/ingest",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "type": "agent.run.completed",
        "source": "crewai",
        "agent": {"id": "researcher", "name": "Researcher Agent"},
        "data": {"status": "completed", "cost": 0.03, "duration": 5000}
    }
)
```

## License

MIT
