---
title: Debugging a Postgres deadlock
description: A production deadlock walked me through row-lock ordering, isolation levels, and how to read a deadlock detail line.
pubDate: 2026-07-14
tags: [postgres, databases, debugging]
---

Last week a background job started failing intermittently with:

```
ERROR: deadlock detected
DETAIL: Process 4821 waits for ShareLock on transaction 998211; blocked by process 4809.
Process 4809 waits for ShareLock on transaction 998214; blocked by process 4821.
```

Two processes, each holding a lock the other needs. Classic deadlock. This post walks
through how I found the root cause and the two ways I considered fixing it.

## Reading the detail line

Postgres's deadlock message is more useful than it first looks. Each `Process X waits for
Y on Z; blocked by process W` line names one side of a cycle. Two lines means a
two-transaction cycle; three or more processes means a longer cycle, which is rarer and
usually a sign something upstream is issuing very broad locks.

In our case it was two processes, both `UPDATE`s against the same two tables — `orders`
and `order_items` — but touching rows in opposite order.

## Lock ordering

Transaction A did:

1. `UPDATE orders SET status = 'paid' WHERE id = $1`
2. `UPDATE order_items SET fulfilled = true WHERE order_id = $1`

Transaction B, running concurrently for a different order but overlapping on shared
inventory rows, did the update to `order_items` first, then `orders`. Same two tables,
opposite order — the textbook deadlock setup.

> The fix is almost never "retry harder." It's "always take locks in the same order."

## The fix

We reordered transaction B's statements to match A's. Once every code path touches
`orders` before `order_items`, a cycle can't form — one transaction always gets there
first and the other simply waits, instead of both waiting on each other.

We also added a retry wrapper around the job for genuine contention (not deadlocks —
those are now structurally impossible), since a `40001` serialization failure under
`REPEATABLE READ` is still expected under load and is a different problem from lock
ordering.

## What I'd check first next time

- Enable `log_lock_waits` and set a `deadlock_timeout` low enough to catch these during
  a load test, not in production three months later.
- Grep application code for any place that updates the same two tables — order matters
  more than most people expect.
- If lock ordering isn't feasible (e.g. dynamic table sets), consider `SELECT ... FOR
  UPDATE` with a consistent sort on the rows being locked before the writes happen.
