---
layout: post
title: "Measuring What 'Resourceful' Actually Means"
date: 2026-09-21
description: "Measure AI skill quality with a Colab notebook: token cost, security surface, and regression testing — before and after applying an engineering contract."
image: /assets/images/ai-skill-poc-colab/image-hero.webp
image_alt: "Before and after comparison of an AI skill measured across five quality dimensions"
audience: "AI engineers, platform engineers, and technical leads building or deploying AI skills in production agent workflows"
tags: [ai-skills, llm-agents, ai-engineering, skill-measurement, colab, generative-ai]
permalink: /measuring-resourceful-ai-skill/
read_time: 5
series: resourceful-ai-skill
series_name: "The Resourceful AI Skill"
post_number: 3
series_total: 3
---

# Measuring What "Resourceful" Actually Means

*Part 3 of 3 in The Resourceful AI Skill series.*

---

> **Key Takeaways**
> - **The problem:** "This skill is good" is an opinion. Without measurement, there is no way to know if a contract actually improves a skill or just adds overhead.
> - **Why it matters:** Token cost, latency, and security exposure are real operational numbers — not abstract concerns. You can measure them before and after.
> - **What you'll learn:** How to profile a skill from scratch, apply an engineering contract, and read the delta in a Colab notebook you can run today.

---

Parts [1](/blogs/how-resourceful-is-your-ai-skill/) and [2](/blogs/ai-skill-engineering-contract/) made the argument. This post is the proof.

The Colab notebook below takes a skill with no contract — call it a Level 0 skill — measures it against five operational dimensions, applies the engineering contract from Part 2, and measures again. The delta is the answer to the question: what is "resourceful" actually worth?

**Three companion notebooks apply the same methodology to different skill types — run any one to see the before/after delta on a real skill:**

| Notebook | Skill | Primary gaps demonstrated |
|---|---|---|
| [**Profile Bio →**](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/how-resourceful-is-your-ai-skill/03-hands-on/01_profile_bio_before_after.ipynb) | `profile-bio` | Token budget, data handling policy, regression stability |
| [**Sprint Changelog →**](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/how-resourceful-is-your-ai-skill/03-hands-on/02_sprint_changelog_before_after.ipynb) | `sprint-changelog-generator` | Input filter (−37% tokens), output schema, audience contract |
| [**Dependency Risk →**](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/how-resourceful-is-your-ai-skill/03-hands-on/03_dependency_risk_before_after.ipynb) | `dependency-update-risk-assessor` | Routing filter (−37% invocations), enum output constraint, regression suite |

The post below walks through the `profile-bio` analysis in detail. Each notebook follows the same five-dimension frame and links to the others.

---

## The Skill We're Testing

