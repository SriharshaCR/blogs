---
layout: post
title: "Five Ways to Spend Your Tokens Like They Cost Something"
date: 2026-08-29
description: "Five LLM token optimization strategies with failure modes: prompt compression, structured prompting, output control, and when each approach breaks down."
image: /assets/images/ai-token-economics/02-five-ways-to-spend-tokens/image-hero.webp
image_alt: "Abstract illustration of five converging paths representing distinct AI prompting strategies"
audience: "Engineers, developers, and tech-adjacent professionals building with or using LLM APIs"
tags: [ai, llm, token-economics, prompt-optimization, ai-cost-optimization, generative-ai, prompt-engineering]
permalink: /five-ways-to-spend-tokens/
read_time: 6
series: ai-token-economics
series_name: "AI Token Economics"
post_number: 2
series_total: 3
---

# Five Ways to Spend Your Tokens Like They Cost Something

*Part 2 of the AI and Token Economics series. If you haven't read [Part 1 — You're Not Buying AI. You're Buying Tokens](/blogs/you-are-buying-tokens/) — start there. It builds the mental model this post assumes.*

*These techniques are most valuable when you pay for API usage, operate at scale, or care about latency. On a flat-rate consumer subscription, the bigger wins are focus, less drift, and sharper answers — not a lower bill.*

> **Key Takeaways**
> - **The question:** You understand LLM token pricing — now how do you spend that budget well?
> - **The tradeoff:** Every prompt optimization technique has a specific failure mode; knowing both is what separates good prompting from reckless prompting
> - **What you'll get:** Five AI cost reduction strategies, two hands-on tools, and the honest conditions under which each approach breaks down

---

## The Tools First

Two tools to run alongside this post — both free, no API key needed.

**For counting tokens:** Open the [token counter notebook](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/ai-token-economics/02-five-ways-to-spend-tokens/counting_tokens.ipynb) and run it on a few of your own prompts — no API key needed.

The result often reveals that the biggest opportunity isn't making the question shorter — it's preventing an unnecessarily long response. Token counts vary by model and tokenizer; the notebook uses GPT-4o encoding as a reference estimate.

