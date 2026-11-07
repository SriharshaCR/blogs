---
layout: post
title: "Decision Archaeology: Why Decisions Die and How a KBA Fixes That"
date: 2026-11-06
description: "Your codebase captures what was built — never why. Decision archaeology failures cost teams more than missing docs. An LLM-curated KBA fixes that."
image: /assets/images/decision-archaeology-kba/image-hero.webp
image_alt: "A codebase timeline showing decisions captured vs. decisions lost"
audience: "Engineering managers, technical leads, support engineers, and onboarding leads on teams with established codebases"
tags: [ai-engineering, knowledge-management, llm-agents, decision-making, onboarding, kba]
permalink: /decision-archaeology-kba/
read_time: 5
---

# Decision Archaeology: Why Decisions Die and How a KBA Fixes That

---

> **Key Takeaways**
> - **The problem:** Your codebase captures what was built. It never captures why — and that gap costs teams more than any missing documentation.
> - **Why it matters:** When the reasoning behind a decision is gone, the next person touching that code works blind. Production breaks aren't always bugs — they're archaeology failures.
> - **What you'll learn:** What a decision-focused KBA is, how it differs from ADRs, and how an agent called Counsellor maintains one with minimal human overhead.

---

A script to update user emails was approved, deployed, and broke login in production. Every active session was invalidated — users mid-workflow, users nowhere near a re-login screen, all signed out at once. The rollback was fast — under an hour — but by then the damage was done. The fix was easy once someone understood the cause. The cause itself took time to reconstruct.

What the postmortem could not answer was: *why was the original email logic built that way?* The person who made that call had moved on. The constraints they were working under — whatever they were protecting against — existed nowhere except their memory.

The code survived. The reasoning didn't.

---

## This Isn't a Documentation Problem

**Decision archaeology** is the work of reconstructing why something was built the way it was, after the people who knew are gone.

Traditional documentation captures the *what*. Architecture diagrams show what connects to what. READMEs explain how to run the thing. None of them answer: *what were we protecting against when we made this call?*

That question gets expensive fast. A new joiner touches something sensitive without knowing its history. A PR gets approved because nobody on the review thread has the context to push back. A joining condition gets an erroneous property added because the original condition's purpose was never written down — and production starts returning redundant results.

These aren't negligence failures. They're archaeology failures. The knowledge existed. It just was never captured in a form that outlasted the people who held it.

---

## Why Traditional Docs Don't Fix This

Small teams don't write documentation — not because they're lazy, but because they're building. Documentation is always the next thing, and the next thing never comes.

And even when docs exist: they're written after the decision, by the person who made it, from memory, in a format built for human reading. By the time someone queries it, the context has been stripped. What remains is the conclusion, not the reasoning.

**Knowledge can be transferred. Experience cannot.**

---

## How This Differs from ADRs

Architecture Decision Records (ADRs) are the closest existing tool — Markdown files committed to a repo, capturing a decision's status, context, and consequences at a point in time. If your team uses them, they're valuable.

