---
layout: post
title: "Your CI/CD Pipeline Is Not Ready for Agents"
description: "Every CI/CD practice you know is built on determinism. Agents break that premise at the foundation. Here are the five gaps to close before production."
series: enterprises-ai-playbook
series_name: "The Enterprise AI Playbook"
post_number: 6
series_total: 13
audience: "DevOps & Platform Engineers"
date: 2025-02-12
tags: [cicd, platform-engineering, devops, agents, llmops]
permalink: /enterprises-ai-playbook/cicd-for-agents/
---

Post 5 laid out the strategy for bringing agents into production. Now someone has to own the infrastructure that carries them there. That's platform engineering — and the tooling you've spent years hardening was built for a fundamentally different problem.

This isn't about adding GPU nodes or a vector database to your existing setup. It's about recognizing that your pipeline assumptions are wrong for this class of workload, and naming exactly where the gaps are before production finds them for you.

---

## Your pipeline assumes determinism. Agents don't deliver it.

Every CI/CD practice you know is built on one premise: given the same input, the system produces the same output. Tests verify it. Rollbacks restore it. Canary deployments measure it.

Agents break that premise at the foundation. An agent doesn't compute an output — it reasons toward one. Given identical inputs on two separate runs, it may return answers that are equally correct but not identical. Your pipeline treats that as non-determinism. The agent treats that as expected behavior.

You're not dealing with a deployment problem anymore. You're dealing with a behavioral distribution that has to stay inside acceptable bounds over time. That's a different job.

---

## Five gaps that will find you in production if you don't find them first

### 1. Testing

Unit tests pass or fail against exact outputs. That contract doesn't hold for agent systems where "correct" is a range, not a value.

What you actually need: **behavioral test suites** that evaluate agent outputs against criteria — does the response stay on topic, does it decline appropriately, does it cite accurate information, does it complete the task within token budget?

The difference in practice:

```python
# Traditional: equality assertion
assert output == "Order #1234 has been cancelled."

# Behavioral: criteria-based assertion
assert evaluate(output, criteria=["accurate", "on_topic", "no_hallucination"]) >= 0.8
```

These are assertion frameworks, not equality checks. Tools like RAGAS (docs.ragas.io) and DeepEval (docs.confident-ai.com) exist for this — RAGAS targets RAG and agent evaluation specifically; DeepEval covers dozens of research-backed metrics including hallucination and faithfulness. For domain-specific deployments, your criteria will include domain-safe refusal and compliance-relevant edge cases (a healthcare agent needs to be tested for HIPAA-relevant refusals; a finance agent for hallucinated figures). These tools have to be integrated into your pipeline deliberately. They won't slot into your existing test runner without rethinking what a passing test means.

### 2. Rollback

In a stateless service, rollback means: redeploy the previous image. Done.

Agents hold state — conversation history, retrieved context, tool call results, intermediate reasoning. When you roll back a model or an agent version, you're not just reverting code. Active user sessions were built on the old version's behavior; the new version has no continuity with that context.

Define rollback before you deploy: which state is version-controlled, which is session-scoped, and what happens to in-flight conversations during a version transition. If you can't answer that cleanly, you're not ready.

### 3. Canary deployments

Canary works by routing a small percentage of traffic to a new version and comparing error rates, latency, and key metrics.

How do you canary a *behavior change*? If you updated a system prompt, swapped a model version, or changed a tool's response schema — how do you know the 5% canary cohort received better outputs than the 95% control? Existing canary tooling won't tell you. You need behavioral evaluation running alongside your traffic split, capturing agent outputs, scoring them, and surfacing regressions before you widen the rollout. That's not a configuration change — that's a new monitoring surface you have to build.

### 4. Cost instrumentation

CPU and memory metrics have predictable curves. Token costs do not.

A runaway agent loop — a model that keeps calling tools, re-evaluating results, and retrying — won't trip a CPU alert. It will silently accumulate thousands of tokens per request across hundreds of concurrent sessions before your billing dashboard shows anything unusual. Standard resource-based alerting is blind to this.

You need token-level instrumentation: per-request input/output token counts, tool call frequency, cost attribution by agent, workflow, and user segment. Set alerts on token budget thresholds, not just infrastructure metrics. If a request regularly costs $0.03 and one cohort starts averaging $0.30, you want to know before the monthly invoice.

### 5. Observability

Traditional monitoring answers: is the service up? Latency normal? Error rate within SLA?

For agents, none of that tells you if the system is *working*. An agent can be fully healthy by infrastructure metrics while quietly producing off-topic responses, hallucinating facts, or failing to complete tasks. You need a second observability layer: output quality monitoring. Sampling agent responses and scoring them in near-real-time, tracking quality metrics over time alongside infrastructure metrics, and treating output drift as a production incident — not a model fine-tuning ticket.

---

## Platform readiness checklist: eight things to own before you're on-call for agents

Before your team takes on-call responsibility for an agent-based system, audit these:

- [ ] **Behavioral test coverage** — Do your tests evaluate *what the agent does*, not just *whether it responds*? Do they include adversarial inputs, edge cases, and refusal scenarios?
- [ ] **Rollback plan for stateful sessions** — Is it documented what happens to active conversations during a version change? Is session state versioned separately from model version?
- [ ] **Canary evaluation pipeline** — Do you have scoring infrastructure that runs during traffic splits, not just after full rollout?
- [ ] **Token budget alerting** — Are you tracking per-request token costs? Do you have alerts that fire before costs become anomalous at scale?
- [ ] **Quality observability** — Are agent outputs sampled and scored in production? Is output quality a metric in your dashboards alongside uptime and latency?
- [ ] **Tool failure handling** — If an external tool the agent calls returns an error or a slow response, does the agent degrade gracefully or loop? Is that tested?
- [ ] **Prompt and config versioning** — Are system prompts, tool schemas, and retrieval configs version-controlled and tied to deployment artifacts? Can you diff a behavior change the same way you diff code?
- [ ] **Rate limiting and abuse containment** — Is there a per-user/per-session token or request cap? A runaway client or prompt injection loop can spike costs and degrade shared infrastructure before any alert fires.

You don't need all eight perfect on day one. But if you can't answer most of them, you're inheriting a reliability problem that will be invisible until it's loud.

---

The platform isn't just the thing agents run on. It's the thing that determines whether the business can trust them. That's always been the platform team's real job — this just makes it harder to fake.

---

*Next: With the platform rethought, the next decision is the agents themselves. One large agent that does everything, or a network of specialists? The architectural case against the monolithic agent is next.*
*→ Post 7: The Case Against the Monolithic Agent*
