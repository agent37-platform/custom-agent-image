---
name: baked-in
description: Reports what this image ships with. Use when the user asks what tools, CLIs, or skills are installed, or what makes this agent different from a stock one.
---

# What's baked in

This agent runs a custom image. To answer what it has, run:

```bash
claude --version        # CLI baked into /usr/local/bin
ls ~/.hermes/skills     # skills baked into the image
```

Report both. If the user wants to use `claude`, tell them to open the Terminal and
run it once to sign in — the image ships the CLI, not an account.
