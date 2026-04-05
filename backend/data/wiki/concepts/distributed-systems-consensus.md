---
id: "wiki_distributed-systems-consensus"
type: "concept"
title: "Distributed Systems Consensus"
created: "2026-03-20T20:30:09.890722"
updated: "2026-03-20T20:30:09.890722"
sources: ['src_20260320_203009_b05617']
tags: ['distributed-systems', 'raft', 'consensus']
backlinks: []
---

# Distributed Systems Consensus

## Summary

Overview of consensus algorithms including Raft, Paxos, and Byzantine fault tolerance for distributed state machines.

Consensus algorithms ensure multiple nodes agree on a single value despite failures.

## Raft

Raft uses leader election and log replication to achieve consensus with crash fault tolerance.

## Paxos

Leslie Lamport's Paxos algorithm is theoretically optimal but notoriously difficult to implement correctly.

## Byzantine Fault Tolerance

BFT protocols like PBFT handle malicious nodes but require 3f+1 nodes to tolerate f failures.

## Modern Approaches

Etcd and CockroachDB use Raft, while blockchain systems employ various BFT variants.

## Sources

- [src_20260320_203009_b05617](raw/src_20260320_203009_b05617.md)
