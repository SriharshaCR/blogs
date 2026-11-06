---
layout: post
title: "GitHub Fine-Grained PAT for Colab Notebooks"
date: 2026-11-06
description: "Create a private GitHub repo and a repo-scoped fine-grained PAT with minimal permissions. Add it to Colab Secrets. Setup takes under 5 minutes."
tags: [github, pat, colab, security, notebooks, python]
permalink: /guides/github-pat-setup/
---

> **Last verified:** November 2026. GitHub's token UI changes periodically — if steps differ from what you see, use the official reference linked at the bottom of this guide.

This guide sets up a GitHub token scoped to a single private repository, with only the permissions a Colab notebook needs. Nothing more.

---

## Why fine-grained over a classic PAT

A classic (legacy) GitHub PAT is account-wide. If it leaks, an attacker can access every repository on your account.

A **fine-grained PAT** is scoped to specific repositories and specific permissions. If the token leaks, the blast radius is one repo with only the operations you explicitly allowed.

For notebooks: use fine-grained, always.

---

## Step 1: Create a private repository

1. Go to [github.com/new](https://github.com/new)
2. Give the repo a name (e.g. `counsellor-laws`)
3. Set visibility to **Private**
4. Leave everything else as default — do not initialise with a README yet
5. Click **Create repository**

Keep the repo URL — you will need it in your notebook config.

---

## Step 2: Generate a fine-grained PAT

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → click **Fine-grained tokens** in the left nav
2. Click **Generate new token**
3. **Token name:** something descriptive — e.g. `colab-poc-counsellor`
4. **Expiration:** set to **30 days** — short enough to limit exposure, long enough for a POC

### Repository access

- Select **Only select repositories**
- Choose the private repo you just created

### Permissions — minimum required

Enable only these two. Leave everything else off:

| Permission | Level | Why |
|---|---|---|
| **Contents** | Read and write | Read Law files; push new Laws |
| **Issues** | Read and write | Agent creates GitHub Issues |
| Metadata | Read-only | Auto-enabled by GitHub — required |

5. Click **Generate token**
6. Copy the token immediately — shown only once

Official reference: [docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

---

## Step 3: Add to Colab Secrets

Never paste the token into a notebook cell — it gets saved in the file.

1. In Google Colab, click the **🔑 key icon** in the left sidebar (Secrets)
2. Click **+ Add new secret**
3. **Name:** `GITHUB_TOKEN` (exact spelling — case-sensitive)
4. **Value:** paste your fine-grained PAT
5. Toggle **Notebook access** to ON

Retrieve it in code:

```python
from google.colab import userdata
github_token = userdata.get("GITHUB_TOKEN")
```

---

## Using the token in a notebook

```python
from github import Github  # pip install PyGithub

g = Github(userdata.get("GITHUB_TOKEN"))
repo = g.get_repo("your-username/your-repo-name")

# Create an issue
issue = repo.create_issue(
    title="Memory sweep required",
    body="Memory at 91% — see attached remediation plan."
)
print(f"Issue created: {issue.html_url}")
```

---

## Security disclaimer

> **A fine-grained PAT scoped to a private repo limits damage — it does not eliminate it.**
>
> - The token can still read and write files in that repo, and create Issues
> - If you push the token to a public repo by mistake, rotate it immediately
> - Set a 30-day expiry and regenerate when it expires — do not extend indefinitely
> - Revoke at any time: [github.com/settings/tokens](https://github.com/settings/tokens)
>
> **Never paste a token directly into a notebook cell.** Even a private notebook can be shared, exported, or accidentally committed to source control.

---

## Notebooks on this blog using this setup

| Notebook | Post |
|---|---|
| Counsellor in Action *(coming soon)* | [Decision Archaeology](/blogs/decision-archaeology-kba/#personal-proof-meet-counsellor) |

---

**Official documentation**
- Fine-grained PATs: [docs.github.com/en/authentication](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- PyGithub: [pygithub.readthedocs.io](https://pygithub.readthedocs.io)
