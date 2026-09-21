---
layout: post
title: "The AI Skill Engineering Contract"
date: 2026-09-21
description: "AI skill engineering contracts explained: behavioral boundaries, capability manifests, resource budgets, and the rule about model-enforced security."
image: /assets/images/ai-skill-engineering-contract/image-hero.webp
image_alt: "Engineering blueprint of an AI skill showing four contract components"
audience: "AI engineers, platform engineers, and technical leads building or deploying AI skills in production agent workflows"
tags: [ai-skills, llm-agents, ai-engineering, skill-contracts, agent-security, generative-ai]
permalink: /ai-skill-engineering-contract/
read_time: 5
series: resourceful-ai-skill
series_name: "The Resourceful AI Skill"
post_number: 2
series_total: 3
---

# The AI Skill Engineering Contract

*Part 2 of 3 in The Resourceful AI Skill series.*

---

> **Key Takeaways**
> - **The problem:** Most AI skills ship with instructions and no contract — no stated boundaries, no resource limits, no enforced permissions.
> - **Why it matters:** A skill without a contract is an open variable. The runtime, the model, and downstream systems fill in the blanks — unpredictably.
> - **What you'll learn:** The four components every production skill needs: a behavioral contract, a capability contract, a resource budget, and a provenance record.

---

In [Part 1](/blogs/how-resourceful-is-your-ai-skill/), the argument was simple: most AI skills are being operated at Level 0 or Level 1 of a maturity model that goes to Level 3. The gap is where failures originate.

This post is the engineering side of that argument. What does a production-grade skill actually need to have? Not aspirationally — concretely.

---

## What "No Contract" Actually Means at Runtime

When a skill ships without explicit boundaries, the runtime has to infer them. That inference pulls from whatever is available: the model's training data, the system prompt, adjacent skill instructions, conversation context, and whatever tools happen to be loaded.

This is not a theoretical concern. It is the reason:
- A skill designed for document summarization starts making API calls when it finds a URL in the input
- A skill intended for read-only analysis writes to a database because nothing in its instructions said it couldn't
- A skill tested on one model version behaves differently after a quiet platform upgrade — different refusal thresholds, different output format, different tool selection behavior

The fix is not better wording in the instructions. Wording is guidance. A contract is enforcement. The distinction matters.

---

## The Four Components

### 1. Behavioral Contract

This defines what the skill does, what it explicitly does not do, and what constitutes a correct output.

At minimum:

```yaml
name: summarize-support-case
version: 2.1.0

intent:
  purpose: "Summarize a customer support case into a structured brief"
  non_goals:
    - "Do not respond to the customer directly"
    - "Do not access case history beyond the provided input"
    - "Do not make recommendations that require account changes"

input:
  schema: support-case-v1.json
  max_size_kb: 200
  untrusted_fields:
    - customer_message
    - attachments

output:
  schema: case-summary-v2.json
  required_fields:
    - issue
    - evidence
    - recommended_next_step
    - confidence
  refusal_conditions:
    - "Input contains no identifiable issue"
    - "Input is under 50 tokens"
```

The `non_goals` and `refusal_conditions` fields are the ones most skills omit. Without them, the model improvises — and improvisation in a production workflow is a defect waiting to surface.

### 2. Capability Contract

This is the permission manifest. It declares what the skill is allowed to touch — and by implication, what it is not.

```yaml
capabilities:
  tools:
    allowed:
      - read_support_case
      - classify_issue_type
    denied:
      - send_email
      - update_account
      - execute_code
  data:
    classification: internal
    tenant_scope: requesting_user_only
  network:
    allowed: none
  filesystem:
    allowed: none
  side_effects:
    permitted: []
    requires_approval: []
```

Two things matter here that most teams miss.

First: **the runtime must enforce this manifest, not the skill text**. Writing "do not send emails" in the instructions tells the model what to aim for. A capability contract tells the runtime what to allow. These are different enforcement mechanisms and only one of them is reliable.

Second: **denied tools should be explicit**. An allow list alone is insufficient — if a new tool is added to the runtime after the skill is deployed, an allow-only manifest will silently permit it. Explicit denials close that gap.

### 3. Resource Budget

Software engineers think in time and space complexity. Agentic skills need a broader cost model.

```yaml
budget:
  latency:
    p95_seconds: 8
    p99_seconds: 15
  tokens:
    avg_input: 2500
    avg_output: 900
    max_input: 5000
  tool_calls:
    max_per_invocation: 4
    max_retries: 1
  cost:
    max_per_transaction_usd: 0.02
  context:
    max_skill_files_loaded: 3
    max_context_occupancy_pct: 15
```

These numbers are not guesses. They come from measuring the skill during development against representative inputs, then setting limits at a reasonable headroom above baseline. The Colab notebook in Part 3 shows exactly how to do that measurement.

Without a budget, there is no definition of "this skill is behaving unexpectedly." A 10x token spike looks like normal variance. With a budget, it is a breach — detectable, alertable, debuggable.

### 4. Provenance Record

This is the metadata that makes a skill auditable and the registry smarter.

```yaml
provenance:
  skill_id: "summarize-support-case-v2"
  owner: "support-platform-team"
  source_repo: "github.com/org/skills/summarize-support-case"
  license: "MIT"
  created_with: "claude-sonnet-4-6"
  content_hash: "sha256:abc123..."
  fork_of: null
  end_of_support: "2027-06-01"
  tested_models:
    - "claude-sonnet-4-6"
    - "claude-haiku-4-5"
```

The `fork_of` field deserves attention. One of the biggest problems in skill registries is clone inflation — the same skill published under ten names, none of them linked. If every skill declared its lineage, a registry could surface "this skill is 94% similar to X, consider contributing upstream" before accepting publication. That one field could substantially reduce duplication.

---

## The Key Rule

> **Never rely on the model to enforce the security policy that constrains the model.**

This is worth saying plainly because the instinct is to solve constraint problems by adding more instructions. Better wording, clearer prohibitions, more examples. That instinct is wrong for security-critical constraints.

A prompt guides. A contract enforces. The runtime, not the instructions file, must be the policy enforcement point for permissions, tool access, and side effects — the same principle behind [why AI guardrails need to be enforced, not just defined](/blogs/ai-guardrails-what-can-go-wrong/).

---

## What This Looks Like End-to-End

A fully contracted skill ships as:

```text
my-skill/
  SKILL.md              ← human-readable description and usage
  contract.yaml         ← the four components above
  instructions.md       ← model instructions (behavioral guidance)
  schemas/
    input-v1.json
    output-v1.json
  tests/
    happy-path/
    negative/
    adversarial/
  evaluations/
    functional.yaml
    routing.yaml
    security.yaml
  CHANGELOG.md
```

The `contract.yaml` is the artifact that makes the rest auditable. It is the thing a registry validates, a runtime enforces, and a security review reads first.

---

## What Comes Next

Part 3 closes the loop with a Colab notebook: a skill built with no contract, measured against the dimensions above, then rebuilt with a contract, measured again. The delta tells you what "resourceful" is actually worth in practice.

---

**Reflection questions**

- For a skill you own: can you write its `non_goals` and `refusal_conditions` right now, without looking at the code?
- If a new tool is added to your agent runtime tomorrow, which of your deployed skills would silently gain access to it?
- What is the P95 latency and average token cost of your most-used skill? If you don't know, that's the first measurement to take.
