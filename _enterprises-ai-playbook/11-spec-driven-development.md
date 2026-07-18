---
layout: post
title: "When You Have 10 Agents in Production: Spec-Driven Development at Scale"
description: "Going from one agent to ten is a phase change. The shift that makes it manageable: stop asking 'does each agent work?' and start asking 'does the system still do what I designed?'"
series: enterprises-ai-playbook
series_name: "The Enterprise AI Playbook"
post_number: 11
series_total: 13
audience: "Engineering Managers & Product Owners"
date: 2025-03-19
tags: [spec-driven-development, multi-agent, ai-engineering, testing]
permalink: /enterprises-ai-playbook/spec-driven-development/
---

Post 10 covered how security governs trust at agent boundaries — who can call what, and what gets through. This post is about what happens once that trust is established and the calls are flowing: how do you know the system is still doing what you designed?

---

Going from one agent in production to ten is not a linear increase in complexity. It's a phase change.

With one agent, the failure surface is clear. You can read its outputs, write unit tests, evaluate its behavior manually if needed. The system is small enough to reason about end-to-end.

At ten agents — routing, summarizing, classifying, retrieving, verifying, formatting, notifying — something different happens. Each agent may be performing correctly in isolation. But the composition drifts. An agent you updated last Tuesday introduced a subtle output format change. Three agents downstream consume that output. One of them handles the change gracefully. The other two silently degrade. Your monitoring shows no errors. Your users see outcomes that are vaguely wrong in ways no one can easily pin down.

Unit testing individual agents doesn't catch this. The contract between agents is what breaks, and that's what you're not testing.

Support ticket volume climbs. The root cause isn't a bug — it's drift across a system nobody has a complete picture of.

---

## Stop asking "does each agent work?" Start asking "does the system still do what I designed?"

Engineering teams that succeed at multi-agent scale make one mental shift: they stop asking "does each agent work?" and start asking "does the system still do what I designed?"

That sounds obvious. It isn't easy. "Does each agent work" is answerable with your existing test infrastructure. "Does the system still do what I designed" requires knowing what you designed well enough to test against it — and most teams never write that down at the level needed.

Spec-driven development for agents addresses this directly.

The spec isn't documentation you write before building. It's a written, runnable description of what the system should do — tested on every component change, not just at launch. It describes the intended behavior of the system as a whole — in terms of inputs, outputs, and behavioral contracts — and every time you change any component, you run the system against the spec to confirm nothing broke at the design level.

---

## Pattern 1: Writing testable agent contracts

A testable agent contract defines correct behavior at the system level, not the component level.

For a single agent, the test question is: given this input, does the agent return an appropriate output?

For a multi-agent system, the contract question is: given this user request entering the system, does the final output satisfy the intended behavior — regardless of which agents handled which steps, or how?

Concretely, a system-level contract looks like this:

- **Input class:** Customer complaint with a missing order number
- **Expected behavior:** System either resolves without order number (using account context) or requests only the missing information — never loops, never drops the request, never returns generic error text
- **Behavioral assertions:** Response includes resolution or a single targeted clarifying question. Tone matches the configured service profile. Response completes within 2 tool-call hops.
- **Out-of-scope behavior (explicitly named):** Never ask the customer to repeat information they already provided. Never surface internal error codes.

Notice what this contract does not specify: which agent handled routing, what the retrieval agent returned, how the summarization agent structured its intermediate output. Those are implementation details. The contract lives at the design level.

You build a library of these contracts — covering your key user journeys, edge cases, and known failure modes. They become your regression suite. Every time any agent in the pipeline changes, you run the full contract suite against the system. Failures tell you which designed behaviors no longer hold.

---

## Pattern 2: Mutation testing for behavioral drift

Mutation testing in traditional software works like this: you make a small deliberate change to the code (introduce a bug), then verify your test suite catches it. If the tests still pass, your coverage has a gap.

This adapts that technique to agent systems, where the "code" being mutated is configuration: prompts, model versions, retrieval thresholds. It's not yet standard practice in the LLM evaluation space — most frameworks use metric-based scoring — but the logic is sound and the payoff is real. Drift happens on its own through model updates, prompt tuning, tool schema changes, and retrieval index changes — even when you don't intend it.

Behavioral mutation testing for agents:

1. **Take a snapshot** of your current agent configurations — system prompts, model versions, tool schemas, retrieval parameters
2. **Introduce a controlled mutation** — slightly rephrase a system prompt, swap a model version, adjust a retrieval threshold
3. **Run the system-level spec** against the mutated system
4. **Any spec failures identify behavioral contracts that are fragile** — they were passing before only because of a specific configuration, not because the design is robust

A concrete example of what this surfaces: rephrase a routing agent's system prompt to use "triage" instead of "classify" — a seemingly cosmetic change. Two behavioral contracts fail: the agent stops treating billing complaints as high-priority, and its escalation threshold shifts. The spec catches this before it reaches users. More importantly, it reveals that the contracts were written against specific prompt wording rather than against design intent — and that's the gap you need to close, not just the prompt change.

This does two things. First, it tells you which parts of your spec need to be tighter (the contracts that should have failed but didn't). Second, it catches real-world drift — because the same mutations you're introducing deliberately are also happening gradually through normal operations.

Teams that do this regularly stop being surprised by production incidents where "nothing changed but behavior shifted." The spec caught the drift before users did.

---

## The question leadership will ask six months after launch — and how to answer it

Six months after launch, someone in leadership will ask: "Is the AI system still doing what we built it to do?"

Without a spec, the honest answer is "we think so." With a spec, the answer is: "Yes — here are the behavioral contracts we defined at design time, and here is the spec run from last week showing they all pass."

That's the confidence gap that spec-driven development closes. Not for the engineers who built the system — they can usually tell. For the people accountable for what the system does — to customers, to regulators, to the board.

The spec is the audit trail that connects design intent to running behavior. It's what you show when someone asks for proof.

---

Ten agents in production is achievable. What it requires is treating the system's designed behavior as a first-class artifact — something you test against, not something you hope hasn't changed.

---

*Next: The mechanics are in place. Now the harder question — what does AI-native actually mean when you're done? What does "done" even look like?*
*→ Post 12: What AI-Native Actually Means (And How to Know When You're There)*
