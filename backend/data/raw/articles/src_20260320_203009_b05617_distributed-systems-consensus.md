---
id: "src_20260320_203009_b05617"
type: "article"
source_url: "https://example.com/articles/distributed-systems-consensus"
title: "Distributed Systems Consensus"
author: "Research Team"
platform: "web"
date: "2026-03-20T20:30:09.890722"
captured: "2026-03-20T20:30:09.890722"
status: "compiled"
tags: ['distributed-systems', 'raft', 'consensus']
entities: ['Leslie Lamport', 'Diego Ongaro']
domains: ["Systems Engineering"]
summary: "Overview of consensus algorithms including Raft, Paxos, and Byzantine fault tolerance for distributed state machines."
key_facts: []
content_type: "article"
word_count: 77
has_transcript: False
duration: ""
---

Consensus algorithms ensure multiple nodes agree on a single value despite failures.

## Raft

Raft uses leader election and log replication to achieve consensus with crash fault tolerance.

## Paxos

Leslie Lamport's Paxos algorithm is theoretically optimal but notoriously difficult to implement correctly.

## Byzantine Fault Tolerance

BFT protocols like PBFT handle malicious nodes but require 3f+1 nodes to tolerate f failures.

## Modern Approaches

Etcd and CockroachDB use Raft, while blockchain systems employ various BFT variants.
