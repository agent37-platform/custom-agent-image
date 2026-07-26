# The image every agent in this app runs: stock Hermes plus what we bake in below.
# Edit it, then `npm run release:agent`.
#
# Images are for binaries. This one installs a CLI into /usr/local/bin — not the
# default npm prefix, because /home/node is a persistent volume at runtime and masks
# anything baked into it. Skills are runtime state on that same volume, so they can't
# ship here; the app writes them into ~/.hermes/skills when it creates an agent
# (skills/ + src/app/api/agents/route.ts).
#
# Rules that keep the image runnable: linux/amd64 (cloud builds are), at most 8 GB,
# nothing baked into /home, and keep the base ENTRYPOINT — it starts Hermes and the
# gateway that serves chat.
#
# The tag defaults to :latest, which is what a cloud build uses (it takes no build
# args). Pin a date tag for reproducible rebuilds:
# https://www.agent37.com/docs/agents-api/templates#build-on-the-hermes-base-image
ARG HERMES_TAG=latest
FROM ghcr.io/agent37-platform/hermes:${HERMES_TAG}

USER root

RUN NPM_CONFIG_PREFIX=/usr/local npm install -g @anthropic-ai/claude-code \
 && command -v claude >/dev/null \
 && npm cache clean --force

USER node
