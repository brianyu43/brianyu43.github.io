---
num: 11
title: "sparsity: 0을 빨리 건너뛰기"
original: "Lecture 11: Sparsity"
speaker: Jesse Cai
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
sparsity의 약속은 간단하다. 0과 곱하는 일을 하지 말자. 하지만 GPU에서 진짜 빨라지려면 0을 표현하는 format, metadata를 읽는 비용, sparse kernel의 fusion 가능성까지 모두 맞아야 한다.
:::

## 1. 0을 곱하지 않는다는 말의 함정

수학적으로 0 곱하기 무엇은 즉시 0이다. 그렇다면 sparse tensor는 당연히 빨라야 할 것 같다. 하지만 dense matmul 방식 그대로 모든 위치를 훑으며 0을 곱하면 거의 이득이 없다.

Jesse는 이 차이를 분명히 한다. sparsity는 "0이 많다"가 아니라 "0을 건너뛸 수 있는 representation과 kernel이 있다"까지 포함해야 성능 기술이 된다.

따라서 sparse representation이 필요하다. nonzero 값만 저장하거나, block 단위 mask를 저장하거나, hardware가 이해하는 semi-structured pattern을 사용한다. 어떤 format을 고르느냐가 kernel의 모양을 결정한다.

## 2. unstructured, block, semi-structured

unstructured sparsity는 위치가 자유롭다. 가장 flexible하지만 GPU가 좋아하는 규칙적인 memory access와는 거리가 멀다. metadata가 많고 load pattern이 흩어질 수 있다.

block sparsity는 작은 block 단위로 0인지 아닌지를 정한다. 예를 들어 32x32나 4x4 같은 block을 생각할 수 있다. flexibility는 줄지만, block 단위로 건너뛰고 dense-like 연산을 할 수 있어 GPU에 더 친절하다.

semi-structured sparsity는 hardware나 library가 지원하는 특정 pattern을 따른다. 제약이 강하지만, 지원되는 path에서는 성능을 얻기 쉽다. "얼마나 자유로운 sparsity인가"와 "얼마나 빠르게 실행 가능한가"는 trade-off다.

:::figure grid
label: Figure · sparsity pattern의 감각
- cell: unstructured는 아무 위치나 0이 될 수 있다.
- cell: block sparsity는 작은 사각형 단위로 살리거나 버린다.
- cell: semi-structured는 hardware/library가 기대하는 규칙을 따른다.
- cell: pattern이 규칙적일수록 kernel은 단순해지고, pruning 자유도는 줄어든다.
:::

## 3. pruning은 offline, sparse matmul은 online

sparsity는 보통 두 단계로 나눠 생각하면 편하다. 먼저 offline에서 어떤 weight를 0으로 만들지 결정하고 sparse format으로 변환한다. inference 때는 compressed representation과 sparse kernel을 사용한다.

이 구분은 latency를 이해하는 데 중요하다. pruning 자체가 inference path에 들어오면 느리다. inference에서는 이미 준비된 sparse weight를 빠르게 읽고 계산해야 한다.

하지만 model을 sparse하게 만드는 방법도 정확도에 영향을 준다. 작은 값부터 제거할지, retraining을 할지, SparseGPT 같은 방법을 쓸지에 따라 품질이 달라진다.

## 4. quantization과 같이 쓰면 더 복잡하다

강의는 sparsity와 quantization을 함께 쓰는 어려움도 다룬다. 둘 다 memory와 compute를 줄이려는 기술이지만, composition은 단순 덧셈이 아니다.

예를 들어 sparse matmul을 cuSPARSELt 같은 library call로 처리하고, 앞뒤에 quantize/dequantize kernel을 붙이면 operator fusion이 깨질 수 있다. memory 왕복이 늘어나면 sparsity에서 얻은 이득을 다시 잃는다.

반대로 sparse와 quantization을 하나의 fused kernel로 묶으려면 kernel 작성 난도가 올라간다. metadata, scale, packed value, sparse index를 모두 다뤄야 한다. 이 지점이 active research와 engineering의 경계다.

## 5. library 지원의 현실

GPU sparse kernel은 dense kernel만큼 보편적이지 않다. dense GEMM은 cuBLAS, CUTLASS, Triton 등 강한 도구가 많지만, sparse는 format과 pattern에 따라 지원 범위가 갈린다.

강의에서는 sparse kernel이 없어서 직접 구현하거나, library를 쓰되 fusion이 안 되어 성능이 기대보다 낮아지는 상황이 나온다. 이것이 sparsity가 논문 그림만큼 쉽게 제품 성능으로 이어지지 않는 이유다.

또한 sparse format은 model architecture와도 맞아야 한다. LLM과 Vision Transformer에서 어떤 layer를 sparse하게 만들지, activation sparsity를 볼지 weight sparsity를 볼지에 따라 적용점이 달라진다.

## 6. 실험 과제

작은 matrix를 dense, unstructured sparse, block sparse 세 format으로 만들어 보자. nonzero 비율이 같아도 memory access와 metadata 크기가 어떻게 다른지 계산해 보는 것이 먼저다.

그 다음 sparse matmul 앞뒤에 dequantize나 activation function을 붙였을 때 kernel launch와 memory traffic이 어떻게 늘어나는지 profiler로 확인해 보자. sparsity의 적은 종종 "0"이 아니라 "그 0을 설명하는 부가 정보"다.

:::tip
sparsity 성능 수치를 볼 때는 sparse 비율만 보지 말고 pattern, metadata format, baseline dense kernel, fusion 여부를 같이 확인하자. 이 네 가지가 빠지면 비교가 꽤 흐려진다.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=mGDnOLcfE8g)
- [Slides](https://github.com/gpu-mode/lectures/blob/main/lecture_011/sparsity.pptx)
- [Code / speaker GitHub](https://github.com/jcaip)
- [Related folder](https://github.com/gpu-mode/lectures/tree/main/lecture_011)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_011.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_011.md`
