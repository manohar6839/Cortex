---
id: "wiki_database-internals-btrees-and-lsmtrees"
type: "concept"
title: "Database Internals: B-Trees and LSM-Trees"
created: "2026-03-28T13:30:09.895792"
updated: "2026-03-28T13:30:09.895792"
sources: ['src_20260328_133009_4c22c3']
tags: ['databases', 'b-tree', 'lsm-tree']
backlinks: []
---

# Database Internals: B-Trees and LSM-Trees

## Summary

Comparison of B-Tree and LSM-Tree storage engines used in PostgreSQL, MySQL, RocksDB, and Cassandra.

Storage engines determine how databases read and write data on disk.

## B-Trees

B-Trees maintain sorted data with O(log n) reads and writes. Used by PostgreSQL, MySQL InnoDB, and SQLite.

## LSM-Trees

Log-Structured Merge Trees optimize writes through sequential I/O and compaction. Used by RocksDB and Cassandra.

## Write Amplification

LSM-Trees have higher write amplification due to compaction, but lower write latency.

## Hybrid Approaches

TiDB and CockroachDB combine B-Trees for indexing with LSM-Trees for storage.

## Sources

- [src_20260328_133009_4c22c3](raw/src_20260328_133009_4c22c3.md)
