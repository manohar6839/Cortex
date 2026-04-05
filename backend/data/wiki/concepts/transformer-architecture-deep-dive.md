---
id: "wiki_transformer-architecture-deep-dive"
type: "concept"
title: "Transformer Architecture Deep Dive"
created: "2026-03-15T21:30:09.883543"
updated: "2026-03-15T21:30:09.883543"
sources: ['src_20260315_213009_2c3aef']
tags: ['machine-learning', 'transformers', 'attention']
backlinks: []
---

# Transformer Architecture Deep Dive

## Summary

Explores the self-attention mechanism, multi-head attention, positional encoding, and layer normalization in the original Transformer architecture.

The Transformer model introduced by Vaswani et al. revolutionized NLP by replacing recurrence with self-attention.

## Self-Attention

Self-attention computes queries, keys, and values from input embeddings. The attention score is softmax(QK^T / sqrt(d_k))V.

## Multi-Head Attention

Multiple attention heads allow the model to attend to different representation subspaces simultaneously.

## Positional Encoding

Sinusoidal positional encodings inject sequence order information since the architecture lacks recurrence.

## Layer Normalization

Applied before each sub-layer to stabilize training and improve convergence speed.

## Sources

- [src_20260315_213009_2c3aef](raw/src_20260315_213009_2c3aef.md)

<!-- Linked from [[distributed-systems-conse-to-event-driven-architecture]] -->

<!-- Linked from [[transformer-architecture--to-retrieval-augmented-gener]] -->
