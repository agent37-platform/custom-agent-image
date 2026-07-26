# The image every agent in this app runs: stock Hermes plus what we bake in below.
# Edit it, then `npm run release:agent`.
#
# Two additions, one of each kind you are likely to need:
#   a CLI   — into /usr/local/bin. Not the default npm prefix: /home/node is a
#             persistent volume at runtime and masks anything baked into it.
#   a skill — a folder with a SKILL.md. The base entrypoint copies default-skills
#             into ~/.hermes/skills on boot, where Hermes picks it up.
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

COPY skills /usr/local/share/agent37/default-skills

USER node
