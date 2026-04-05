---
id: "wiki_retrievalaugmented-generation-rag"
type: "concept"
title: "Retrieval-Augmented Generation (RAG)"
created: "2026-03-16T20:30:09.884961"
updated: "2026-03-16T20:30:09.884961"
sources: ['src_20260316_203009_dc5b69']
tags: ['rag', 'llm', 'information-retrieval']
backlinks: []
---

# Retrieval-Augmented Generation (RAG)

## Summary

RAG combines retrieval from a knowledge base with language model generation to produce factually grounded answers.

RAG systems retrieve relevant documents from a corpus and feed them as context to a generative LLM.

## Architecture

A typical RAG pipeline consists of: document chunking, embedding generation, vector storage, retrieval, and generation.

## Chunking Strategies

Documents can be split by fixed token count, sentence boundaries, or semantic paragraphs.

## Embedding Models

Models like BERT, E5, and BGE produce dense vector representations for similarity search.

## Reranking

Cross-encoder rerankers improve precision by scoring query-document pairs jointly.

## Sources

- [src_20260316_203009_dc5b69](raw/src_20260316_203009_dc5b69.md)
