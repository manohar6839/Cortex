---
id: "wiki_diffusion-models-for-image-generation"
type: "concept"
title: "Diffusion Models for Image Generation"
created: "2026-04-01T18:30:09.896555"
updated: "2026-04-01T18:30:09.896555"
sources: ['src_20260401_183009_bc4fd1']
tags: ['diffusion-models', 'generative-ai', 'computer-vision']
backlinks: []
---

# Diffusion Models for Image Generation

## Summary

How diffusion models like Stable Diffusion and DALL-E work: forward noise process, reverse denoising, and conditioning.

Diffusion models generate images by learning to reverse a noise-adding process.

## Forward Process

Gradually adds Gaussian noise to data over T timesteps until it becomes pure noise.

## Reverse Process

A neural network learns to predict and remove noise at each step, recovering the original signal.

## Latent Diffusion

Stable Diffusion operates in a compressed latent space, dramatically reducing computational cost.

## Conditioning

Text conditioning via CLIP embeddings enables text-to-image generation with incredible fidelity.

## Sources

- [src_20260401_183009_bc4fd1](raw/src_20260401_183009_bc4fd1.md)