**For prompt compression:** For actually compressing content to a specific token budget — and seeing what semantic information gets lost — [TinyPress](https://sriharshacr.github.io/tiny-press/) — built for a HuggingFace hackathon — is the playground for that. You give it a long piece of text, set a token budget (100–1,000 tokens), and it compresses the text down to fit. What makes it useful for learning is the quality score: cosine similarity between the original and compressed embeddings, 0 to 1. Think of it as a semantic warning signal — a high score suggests broad topical similarity; a sharply dropping score tells you to inspect the diff closely. Neither confirms that every fact, number, qualifier, or negation made it through intact. A word-level diff shows exactly what was dropped (red), rewritten (amber), or inserted (green). You can swap the compression model mid-session — Qwen, SmolLM2, Phi-3.5-mini, Llama — and independently swap the embedder used for scoring (MiniLM, BGE, mxbai) — so you can directly compare how different models trade off compression depth against meaning retention. TinyPress doesn't require a **paid model API key**. When self-installed, the models run on your own hardware — **no data leaves your machine**, which matters if you're compressing contracts, source code, or sensitive specs. The hosted Hugging Face Space and Colab options process on remote infrastructure, so use the local install for anything sensitive. The local setup needs around 4 GB of disk and 8 GB of RAM; a GPU helps with speed.

---

## Five LLM Token Optimization Strategies

**1. Prompt Compression: Summarize Before You Dump**

Every time you paste a 300-line PR diff and ask "what can I improve?", the model reads all 300 lines. Every. Single. Time. Instead, ask it once to produce a *context card* — a 200-token summary of what the code does, its key constraints, and the likely failure points. Use that card as your opening context for every follow-up question in that session.

Same mistake happens with research. Pasting a 40-page paper every time you have a new question means the model re-reads the methodology section ten times. Compress the paper to a structured outline once. Ask questions from that outline, not the raw text.

A 100,000-token document → 2,000-token context card = 50x reduction in repeated context, with potentially more focused answers — provided the card preserves what the task actually needs. One caveat: creating the card costs tokens too. The savings kick in on reuse; the more follow-up questions you ask from that card, the better the economics.

Use that card as persistent background context. For architectural questions and broad analysis, it works well. For anything requiring line-level verification — a security review, a bug in a specific function — attach the relevant code fragment alongside the card. The card replaces repeated orientation, not the source evidence you need to verify against.

*When it backfires:* A context card reflects what you thought was important when you wrote it. If the insight lives in a detail you didn't prioritize — an edge case buried in clause 14 of a contract, a specific version number in a requirements doc — the card excludes it permanently and the model never knows it's missing. The model won't flag this. It'll reason confidently from the incomplete picture you gave it. For exploratory work, summarize freely. For tasks where a single overlooked detail has consequences, ask whether the 50x saving is worth the precision risk.

**2. Progressive Context Loading**

Here's a trap that catches most people: you're debugging a failing API call, so you paste five microservices worth of code and ask "why is this broken?" The model drowns in the noise and hedges.

Instead: isolate the failing component first. Understand it alone. Then bring in the service it calls. Then the one that calls it. Each round is small; the synthesis at the end is precise.

The same approach works for learning. Don't ask "explain the 2008 financial crisis." Go round by round — mortgage mechanics, then CDO structure, then the Fed response, then how they connected. Four focused rounds — potentially similar or more total tokens, but far better comprehension and the option to stop once you have enough. You pay for depth on demand, not for a monolithic explanation you'll only partially absorb.

*When it backfires:* Progressive context is optimised for depth. It fails on lateral dependencies. A bug caused by an interaction between services A and C won't surface if you've only ever shown the model one service at a time. Sometimes the most valuable question is: "here's the whole system — what's unusual here?" Loading everything and asking for a holistic read is a legitimate strategy. Know whether your problem is a depth problem or a breadth problem before you choose the approach.

**3. Conversation Context Management**

A long conversation doesn't just carry history — it pays interest on it. If your application sends the full conversation history on each turn — and most do by default — every new message causes earlier history to be reprocessed. As a thread grows, irrelevant history and conflicting instructions can reduce coherence, often well before you hit any formal context limit.

Before you continue, use this prompt:

> "Give me a 3-sentence context brief I can paste at the start of the next session: what we're building, what we decided, and what's still unresolved."

Paste that brief into a fresh chat. You'll spend fewer tokens restoring shared understanding and more on the actual problem. This is also how you prevent the slow drift in coherence that long threads develop — where the model starts qualifying everything because it's lost track of what you established earlier.

*When it backfires:* A 3-sentence brief captures *what* you decided, not *why*. On a fresh thread, the model doesn't know which alternatives you ruled out or the constraints that shaped your choices — so it may confidently resurface them. For exploratory or creative sessions where the reasoning journey matters as much as the outcome, compressing erases the divergent paths that didn't make the summary. If you need reasoning continuity — not just a status summary — preserve the original thread.

**4. Structured Prompting: Specificity Over Exploration**

"Explain machine learning" is an expensive question — not because of the words you send, but because of what comes back: a 2,000-token survey you'll skim for the two paragraphs that were actually useful.

The model doesn't know what you already understand, what decision you're trying to make, or what level of detail helps. So it covers everything. Give it three constraints instead: **your role**, **your existing knowledge**, and **what you're actually trying to decide**.

Before: *"Explain machine learning."*
After: *"I'm a backend Java developer. I need to understand embeddings well enough to decide whether a vector database is overkill for our search feature. I already understand SQL indexes. What's the minimum I need to know?"*

You spend a few more input tokens — but you avoid hundreds of irrelevant output tokens in return. Because output is usually more expensive and takes longer to read, specificity pays back fast. The exploration cost isn't in what you send — it's in what you get back.

*When it backfires:* Over-specification closes off solutions you didn't know to ask for. "Find null pointer exceptions in this function" might miss the real problem — a race condition in the caller that makes the NPE a symptom, not the root cause. When you don't yet know what you don't know, broad questions are the right tool. Specificity is a tax on discovery. Use it when you know the shape of the problem; hold it back when you're still finding out what you're dealing with.

**5. Output Token Control: Define the Format Before You Ask**

The model defaults to comprehensive. "Summarize this meeting" returns a 400-word narrative when you needed three bullets. "Explain Kubernetes" returns everything from Pod definitions to etcd internals when you needed enough to deploy one service.

Without a clear scope, purpose, and format, the model has to guess — and that often produces more detail than you need, or the wrong detail entirely. The fix: define the format in the question, not as an afterthought.

> *"In up to 3 bullets: the decision made, who owns it, the deadline. Add one short risk note only if a material caveat applies."*
> *"Explain Kubernetes for someone deploying their first service. 5 concepts, in order of what to understand first."*
> *"Write a README: 3-line project description, one run command, top 5 features. Stop there."*

In many tasks, format constraints cut output substantially — often 70–90% compared to an unconstrained baseline, though results depend entirely on the task and starting prompt. They also tend to produce sharper answers — because constraints force the model to prioritize rather than pad.

*When it backfires:* Hard format constraints can cause the model to silently drop caveats, edge cases, and risk signals that didn't fit the structure you specified. "3 bullets: decision, owner, deadline" might omit the assumption the decision rested on — the one that gets revisited in the post-mortem. For decisions with real downstream consequences, an unconstrained response often surfaces things you didn't think to ask for. Apply format constraints where you need efficiency and speed; remove them where you need completeness and don't yet know what to look for.

---

## When Prompt Compression Has a Cost

Everything in the previous section assumes the parts you remove weren't important. Sometimes they are.

Compress a legal contract to 500 tokens and ask "is there anything unusual here?" — the unusual clause is probably in the footnote your summary dropped. Compress a bug report and ask "why is this failing?" — the exact stack trace line that identifies the root cause is often the first thing a summary removes.

The failure mode is insidious: the model doesn't tell you it's working from an incomplete picture. It gives you a confident answer from whatever you gave it. You act on it. The detail you summarized away is exactly where the problem was.

**Compress for direction. Keep full context for precision.**

When you're trying to understand a domain, orient yourself in a codebase, or explore options — compression is almost always safe. The value comes from synthesis, not from every detail being present.

When you're debugging a specific failure, verifying a compliance requirement, validating a technical spec, or making a decision where one missed constraint breaks everything — bring the full context. That extra token spend removes the omission risk; it doesn't make the model infallible, but it eliminates one of the most common ways it gets things wrong.

A useful test before compressing: *"Is the answer likely to live in the details I'm about to remove, or in the structure I'm keeping?"* If it's the details — don't compress. This is also where TinyPress's quality score earns its keep: if cosine similarity drops sharply, that's a signal to inspect the diff carefully — something likely load-bearing was removed, not just padding. A high score doesn't guarantee all critical facts survived; use the word-level diff to verify numbers, qualifiers, and negations that actually matter.

---

## AI ROI: Token Count ≠ Token Value

The trap most teams fall into when measuring generative AI costs: tracking how many tokens they consumed.

The right question: **how much value was produced per token?**

10,000 tokens that saved 4 hours of engineering work is excellent AI ROI. 50,000 tokens that generated a document nobody read is waste. Note that **prompt caching** — supported by Anthropic, OpenAI, and Google — lets you store frequently-reused context (system prompts, document chunks, few-shot examples) at a fraction of normal input cost. Cache reads can be as cheap as 10% of the standard rate, though exact discounts, cache-write costs, TTLs, and storage charges vary by provider and model. In production systems where large stable prefixes repeat across thousands of calls, the savings can be substantial. In systems dominated by unique inputs or long outputs, the impact is more modest. Focus AI spend where it creates leverage — design decisions, learning acceleration, architecture reviews — not on repeated reformats or broad questions you could have narrowed with one more second of thought. The same principle applies beyond cost: as I wrote in [AI Eliminates One Kind of Monotony](/blogs/business-monotony/), what matters isn't the hours AI saves you — it's what you do with the space it creates.

---

## Before You Close This Tab

Three questions worth sitting with:

1. **What just clicked?** Think about the last AI conversation that felt expensive or went nowhere. Which of the five patterns did it fall into — and which failure mode does that match?

2. **Where will you apply this?** Pick one recurring task — a weekly report, a study session, a code review — and decide which technique you'll try first. Not all five. One.

3. **How will you measure it?** If you tracked value produced per token rather than tokens consumed, how would your use of AI change? What would you stop doing? What would you start doing differently?

The most effective AI users aren't the ones with the biggest context windows. They're the ones who treat context like money — and spend it accordingly.
