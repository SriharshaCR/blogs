---
layout: post
title: "Free LLM APIs for Python Notebooks: Groq and HuggingFace Setup"
date: 2026-11-06
description: "Set up Groq or HuggingFace Inference in a Colab notebook in under 5 minutes. OpenAI-compatible — switch providers by changing one variable. No credit card required."
tags: [groq, huggingface, llm, free-api, python, colab, openai-compatible]
permalink: /guides/llm-free-apis/
---

> **Last verified:** November 2026. Provider UIs and free tier limits change — if steps differ from what you see, the official docs linked in each section are the source of truth.

This guide covers two free LLM providers — Groq and HuggingFace Inference — and the OpenAI-compatible pattern that lets you switch between them by changing one variable in your notebook.

No credit card required for either provider.

---

## Provider comparison

| | Groq | HuggingFace Inference |
|---|---|---|
| **Free tier** | Yes — no credit card | Yes — included credits, no credit card |
| **Speed** | Very fast (~450 tok/s on LPU hardware) | Varies by underlying provider |
| **OpenAI-compatible endpoint** | `api.groq.com/openai/v1` | `router.huggingface.co/v1` |
| **JSON mode (`response_format`)** | Yes — on supported models (see below) | Depends on model |
| **Model variety** | Groq-hosted models | Thousands via inference providers |
| **Best for** | Speed-first POCs, structured output | Broader model choice, HF ecosystem |

---

## The one-variable swap pattern

Both providers expose an OpenAI-compatible endpoint. The `openai` Python client works with either — the only difference is `base_url` and which secret to retrieve from Colab.

This config block is used in all notebooks published on this blog. Change `PROVIDER` to switch:

```python
# ── LLM PROVIDER CONFIG ──────────────────────────────────────────
# Change PROVIDER to switch between Groq and HuggingFace.
# Everything else in the notebook stays the same.

PROVIDER = "groq"  # "groq" | "huggingface"

_CONFIGS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "secret":   "GROQ_API_KEY",
        "model":    "gemma2-9b-it",
    },
    "huggingface": {
        "base_url": "https://router.huggingface.co/v1",
        "secret":   "HF_TOKEN",
        "model":    "openai/gpt-oss-120b:fastest",
    },
}

from openai import OpenAI
from google.colab import userdata

_cfg   = _CONFIGS[PROVIDER]
client = OpenAI(base_url=_cfg["base_url"], api_key=userdata.get(_cfg["secret"]))
MODEL  = _cfg["model"]
# ─────────────────────────────────────────────────────────────────
```

**Install the OpenAI client** (works for both providers — no provider-specific SDK needed):

```bash
pip install openai -q
```

---

## How to set up Groq

Groq provides LLM inference via dedicated LPU hardware. The free tier requires no credit card.

### Step 1: Create an account

