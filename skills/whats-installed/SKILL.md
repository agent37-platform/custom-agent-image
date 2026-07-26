---
name: whats-installed
description: Reports what this agent ships with. Use when the user asks what tools, CLIs, or skills are installed, or what makes this agent different from a stock one.
---

# What's installed

This agent runs a custom image, and this skill was installed when the agent was
created. To answer what it has, run:

```bash
claude --version        # CLI baked into the image, at /usr/local/bin
ls ~/.hermes/skills     # skills the app installed at create time
```

Report both. If the user wants to use `claude`, tell them to open the Terminal and
run it once to sign in — the image ships the CLI, not an account.
