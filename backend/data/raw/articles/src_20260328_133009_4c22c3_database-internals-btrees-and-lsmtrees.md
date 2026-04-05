---
id: "src_20260328_133009_4c22c3"
type: "article"
source_url: "https://example.com/articles/database-internals-btrees-and-lsmtrees"
title: "Database Internals: B-Trees and LSM-Trees"
author: "Research Team"
platform: "web"
date: "2026-03-28T13:30:09.895792"
captured: "2026-03-28T13:30:09.895792"
status: "compiled"
tags: ['databases', 'b-tree', 'lsm-tree']
entities: ['PostgreSQL', 'RocksDB']
domains: ["Databases"]
summary: "Comparison of B-Tree and LSM-Tree storage engines used in PostgreSQL, MySQL, RocksDB, and Cassandra."
key_facts: []
content_type: "article"
word_count: 76
has_transcript: False
duration: ""
---

Storage engines determine how databases read and write data on disk.

## B-Trees

B-Trees maintain sorted data with O(log n) reads and writes. Used by PostgreSQL, MySQL InnoDB, and SQLite.

## LSM-Trees

Log-Structured Merge Trees optimize writes through sequential I/O and compaction. Used by RocksDB and Cassandra.

## Write Amplification

LSM-Trees have higher write amplification due to compaction, but lower write latency.

## Hybrid Approaches

TiDB and CockroachDB combine B-Trees for indexing with LSM-Trees for storage.
