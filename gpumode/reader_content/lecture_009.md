---
num: 9
title: reduction을 제대로 접는 법
original: Lecture 9 Reductions
speaker: Mark Saroufim
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
reduction은 많은 값을 하나로 접는 연산이다. sum, max, min, norm, softmax의 일부가 모두 여기에 걸린다. 빠른 reduction은 thread를 많이 쓰는 것보다 "어떻게 반씩 접고, 어디에 중간값을 두며, 언제 동기화하는가"가 중요하다.
:::

## 1. reduction은 어디에나 있다

reduction은 vector의 max를 구하거나 합을 구하는 단순한 예제로 시작한다. 하지만 실제로는 훨씬 자주 나온다. normalization은 평균과 분산을 줄이고, softmax는 max와 sum을 구하며, attention도 tile별 reduction을 품고 있다.

PyTorch에서는 `torch.max`, `torch.sum` 같은 API를 부르면 내부에서 CUDA reduction kernel이 실행되거나 생성된다. 사용자는 한 줄을 쓰지만, 아래에서는 많은 thread가 협력해 값을 접는다.

이 강의의 목표는 유명한 reduction algorithm을 naive version에서 시작해 점점 빠르게 만드는 것이다. GPU 성능 공부에 아주 좋은 형태다. 단순하고, 병목이 분명하고, 개선 단계가 눈에 보인다.

## 2. serial reduction에서 parallel tree로

serial reduction은 한 변수를 들고 왼쪽부터 오른쪽까지 훑는다. GPU에서는 이 방식이 아깝다. 많은 값을 동시에 비교하거나 더할 수 있기 때문이다.

parallel reduction tree는 값을 짝지어 줄인다. 첫 단계에서 여러 thread가 각자 두 값을 합치고, 다음 단계에서 절반의 thread가 다시 합친다. 이렇게 반복하면 log 단계로 하나의 결과에 가까워진다.

하지만 이 과정에는 divergence가 있다. 단계가 진행될수록 active thread 수가 줄어든다. warp 단위 실행에서는 놀고 있는 lane이 생긴다. 좋은 kernel은 이 비효율을 줄이기 위해 indexing과 memory layout을 조정한다.

:::figure flow
label: Figure · reduction tree
- stage: 각 thread가 입력의 일부를 읽는다.
- stage: 가까운 원소끼리 pairwise로 합치거나 비교한다.
- stage: stride를 키우며 active thread 수를 절반씩 줄인다.
- stage: block 안 결과를 shared memory에 모은다.
- stage: 여러 block 결과는 다음 kernel이나 atomic/reduction 단계로 합친다.
:::

## 3. global memory에서 shared memory로

naive reduction은 중간 결과를 global memory에 쓰고 다시 읽을 수 있다. 이는 느리다. block 안에서 처리할 수 있는 부분은 shared memory에 올려 두고 줄이는 편이 낫다.

강의의 shared memory version은 첫 load 이후 reduction을 shared memory에서 진행한다. Nsight Compute로 보면 cache hit나 memory throughput 지표가 달라질 수 있다. 다만 shared memory에 전체 input이 들어간다고 가정하면 큰 입력에서 틀린 결과가 나온다.

이 지점이 중요하다. 작은 예제에서 맞는 kernel이 큰 문제에서 틀릴 수 있다. reduction은 block-local 결과와 global result를 나누어 생각해야 한다.

## 4. correctness가 은근히 어렵다

floating point reduction은 순서에 따라 결과가 조금 달라질 수 있다. 병렬 reduction은 serial loop와 덧셈 순서가 다르므로 bitwise로 완전히 같지 않을 수 있다. 이것은 bug일 수도 있고 floating point의 정상적인 성질일 수도 있다.

강의 자료에 `accuracy.py`, `nondeterminism.py`, `sensitivity.py`가 있는 이유가 여기에 있다. reduction은 성능뿐 아니라 numerical behavior도 함께 봐야 한다.

max reduction처럼 비교 중심인 경우와 sum reduction처럼 누적 오차가 생기는 경우를 구분하자. softmax에서는 안정성을 위해 max를 먼저 빼는 stabilized softmax가 필요하다.

## 5. PyTorch의 일반 reduction을 상상하기

PyTorch에는 min kernel, max kernel이 각각 완전히 따로 있다기보다, 다양한 reduction을 처리하는 일반화된 machinery가 있다. dtype, dimension, stride, contiguous 여부를 감당해야 하므로 단순 예제보다 훨씬 복잡하다.

우리가 작은 CUDA 파일로 배우는 것은 그 내부의 뼈대다. thread가 일부 값을 맡고, block 안에서 줄이고, block 결과를 다시 합친다. 실제 framework는 여기에 broadcasting, shape, stride, dispatch, generated kernel 같은 층을 붙인다.

Triton으로도 reduction을 작성할 수 있다. block size와 mask, `tl.max`, `tl.sum` 같은 primitive가 나오지만, 원리는 같다. 어디서 줄이고 어디서 memory를 오가는지가 핵심이다.

## 6. 실험 과제

`simple_reduce.cu`, `shared_reduce.cu`, `reduce_coarsening.cu`를 차례로 읽고 같은 입력에서 결과와 profile을 비교해 보자. 입력 크기를 shared memory에 들어가는 크기와 훨씬 큰 크기로 나누어 실행하면 가정이 어디서 깨지는지 보인다.

그 다음 softmax를 reduction 관점에서 다시 보자. max reduction, exp, sum reduction, normalize가 어떤 순서로 이어지는지 적어 보면 attention kernel이 덜 낯설어진다.

:::tip
reduction 결과가 PyTorch와 아주 조금 다를 때 바로 틀렸다고 단정하지 말자. dtype, 연산 순서, tolerance를 확인하되, 큰 차이가 나면 block 간 합치는 단계를 먼저 의심하자.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=09wntC6BT5o)
- [Slides](https://docs.google.com/presentation/d/1s8lRU8xuDn-R05p1aSP6P7T5kk9VYnDOCyN5bWKeg3U/edit?usp=sharing)
- [Code](https://github.com/gpu-mode/lectures/tree/main/lecture_009)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_009.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_009.md`