Rather than an abstract example, the notebook uses a concrete, community-relevant skill: [`profile-bio`](https://github.com/SriharshaCR/open-skills/tree/main/profile-bio) — an AI skill I built, published, and use — which runs an 8-question interview and generates platform-specific bios for up to 6 platforms.

This skill was chosen because:
- It is a real published skill, not a synthetic example — the gaps found are genuine
- It has a multi-mode structure (gather, generate, assets) that creates real token variability
- It writes user data to disk — the security surface is concrete, not theoretical
- It depends on the model to enforce platform-specific behavioral contracts (character limits, tone) — making regression testing meaningful
- It is the kind of skill engineers build for themselves and share with their teams

The same methodology applies to any skill. The five runner-up candidates — and why they were considered — are listed at the end of this post.

---

## The Five Measurement Dimensions

### 1. Token Cost

**What we measure:** Input tokens and output tokens per invocation, comparing a full-pipeline run against a targeted single-platform run.

**Why it matters:** Token cost is the closest thing agents have to a CPU bill. A skill that generates output for 6 platforms when the user asked for 1 is not just expensive — it consumes headroom that other skills and the user's actual request need.

**What the notebook shows:** Baseline token profile for `profile-bio --generate all` versus `--generate linkedin`. On a representative brief, targeting a single platform reduces total tokens by 40–60% with identical output quality for the requested platform. The gap widens on longer briefs.

### 2. Latency

**What we measure:** Wall-clock latency per invocation — from prompt submission to complete response.

**Why it matters:** A skill that passes functional tests but runs slowly degrades every workflow it is embedded in. Latency budgets surface this before deployment, not after.

**What the notebook shows:** Latency is not directly measured in this notebook — `profile-bio` is an interactive skill where the dominant latency factor is output token volume, not tool calls. The principle still applies: if your skill has tool calls, measure P95 and P99 separately from single-call latency. Retry amplification on tool-call failures is almost always the long-tail driver.

### 3. Routing Accuracy

**What we measure:** Precision and recall for skill invocation — does it get selected when it should, and not selected when it shouldn't?

**Why it matters:** A skill with an overly broad description gets loaded on nearly every turn. A skill with an overly narrow description gets missed on relevant requests. Both are waste.

**What the notebook shows:** Routing accuracy is not measured here — `profile-bio` is user-triggered explicitly, so description precision matters less for standalone use. It becomes critical the moment a skill enters a shared registry where an agent selects skills by description. If your skill lives in that context, the routing precision test from the notebook's design applies directly.

### 4. Security Surface

**What we measure:** Data classification of what the skill reads, writes, and forwards — with a focus on what gets persisted to disk and under what policy.

**Why it matters:** A skill that writes user data to disk without a declared schema, TTL, or access restriction is an unacknowledged security surface in any multi-skill workflow. The gap isn't intentional — it just was never stated. These are the same class of vulnerabilities that [AI guardrail frameworks exist to close at the system level](/blogs/ai-guardrails-what-can-go-wrong/).

**What the notebook shows:** `profile-bio` writes a `profile-brief.md` containing name, core beliefs, CTA, and links. The notebook shows the before state (untyped dict, no policy) against a typed dataclass with per-field sensitivity labels (PUBLIC / PRIVATE), a 30-day TTL, and an explicit no-forwarding rule. The change requires no API calls — it is a contract declaration. The gap closes by stating what was previously implicit.

### 5. Regression Stability

**What we measure:** Whether the skill's behavioral contracts — character limits, tone alignment — hold consistently across runs and survive model version changes.

**Why it matters:** Skills that depend on model behavior for correctness have no test that catches drift. A tone contract that passes once is not a contract — it is a coincidence.

**What the notebook shows:** The notebook runs a golden test harness against three platforms (Twitter/X, LinkedIn, GitHub) with a fixed brief. For each platform it checks: character limit compliance and presence of tone-signal keywords consistent with the declared tone. The harness produces a pass/fail report that can be re-run after any model update. A FAIL on character limits — which the model produces more often than expected — is the point: it is the gap that the Level 1 skill had no way to surface.

---

## The Before / After Summary

| Dimension | Before Contract | After Contract | Change |
|---|---|---|---|
| Token cost (full run) | ~6-platform output | Single-platform output | −40–60% tokens |
| Brief schema | Untyped dict | Typed dataclass + sensitivity labels | Contract declared |
| Data handling policy | None | TTL 30d, no external forwarding | Gap closed |
| Char limit compliance | Untested | Automated: pass/fail per platform | Failures surfaced |
| Tone alignment | Untested | Automated: keyword signal check | Drift catchable |

Latency and routing accuracy are not measured in this notebook — they require tool-call traces and a skill registry, respectively. The methodology for both is described above. Run those measurements on your own skill using the same five-dimension frame.

The character limit result is the one most likely to surprise you. The model fails it more often than expected — not because the skill is broken, but because character counting is probabilistic and no contract was enforcing it. Run the notebook and read your own numbers.

---

## Five Skills Worth Applying This To

| Skill | Why this one |
|---|---|
| **`profile-bio`** *(used in notebook)* | Real published skill; multi-mode token variability; writes user data to disk; platform-specific behavioral contracts |
| **Code review assistant** | High token cost, clear correctness signal, widely built and shared; chains into CI pipelines |
| **PR description generator** | Frequently cloned, minimal testing; composition risk is real |
| **Log error classifier** | Token cost is critical at scale; routing accuracy directly affects on-call alert quality |
| **Meeting notes summarizer** | Handles untrusted input (transcript content); memory poisoning and injection surface is underappreciated |

Each of these would benefit from the same five-dimension measurement pass. The notebook is structured so you can swap in your own skill: replace the brief and prompt, re-run, read the report.

---

## What to Do With the Numbers

A measurement without a threshold is just a number. The contract from Part 2 turns measurements into pass/fail gates:

- Token cost above declared budget → skill is not ready for the workflow it is in
- P99 latency above threshold → retry amplification on tool calls needs a cap before composition
- Routing precision < 0.9 → description needs narrowing before the skill joins a shared registry
- PRIVATE fields reachable by other skills → capability contract is missing or not enforced at runtime
- Char limit compliance < 100% → required behavioral contracts are not enforced in any programmatic sense

The maturity model from Part 1 maps directly: Level 2 requires all five dimensions to have defined budgets and passing test results. Level 3 requires continuous monitoring — not just a one-time pass.

---

## One Last Thing

The most important finding from building this notebook was not in the numbers. It was in what the exercise forced.

Writing the behavioral contract required stating what the skill does *not* do. That forced a decision about two edge cases that had been silently handled by improvisation. Writing the capability contract required listing allowed tools — which surfaced a tool that was available but had never been intentionally granted. Measuring routing precision required writing negative test cases — which found two false invocation scenarios that had never been tested.

The contract is not bureaucracy. It is the forcing function that makes the gaps visible before they become incidents.

---

**Reflection questions**

- Run the notebook on `profile-bio` first. Then fork it and swap in a skill you own. What does the baseline tell you?
- Which of the five measurement dimensions would your current skills fail first?
- If your team published a skill to a shared registry tomorrow, which fields in the contract would you genuinely not be able to fill in?
