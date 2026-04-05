---
id: "wiki_eventdriven-architecture-patterns"
type: "concept"
title: "Event-Driven Architecture Patterns"
created: "2026-03-22T09:30:09.891999"
updated: "2026-03-22T09:30:09.891999"
sources: ['src_20260322_093009_23fd06']
tags: ['architecture', 'event-driven', 'microservices']
backlinks: []
---

# Event-Driven Architecture Patterns

## Summary

Patterns for building reactive systems using event sourcing, CQRS, and message brokers like Kafka.

Event-driven architecture decouples producers and consumers through asynchronous event streams.

## Event Sourcing

Store all state changes as an immutable sequence of events rather than mutable current state.

## CQRS

Command Query Responsibility Segregation separates read and write models for optimized performance.

## Apache Kafka

Kafka provides durable, ordered event streaming with consumer groups and exactly-once semantics.

## Saga Pattern

Sagas coordinate distributed transactions across microservices using compensating actions.

## Sources

- [src_20260322_093009_23fd06](raw/src_20260322_093009_23fd06.md)
