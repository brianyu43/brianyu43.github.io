---
num: 49
title: Low Bit Metal Kernels, Apple 쪽 저정밀 커널
original: "Lecture 49: Low Bit Metal Kernels"
speaker: Manuel Candales
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: partial
---

:::crux
transcript가 없어 이 강의의 Metal code나 benchmark는 확인할 수 없다. 제목과 notes가 말해 주는 범위는 low bit와 Metal kernels뿐이다. 이 source-limited 원고의 핵심 질문은 **CUDA/Triton 중심의 저정밀 kernel 감각을 Apple Metal 환경으로 옮길 때, 무엇은 그대로이고 무엇은 다시 배워야 하는가**다.
:::

## 1. 자료 한계부터 적는다

local archive에는 speaker, YouTube link, transcript failure만 있다. slides, code, repo folder는 없다. 따라서 int4, int8, quantization scheme, Apple GPU architecture, MPSGraph, Metal Shading Language 중 어떤 세부 내용을 다뤘는지는 확인 필요다.

다만 GPU Mode 맥락에서 `Low Bit Metal Kernels`는 분명한 위치가 있다. CUDA가 아닌 Apple GPU에서 low-bit inference kernel을 어떻게 구현하고 측정할 것인가다. CUDA 용어를 그대로 가져가면 일부는 도움이 되지만, 일부는 오해를 만든다.

## 2. low bit kernel의 공통 질문

low bit kernel은 storage를 줄여 memory bandwidth를 아끼려는 경우가 많다. int4나 int8 weight를 더 작은 memory footprint로 읽고, compute 직전에 dequantize하거나 scale을 적용한다. 이때 병목은 단순히 arithmetic이 아니라 unpack, scale load, layout, vectorization, memory coalescing이 된다.

CUDA든 Metal이든 질문은 비슷하다. bit-packed data를 어떤 단위로 읽을 것인가, scale/zero point를 어디에 둘 것인가, dequantize를 register에서 할 것인가, matmul이나 dot product와 어떻게 fuse할 것인가. 하지만 instruction set과 memory hierarchy가 다르므로 답은 달라질 수 있다.

:::figure flow
label: Figure · low-bit kernel의 일반 흐름
- packed load: int4/int8 weight를 압축된 layout으로 읽는다
- unpack: bit field를 vector/register 단위 값으로 푼다
- scale: group-wise scale이나 zero point를 적용한다
- compute: dot/matmul/activation과 fuse한다
- store: 필요한 dtype으로 accumulator나 output을 저장한다
:::

## 3. Metal에서는 용어를 다시 확인해야 한다

CUDA의 block, warp, shared memory, Tensor Core 같은 단어를 Apple Metal에 그대로 대응시키면 위험하다. Metal에는 threadgroup, SIMD-group, threadgroup memory 같은 별도 용어와 실행 모델이 있다. Apple GPU의 matrix acceleration path도 NVIDIA Tensor Core와 같은 API/ISA로 노출되지 않을 수 있다.

그래서 이 강의를 볼 때는 CUDA 번역표를 만들기보다 Metal의 원래 vocabulary를 먼저 적는 편이 좋다. threadgroup size, memory alignment, vector type, simdgroup operation, buffer layout, pipeline state 같은 항목을 확인해야 한다.

## 4. benchmark는 device class를 분리해서 봐야 한다

Apple Silicon은 laptop, desktop, mobile 계열이 섞여 있다. memory bandwidth, thermal envelope, GPU core count가 다르다. "Metal kernel이 빠르다"는 말도 어떤 chip과 OS, power state, tensor shape에서 빠른지 확인해야 한다.

또 PyTorch/MPS나 Core ML 같은 상위 stack과 비교할 때 data transfer와 conversion cost를 포함했는지 봐야 한다. low-bit kernel은 unpack/dequant overhead가 작아 보여도 end-to-end에서는 format conversion이 더 클 수 있다.

## 5. 손으로 해볼 것

간단한 int4 weight-only matrix-vector multiplication을 설계해 보자. weight 2개를 byte 하나에 pack하고, group size 32마다 scale 하나를 둔다고 가정한다. 한 thread가 몇 byte를 읽고, 어디서 unpack하며, scale을 몇 번 재사용하는지 적어 보면 low-bit kernel의 병목이 보인다.

원본 강의를 볼 때는 speaker가 이 일반 흐름 중 어디를 Metal-specific하게 바꿨는지 확인하자. 그 지점이 rich 원고의 중심이 된다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=PaPuu73wowE)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_049.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_049.md`
