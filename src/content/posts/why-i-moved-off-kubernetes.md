---
title: Why I moved off Kubernetes
description: A long-form retrospective on running Kubernetes for three years on a project that never needed it, and what replaced it.
pubDate: 2026-06-02
updatedDate: 2026-06-10
tags: [infrastructure, kubernetes, docker]
---

I ran a single-digit-node Kubernetes cluster for just over three years. This is the long
version of why I finally tore it out, and what I run instead now.

## The setup that got us there

The project started as a monolith on two VMs behind a load balancer. It grew, we split it
into a handful of services, and at some point — the way these things go — "we should
probably use Kubernetes" started sounding reasonable. We had:

- Six long-running services
- A Postgres database (managed, outside the cluster)
- A queue worker
- Roughly steady traffic, no real autoscaling need

None of that actually required an orchestrator. What it required was a way to deploy six
things reliably. Kubernetes can do that, but so can a lot of much smaller tools.

## What Kubernetes actually cost us

It's easy to point at the sticker price of the control plane and call it a day, but the
real cost was elsewhere.

### Operational surface area

Every upgrade cycle meant reading changelogs for the cluster itself, the CNI plugin, the
ingress controller, cert-manager, and whatever else had accumulated. None of these were
things the product needed — they were things Kubernetes needed in order to do what a
single reverse proxy did for the old two-VM setup.

### Debugging got a layer harder

A request failing in production used to mean checking the app logs. With Kubernetes, it
meant checking the app logs, then whether the pod was even scheduled, then whether the
readiness probe was passing, then whether the service selector matched the right labels,
then whether the ingress rule was actually routing there. Every one of those layers is a
place a config typo can hide.

### The team didn't need the primitives

Kubernetes is genuinely good at things like rolling out to hundreds of nodes, bin-packing
mixed workloads, and reacting to autoscaling signals in real time. We had six services and
traffic that moved maybe 20% between our quietest and busiest hours. We were paying the
complexity tax for capabilities we were never going to use.

## What replaced it

The new setup is boring on purpose:

1. **Docker Compose** on a couple of VPS instances, one primary and one for failover.
2. **Caddy** as the reverse proxy and TLS terminator — automatic certificates, no
   cert-manager, no ingress CRDs.
3. **GitHub Actions** builds and pushes images to a container registry, then SSHes in and
   runs `docker compose pull && docker compose up -d`.
4. **A managed Postgres instance** — this didn't change; it was never inside the cluster.

Deploys went from "apply a dozen YAML files and hope the rollout strategy is right" to
"one SSH command." Incident response went from five places to check to two: the container
logs and the Caddy access log.

## Where I'd still reach for it

I want to be fair to Kubernetes here — this isn't a "Kubernetes is bad" post. If any of
the following were true, I'd reconsider:

- More than a couple dozen services, where a scheduler actually earns its keep.
- Traffic patterns with real spikes that need autoscaling reactions, not just a bigger
  instance.
- A platform team whose job is specifically to run the cluster well, rather than one
  engineer doing it as 10% of their time.

None of those applied here. The lesson wasn't "Kubernetes is overrated," it was "match the
tool to the actual shape of the problem, not the shape of the problem you might have
someday."

## The actual migration

The migration itself took about two weeks, mostly because I did it service by service
rather than all at once:

- Week 1: moved the two lowest-traffic services to Compose, ran them in parallel with the
  Kubernetes versions behind a feature-flagged router.
- Week 2: moved the remaining four services the same way, then decommissioned the
  cluster.

No downtime, no big-bang cutover. If I did it again, I'd start with the highest-traffic
service instead of the lowest — by the time I got to it, I'd already worked out every
rough edge on services nobody would notice if they broke.
