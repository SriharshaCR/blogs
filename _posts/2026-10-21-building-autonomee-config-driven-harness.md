---
layout: post
title: "Autonomee: A Config-Driven AI Agent Harness"
date: 2026-10-21
description: "A config-driven AI agent harness that prevents four production failures by design: throw on failure, in-memory inputs, intent-aware loop, and scoped tools."
image: /assets/images/agentic-harness-an-ai-operating-system/02-building-autonomee-config-driven-harness/image-hero.webp
image_alt: "Config-driven agent harness: three agents in sequence, each with scoped tools, inside the harness boundary"
audience: "Architects, tech leads, and developers building or evaluating multi-agent pipelines"
tags: [ai-agents, agent-scaffolding, agentic-harness, llm-orchestration, ai-architecture, config-driven, enterprise-ai]
permalink: /building-autonomee-config-driven-harness/
read_time: 6
---

> **Key Takeaways**
> - **The problem:** Multi-agent pipelines fail silently, misroute work, and drift out of sync — not because the models are wrong, but because there is no harness.
> - **Why it matters:** The harness is where reliability is engineered. A config-driven design makes that reliability visible, portable, and changeable without touching code.
> - **What you'll learn:** The architecture of Autonomee — a config-driven agentic harness built to prevent the four failures from Part 1, and how each design decision maps directly to a failure it eliminates.

The previous post mapped four failures from a real three-agent pipeline to the specific harness components that were missing. This post describes what those components look like when they are built deliberately. If you haven't read it, [four production agent failures and what prevents them](/blogs/ai-agent-scaffolding-four-failures/) is the foundation — this post is the architecture response.

---

## What Autonomee Is

Autonomee is a config-driven agentic harness. It is a pattern: a way of structuring an orchestration loop so that the four failure modes from Part 1 cannot happen silently.

Three design principles:

**Config-driven.** Every agent's identity, allowed tools, model settings, input routing, and approval policy lives in a single config file. Swapping a model, adding an agent, or changing a tool scope requires no code changes — only a config update.

**Stateless.** The harness holds no memory between runs. State flows through inputs and outputs — not inside the orchestration logic. This keeps the system auditable and reproducible.

**Observable by default.** Every agent start, every tool registration, every failure, and every approval decision is logged before the harness moves to the next step. Nothing is silent.

![Autonomee architecture: three agents connected in sequence, each with a declared tool scope, inside the harness boundary]({{ "/assets/images/agentic-harness-an-ai-operating-system/02-building-autonomee-config-driven-harness/image-inline.webp" | relative_url }})

---

## The Config Schema

Each agent in the system is fully declared in the config file. The schema carries four things per agent:

**Identity.** An agent ID, a readable name, and the model it uses — including the provider and the specific model ID. The model configuration is swappable by design: changing which model an agent uses is a one-line config edit, not a code change.

**Tool scope.** A list of the tools the agent is allowed to call. The harness registers only those tools for that agent at runtime. If a tool is not in the list, the model never sees it as an option — there is no way to call it, regardless of what the model decides to do.

**Input source.** Where the agent gets its input. The two options are a file on disk, or the output of a named upstream agent. The second option is what replaces file polling: instead of reading a folder that might contain yesterday's output, the agent receives the current run's data directly from the agent that produced it.

**Approval policy.** Whether the agent's output requires human review before the pipeline proceeds. This is a boolean in config — no code change required to add or remove a human gate at any step.

The entire system — three agents, their scopes, their handoffs, their approval gates — fits in one file. Reading the config tells you exactly what the pipeline does:

```python
CONFIG = {
    'agents': [
        {
            'id': 'researcher',
            'name': 'Research Agent',
            'tools': ['search'],                              # tool scope — only search
            'input': {'source': 'config', 'key': 'topic'},  # input from config
            'approval': {'required': False},
        },
        {
            'id': 'writer',
            'name': 'Writer Agent',
            'tools': ['read'],                                        # tool scope — only read
            'input': {'source': 'agent', 'agent_id': 'researcher'}, # in-memory handoff
            'approval': {'required': False},
        },
        {
            'id': 'publisher',
            'name': 'Publisher Agent',
            'tools': ['post'],                                       # tool scope — only post
            'input': {'source': 'agent', 'agent_id': 'writer'},    # in-memory handoff
            'approval': {'required': True},                          # human gate
        },
    ]
}
```

Each decision from the next section is enforced by a field in this config — not in the orchestration code.

---

## The Harness: Four Decisions

The orchestration loop makes four specific architectural choices. Each one maps directly to a failure from Part 1.

### Decision 1 — Failures throw and propagate

In the original pipeline, Agent 2 stalled and nothing downstream knew. The loop kept running as if the pipeline was healthy. Agent 3 waited for inputs that would never arrive.

In Autonomee, every agent failure throws an error immediately. The error is logged with the agent ID, the timestamp, and the failure message. The orchestration loop stops. Downstream agents never execute on empty inputs. The first failure is the last silent one.