A decision-focused KBA goes further in three ways: it's curated by an LLM agent, not written by an engineer after the fact; it's structured for LLM retrieval, not human reading; and it's a living record — it evolves as the project evolves. The most important difference: it gets *consulted before decisions are made*, not referenced after they go wrong. ([Martin Fowler's ADR overview](https://martinfowler.com/bliki/ArchitecturalDecisionRecord.html) covers the canonical format if you want the baseline the industry starts from.)

---

## What a KBA Actually Is — The Laws Model

In my system, a KBA is called a **Law** — a named constraint with documented reasoning, queryable by humans and LLM agents alike. Each Law governs what an agent can do, and when.

That is different from what most teams mean by "knowledge base article" — a FAQ entry, a static answer to a known question. A Law is active, not archival. Here is a real one from my system:

> **🧙‍♂️ Law of Memory Management**
> **Trigger:** When memory consumption per profile exceeds 90%, activate `agent-memory-sniffer`.
> **Agent responsibility:** Identify caches, temp files, and redundant library installations. Prepare a Memory-Sweep-Report.
> **Automated:** Cache files with `lastModified` older than 15 days — deleted without human input.
> **Human input required:** Shared library installations across profiles (e.g., email library installed under 2 profiles) — flagged for decision.
> **Hard cap:** Overall memory utilization must not exceed 95%.

Notice what this Law does that documentation never could: it governs active agent behavior. When memory hits 90%, `agent-memory-sniffer` doesn't guess — it acts according to the Law. Without that governance layer, agents operate with no constraints on what they can do or when — exactly the failure pattern described in [AI Agent Scaffolding: Four Failures and What Prevents Them](/blogs/ai-agent-scaffolding-four-failures/#4-the-capable-agent-that-did-the-wrong-thing).

The email script incident would have been prevented by a Law of the same kind — one that stated email is the primary authentication identifier and that any update must invalidate existing sessions. The PR reviewer could have queried it. Nobody did, because the Law didn't exist yet.

Laws are organized by domain: Law of Persistence Management, Law of Code Syntax, Law of Memory Management. Each domain accumulates its constraints over time, building a memory for that part of the system.

[![Decision tree: Does this decision need a Counsellor Law?]({{ "/assets/images/decision-archaeology-kba/decision-tree.svg" | relative_url }})]({{ "/assets/images/decision-archaeology-kba/decision-tree.svg" | relative_url }})

---

## Personal Proof — Meet Counsellor 🧙‍♂️

I've been running this for myself for six months. The agent is called Counsellor.

The workflow:

1. Counsellor identifies a significant decision — architectural, configuration, behavioral
2. It drafts a new Law and opens a GitHub Issue, assigned to me for review
3. We refine it in the issue thread — back-and-forth until the reasoning is precise
4. I approve; it gets posted as a Discussion under the relevant Law category
5. From that point, Counsellor and every other agent in my system consult it before major actions

Here's it running in production. On Nov 1, memory hit 91% — above the Law's 90% threshold. `agent-memory-sniffer` opened a GitHub Issue automatically: problem statement, impact analysis, root cause, a three-phase remediation plan, and success metrics. Phase 1 and 2 executed after my approval in the issue thread. Phase 3 established a monthly review cadence going forward.

The Law didn't just catch the problem. It governed how the problem was resolved — what happened automatically, what waited for human judgment, and what the success condition looked like. Without the Law, memory would have hit 95% silently, new learnings would have been rejected, and I would have noticed only when something failed.

If you want to see this run end to end, there is a companion notebook that walks through the same scenario — memory hitting 91%, the sniffer firing, a GitHub Issue generated, cleanup applied. One dependency (`openai`), free API key, no local setup. The only interaction point is an approval flag you set before cleanup runs. If you need to set up a Groq key or prefer HuggingFace, the [LLM setup guide](/blogs/guides/llm-free-apis/) covers both in under 5 minutes.

→ [Run the Counsellor POC on Colab](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/decision-archaeology-kba/counsellor_poc.ipynb) — simulated Laws, one dependency, no GitHub setup required

→ [Run the Counsellor in Action on Colab](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/decision-archaeology-kba/counsellor_in_action.ipynb) — Laws fetched live from your GitHub repo, real Issues created. Needs a free Groq key and a [fine-grained GitHub PAT](/blogs/guides/github-pat-setup/).

**Experiment: change the Law, see what changes**

The in-action notebook fetches Laws from a YAML file you own. Edit it between runs:

| Parameter | Default | Try | Effect |
|---|---|---|---|
| Trigger threshold | `0.90` | `0.70` | Law fires earlier — more frequent cleanup cycles |
| Auto-remove age | `> 15 days` | `> 30 days` | Stricter bar — more entries escalate to your review |
| Auto-remove relevance | `< 7 days` | `< 14 days` | Wider net — `flag_for_human` does more work |
| Cleanup target | `0.80` | `0.60` | Tighter footprint — more aggressive post-cleanup threshold |

The sniffer's recommendations change with every variation. The notebook code does not. That is the only signal worth watching when evaluating any governance model: does changing the rule change the behaviour, without touching the code?

---

## Who It Helps Beyond the Individual

The same pattern scales to a team.

**New engineer onboarding.** Someone joins and wonders why the email update logic is written the way it is. Instead of pinging a senior dev (who may not be available, or may not remember), they ask Counsellor — an LLM agent with access to every Law ever written for that system. The constraint is understood in thirty seconds. That question never has to be answered by a human again.

**PR reviews.** A reviewer is looking at a change that touches the authentication layer. Without a Law, the review is limited to whether the code is correct. With a Law in place, the reviewer can verify whether the change respects constraints the team previously committed to as non-negotiable. This is the review that catches the email script problem before it reaches production — not because the reviewer happened to remember the history, but because the system surfaced it.

**Incident postmortems.** A production issue surfaces. The postmortem now asks a sharper question: was there a Law that should have prevented this? If yes — why didn't the agent enforce it? Was the Law ambiguous, or was coverage incomplete? If no — what does this incident make obvious that needs to become a Law? Either way, the system gets smarter. The archaeology happens in real time instead of months later when the team that built it has moved on.

Onboarding stops depending on who you know. Code reviews stop depending on who happens to remember. Incidents stop requiring archaeology after the fact.

---

## Honest Tradeoffs

**Cold start.** A KBA only captures from the moment it exists. Every decision made before that is still gone. You start from zero and build forward.

**Coverage gaps.** Not every decision gets surfaced. Agents miss things. Human review — the GitHub Issues step — is where gaps get caught.

**Trust calibration.** An LLM-curated record can mischaracterize reasoning. Counsellor captures what it observes, not what was actually intended. The review thread exists for this reason — approval is not a formality.

**It changes behavior, not responsibility.** Counsellor doesn't make decisions. It informs them. Someone still has to read it and act on it.

---

## One Last Thing

The email script incident wasn't caused by a bad engineer or a bad process. It was caused by a codebase that had no memory.

The code remembered every line ever written. It had no way to remember why any of it was there.

Every team has that one senior person you find before making a big call — someone who remembers why the system was built the way it was. Counsellor is that person. Except it doesn't leave, doesn't forget, and gets wiser every time a new Law is written.

At the core, this is just GitHub project management. Counsellor makes it special with the magical wand of AI.

---

**Reflection questions**

- What decision in your current codebase would you most want to query right now — and what would you find?
- How many of your recent PRs were approved by reviewers who didn't know the history of what they were reviewing?
- If you had a Counsellor in your system today, which domain would you build the first Law for?
