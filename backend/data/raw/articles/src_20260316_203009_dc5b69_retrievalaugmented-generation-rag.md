---
id: "src_20260316_203009_dc5b69"
type: "article"
source_url: "https://example.com/articles/retrievalaugmented-generation-rag"
title: "Retrieval-Augmented Generation (RAG)"
author: "Research Team"
platform: "web"
date: "2026-03-16T20:30:09.884961"
captured: "2026-03-16T20:30:09.884961"
status: "compiled"
tags: ['rag', 'llm', 'information-retrieval']
entities: ['OpenAI', 'Meta AI']
domains: ["AI Research"]
summary: "RAG combines retrieval from a knowledge base with language model generation to produce factually grounded answers."
key_facts: []
content_type: "article"
word_count: 77
has_transcript: False
duration: ""
---

RAG systems retrieve relevant documents from a corpus and feed them as context to a generative LLM.

## Architecture

A typical RAG pipeline consists of: document chunking, embedding generation, vector storage, retrieval, and generation.

## Chunking Strategies

Documents can be split by fixed token count, sentence boundaries, or semantic paragraphs.

## Embedding Models

Models like BERT, E5, and BGE produce dense vector representations for similarity search.

## Reranking

Cross-encoder rerankers improve precision by scoring query-document pairs jointly.
