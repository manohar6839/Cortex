---
id: "src_20260322_093009_23fd06"
type: "article"
source_url: "https://example.com/articles/eventdriven-architecture-patterns"
title: "Event-Driven Architecture Patterns"
author: "Research Team"
platform: "web"
date: "2026-03-22T09:30:09.891999"
captured: "2026-03-22T09:30:09.891999"
status: "compiled"
tags: ['architecture', 'event-driven', 'microservices']
entities: ['Apache Kafka', 'Martin Fowler']
domains: ["Software Architecture"]
summary: "Patterns for building reactive systems using event sourcing, CQRS, and message brokers like Kafka."
key_facts: []
content_type: "article"
word_count: 69
has_transcript: False
duration: ""
---

Event-driven architecture decouples producers and consumers through asynchronous event streams.

## Event Sourcing

Store all state changes as an immutable sequence of events rather than mutable current state.

## CQRS

Command Query Responsibility Segregation separates read and write models for optimized performance.

## Apache Kafka

Kafka provides durable, ordered event streaming with consumer groups and exactly-once semantics.

## Saga Pattern

Sagas coordinate distributed transactions across microservices using compensating actions.
