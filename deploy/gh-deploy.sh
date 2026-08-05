#!/bin/bash
# Forced command for the github-actions-deploy@blog-v2 key in ~/.ssh/authorized_keys
# on the VPS. Installed at /home/rush/bin/gh-deploy.sh; that copy is what runs.
#
# The key is registered as:
#   restrict,command="/home/rush/bin/gh-deploy.sh" ssh-ed25519 AAAA...
#
# so the CI key can run this and nothing else -- no interactive shell, no
# arbitrary commands. That is a good property and this file exists to keep it:
# because the command is forced, whatever `script:` .github/workflows/deploy.yml
# sends is IGNORED. sshd runs this file instead and puts the client's command in
# $SSH_ORIGINAL_COMMAND.
#
# DEPLOY LOGIC THEREFORE LIVES HERE, NOT IN THE WORKFLOW. Editing the workflow's
# script block changes nothing on the box. This file is version-controlled so
# that fact is discoverable; installing a change still needs a human on the VPS:
#
#   install -m 700 deploy/gh-deploy.sh /home/rush/bin/gh-deploy.sh
set -euo pipefail

REPO=rashm1n/blog-v2
cd /srv/blog

# --- content ---------------------------------------------------------------
# First, so a problem with the edge config below can never block a content
# deploy. A failure there still fails the job, so it stays visible in CI.
docker compose pull blog
docker compose up -d blog
docker image prune -f

# --- edge config -----------------------------------------------------------
# The Caddyfile is bind-mounted from this directory and used to be updated only
# by hand, so security-header changes committed to the repo never reached
# production.
#
# The commit to deploy comes from the client, so it is untrusted input even
# though only CI holds this key: accept it only if it is exactly a 40-character
# hex SHA, and fall back to main otherwise. That keeps this script out of the
# business of fetching arbitrary refs.
REF=main
if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ([0-9a-f]{40}) ]]; then
  REF="${BASH_REMATCH[1]}"
fi
echo "Syncing Caddyfile from ${REPO}@${REF}"

mkdir -p staging
curl -fsSL "https://raw.githubusercontent.com/${REPO}/${REF}/deploy/Caddyfile" -o staging/Caddyfile

# DOMAIN is interpolated by the Caddyfile. Compose reads .env by itself; a bare
# `docker run` does not.
set -a; . ./.env; set +a

# Validated before it is moved into place, so a config that doesn't parse can
# never be left where it would stop Caddy coming back up after a reboot.
docker run --rm \
  -e DOMAIN="$DOMAIN" \
  -v /srv/blog/staging/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v /srv/blog/certs:/certs:ro \
  caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

if cmp -s staging/Caddyfile Caddyfile; then
  echo "Caddyfile unchanged"
  rm -f staging/Caddyfile
else
  cp Caddyfile "Caddyfile.bak.$(date +%s)"
  mv staging/Caddyfile Caddyfile
  # Atomic: Caddy rejects a bad config and keeps serving the old one.
  docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
  echo "Caddyfile updated and reloaded"
fi