Go to [console.groq.com](https://console.groq.com) and sign up with GitHub or Google.

### Step 2: Generate an API key

1. In the Groq Console, click **API Keys** in the left sidebar
2. Click **Create API Key**
3. Give it a descriptive name (e.g. `colab-poc`)
4. Copy the key immediately — it is shown only once
5. Store it in a password manager, not a text file

Official reference: [console.groq.com/docs/quickstart](https://console.groq.com/docs/quickstart)

### Step 3: Add to Colab Secrets

Never paste your API key into a notebook cell — it gets saved in the notebook file and can be shared accidentally.

1. In Google Colab, click the **🔑 key icon** in the left sidebar (Secrets)
2. Click **+ Add new secret**
3. **Name:** `GROQ_API_KEY` (exact spelling — case-sensitive)
4. **Value:** paste your API key
5. Toggle **Notebook access** to ON

Retrieve it in code:

```python
from google.colab import userdata
api_key = userdata.get("GROQ_API_KEY")
```

### Groq recommended models for POCs

**Default: `gemma2-9b-it`** — Google's 9B instruction-tuned model. Confirmed JSON mode support. Fast on Groq's LPU hardware. Suitable for structured analysis and reasoning tasks.

**JSON mode (`response_format={"type": "json_object"}`)** is supported on these Groq models:

| Model | Notes |
|---|---|
| `gemma2-9b-it` | Default recommendation |
| `llama3-8b-8192` | Smaller, very fast |
| `llama-3.3-70b-specdec` | Larger, higher reasoning quality |
| `mixtral-8x7b-32768` | Long context (32K) |

**JSON mode requirement:** When using `response_format={"type": "json_object"}`, your prompt must explicitly instruct the model to return JSON (e.g. `"Return valid JSON with the following fields: ..."`). This is a spec requirement, not a Groq-specific constraint.

**If you get a JSON mode error** with your chosen model, switch to `llama-3.3-70b-specdec` or `llama3-8b-8192` — both are confirmed compatible.

### Groq free tier limits

Free tier limits vary by model and change over time. Check your current limits at:
[console.groq.com/settings/limits](https://console.groq.com/settings/limits)

For POC use — a few notebook runs per day — the free tier is more than adequate.

---

## How to set up HuggingFace Inference

HuggingFace Inference Providers routes requests through a network of inference providers (including Groq, Together AI, and others) via a single HF token. The free tier includes credits without a credit card.

### Step 1: Create an account

Go to [huggingface.co](https://huggingface.co) and sign up.

### Step 2: Generate a fine-grained token

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Click **New token**
3. Select token type: **Fine-grained**
4. Under **Permissions**, enable **Make calls to Inference Providers**
5. Give it a name (e.g. `colab-poc`) and click **Create token**
6. Copy the token — shown only once

Official reference: [huggingface.co/docs/api-inference](https://huggingface.co/docs/api-inference/en/index)

### Step 3: Add to Colab Secrets

1. In Google Colab → 🔑 Secrets → **+ Add new secret**
2. **Name:** `HF_TOKEN`
3. **Value:** paste your HF token
4. Toggle **Notebook access** to ON

```python
from google.colab import userdata
hf_token = userdata.get("HF_TOKEN")
```

### HuggingFace recommended models for POCs

**Default: `openai/gpt-oss-120b:fastest`** — OpenAI's open-weight 120B model, routed to the fastest available provider automatically.

Append `:cheapest` to minimise free credit usage: `openai/gpt-oss-120b:cheapest`

### HuggingFace free tier

HuggingFace includes monthly credits with free accounts. Check your current balance and limits at:
[huggingface.co/settings/billing](https://huggingface.co/settings/billing)

---

## Making your first LLM call

Once the provider config block above is in your notebook, a call looks identical regardless of provider:

```python
response = client.chat.completions.create(
    model=MODEL,
    messages=[
        {"role": "system", "content": "You are a helpful assistant. Return valid JSON."},
        {"role": "user",   "content": "List three programming languages as JSON: {\"languages\": [...]}"}
    ],
    response_format={"type": "json_object"},  # Groq only — omit for HuggingFace
)

print(response.choices[0].message.content)
```

Switch `PROVIDER = "huggingface"` at the top — the call below stays unchanged.

---

## Notebooks on this blog using this setup

These notebooks use the one-variable swap pattern above. You can run them on the free tier with no local setup:

| Notebook | Post | What it does |
|---|---|---|
| [Counsellor POC](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/decision-archaeology-kba/counsellor_poc.ipynb) | [Decision Archaeology](/blogs/decision-archaeology-kba/#personal-proof-meet-counsellor) | Memory analysis with structured JSON output |
| [Autonomee Harness Demo](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/agentic-harness-an-ai-operating-system/02-building-autonomee-config-driven-harness/autonomee_harness_demo.ipynb) | [Config-Driven Harness](/blogs/building-autonomee-config-driven-harness/#what-autonomee-is) | Agent pipeline with and without a harness |
| [AI Guardrails in Action](https://colab.research.google.com/github/SriharshaCR/blogs/blob/main/assets/notebooks/AI-Guard-Rails/part-2-guardrails-in-action.ipynb) | [AI Guardrails](/blogs/ai-guardrails-in-action/#experiment-1-toxic-prompt-handling) | Four live before/after guardrail experiments |

All notebooks follow the `🔌 SWAP` convention — the LLM config cell points here.

---

**Official documentation**
- Groq: [console.groq.com/docs](https://console.groq.com/docs)
- HuggingFace Inference Providers: [huggingface.co/docs/api-inference](https://huggingface.co/docs/api-inference/en/index)
- OpenAI Python client: [github.com/openai/openai-python](https://github.com/openai/openai-python)
