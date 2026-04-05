---
id: "wiki_rust-ownership-and-borrowing"
type: "concept"
title: "Rust Ownership and Borrowing"
created: "2026-03-23T15:30:09.892782"
updated: "2026-03-23T15:30:09.892782"
sources: ['src_20260323_153009_e78c37']
tags: ['rust', 'memory-safety', 'systems-programming']
backlinks: []
---

# Rust Ownership and Borrowing

## Summary

Rust's ownership system provides memory safety without garbage collection through ownership, borrowing, and lifetimes.

Rust eliminates entire classes of bugs at compile time through its ownership model.

## Ownership Rules

Each value has exactly one owner. When the owner goes out of scope, the value is dropped.

## Borrowing

References allow temporary access without ownership transfer. Mutable and immutable borrows are exclusive.

## Lifetimes

Lifetime annotations ensure references remain valid. The borrow checker enforces these at compile time.

## Smart Pointers

Box, Rc, Arc, and RefCell provide flexible ownership patterns for heap allocation and shared state.

## Sources

- [src_20260323_153009_e78c37](raw/src_20260323_153009_e78c37.md)

<!-- Linked from [[rust-ownership-and-borrow-to-webassembly-for-server-si]] -->
