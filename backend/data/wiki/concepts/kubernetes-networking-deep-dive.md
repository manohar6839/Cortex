---
id: "wiki_kubernetes-networking-deep-dive"
type: "concept"
title: "Kubernetes Networking Deep Dive"
created: "2026-03-26T13:30:09.894161"
updated: "2026-03-26T13:30:09.894161"
sources: ['src_20260326_133009_a312d8']
tags: ['kubernetes', 'networking', 'infrastructure']
backlinks: []
---

# Kubernetes Networking Deep Dive

## Summary

Covers pod networking, services, ingress controllers, network policies, and service mesh patterns in Kubernetes.

Kubernetes networking enables communication between pods, services, and external clients.

## Pod Networking

Every pod gets a unique IP. CNI plugins (Calico, Cilium, Flannel) implement the network model.

## Services

ClusterIP, NodePort, and LoadBalancer services provide stable endpoints for pod groups.

## Ingress

Ingress controllers (nginx, Traefik, Ambassador) handle HTTP routing, TLS termination, and rate limiting.

## Service Mesh

Istio and Linkerd add observability, traffic management, and mTLS between services transparently.

## Sources

- [src_20260326_133009_a312d8](raw/src_20260326_133009_a312d8.md)

<!-- Linked from [[kubernetes-networking-dee-to-observability-logs-metric]] -->
