---
layout: post
title: "CUDA Training — 3일, 11편, vector_add에서 Flash Attention까지"
date: 2026-04-20 15:00:00 +0900
categories: cuda gpu
excerpt: "Apple Silicon 로컬, GCP T4·L4 스팟 VM, 72시간. vector_add 한 줄에서 cuDNN Flash Attention-2의 80%까지, 11편으로 복원한 학습 로그."
---

GPU에 직접 손을 대본 적 없는 엔지니어가 3일 동안 T4·L4 위에서 남긴 커널 9개, 벤치 70여 개, 그리고 거기서 건진 시스템 감각. 전 과정을 처음부터 끝까지 복원한 11편짜리 시리즈다.

## 숫자로 본 결과

- **9**개 — CUDA / Triton 커널
- **4.79×** — Flash Attention speedup (N=4096, T4)
- **65×** — HBM 트래픽 절감
- **54 TFLOPS** — Triton fp16 matmul
- **0.86×** — cuDNN FA-2 대비 (L4, 300줄 Triton)

## 구성

**PART I · Memory** — vector_add, pageable vs pinned
**PART II · Parallelism** — reduction, matmul
**PART III · Fusion & Attention** — softmax fusion, Flash Attention capstone
**PART IV · Integration** — PyTorch custom op, Triton 포팅, MHA causal FA
**PART V · Essays** — Triton vs CUDA, 300줄의 비밀

디자인·조판을 유지하려고 블로그 본문에 풀어놓는 대신 별도 포털로 묶었다.

---

**[전체 시리즈 읽기 → `/cudatraining/`](/cudatraining/)**