```python
# Before — error caught and swallowed, pipeline continues on empty output
except Exception as e:
    print(f'  error: {e}')
    results[aid] = ''   # empty string passed to downstream agents

# After — error logged and raised, pipeline stops
except Exception as e:
    log(aid, 'FAILURE', str(e))
    raise               # downstream agents never execute
```

**Failure prevented:** Silent Cascade.

### Decision 2 — Input resolved from the prior agent, not a file

The original pipeline wrote outputs to a shared folder with predefined filenames. Agents polled that folder for their inputs. With an IST/UTC timezone drift, the jobs fired at wrong intervals — and the files sitting in that folder were often from the previous run. Agents read stale data with no signal that anything was wrong.

In Autonomee, inputs are resolved in memory. The orchestration loop maintains a results map for the current run. Each agent receives the output of its upstream agent directly from that map. There is no file to read, no polling, no possibility of stale data from a prior run. The handshake is structural, not file-based.

```python
# Before — input read from file (may contain data from a prior run)
if agent_cfg['input']['source'] == 'agent':
    with open(stale_path) as f:
        agent_input = f.read()   # could be yesterday's output

# After — input resolved from in-memory results dict
if agent_cfg['input']['source'] == 'agent':
    upstream = agent_cfg['input']['agent_id']
    agent_input = results[upstream]  # only exists for the current run
```

**Failure prevented:** Timezone Trap.

### Decision 3 — The loop runs on intent, not time

The original pipeline used CRON. When the CRON job died, an email notification was never sent. The downstream agent waited indefinitely for a signal that would never come. A CRON job has no intent — it fires at a time, completes or fails, and has no memory of what it was part of.

The orchestration loop is different. It knows which agent it is running, what step it is on, what it received, and what it needs to produce next. If an agent fails, the loop decides what to do — stop, log, exit cleanly. If an approval is rejected, the loop exits and records why. Nothing waits indefinitely. Nothing fires again unless it is explicitly called.

```python
# Before — exception swallowed, loop continues to next agent
except Exception:
    results[aid] = ''   # downstream agents run on empty output

# After — exception logged, loop exits at the failure point
except RuntimeError as e:
    log(aid, 'FAILURE', str(e))
    stopped_at = aid
    break               # downstream agents never execute
```

**Failure prevented:** Dumb Executor.

### Decision 4 — Tool scope enforced at registration

In the original pipeline, an agent had access to a general capability — calling the language model directly — when the task required calling a specific provided script. There was no constraint. The model made a choice based on what was available, and it made the wrong one. Nothing in any log showed this until traces were pulled manually an hour later.

In Autonomee, tool scope is enforced at registration time. Before each agent runs, the harness builds a scoped tool registry — only the tools declared for that agent in config are made available. The model never sees tools it is not allowed to use.

```python
# Before — all tools passed to every agent
tools = ALL_TOOLS   # search, read, write, post, direct_llm — all visible

# After — only config-declared tools registered per agent
def scope_tools(agent_cfg, all_tools):
    allowed = set(agent_cfg['tools'])
    return {k: v for k, v in all_tools.items() if k in allowed}

tools = scope_tools(agent_cfg, ALL_TOOLS)  # model only sees its declared tools
```

Tool scope control is a specific form of guardrail — one that governs what an agent is allowed to *do*, not just what it is allowed to say. For the broader guardrails picture, [five production failure modes every AI deployment hits first](/blogs/ai-guardrails-what-can-go-wrong/) covers the surrounding layers.

**Failure prevented:** Wrong Tool.

---

## What You Have

At runtime, Autonomee produces a structured log — every agent event, every tool call, every failure, and every approval decision, timestamped in order. The log is the flight recorder that the original pipeline was missing.

The config file is the specification. Reading it tells you the full topology of the pipeline: what runs, in what order, with what tools, on what model, and where a human must approve before the system proceeds.

The full implementation is here, the [colab notebook](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/agentic-harness-an-ai-operating-system/02-building-autonomee-config-driven-harness/autonomee_harness_demo.ipynb) runs same pipeline two ways — raw and harness — so you can see the structural difference between the four decisions directly, using Groq's free inference tier.

I must say, this is just a working pattern, not a production framework. The next iteration adds retries with backoff, parallel agent execution, and a persistent event store. The architecture holds as those layers are added — because the foundation is stateless and config-driven.

---

## Three Questions Worth Sitting With

1. In your current agent system — where is tool scope defined? In a config file, in a prompt, or not at all?
2. If one agent in your pipeline failed right now, how many steps would it take to find it in your logs — and how many minutes?
3. What would it take to swap the model on your most expensive agent to something cheaper — one config value, or a code change?

---

*[Part 1: Four production failures and the harness components that prevent them →](/blogs/ai-agent-scaffolding-four-failures/)*

[^1]: Anthropic, [*Building Effective Agents*](https://www.anthropic.com/engineering/building-effective-agents)
[^2]: OpenAI, [*New tools for building agents*](https://openai.com/index/new-tools-for-building-agents/)
