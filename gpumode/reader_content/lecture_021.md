---
num: 21
title: Scan 최적화의 세 층
original: "Lecture 21: Scan Algorithm Part 2"
speaker: Izzat El Haj
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
Scan 최적화는 “parallel하게 만들었다”에서 끝나지 않는다. extra work를 줄이고, `__syncthreads()`를 줄이고, thread가 여러 element를 처리하게 해 register를 활용해야 한다. 이 강의의 중심은 **block, warp, thread라는 세 층에서 scan을 다시 나누는 법**이다.
:::

## 1. 지난 시간의 비용을 다시 본다

Lecture 20의 scan은 shared memory를 이용해 single block scan을 만들었다. 하지만 단순한 Kogge-Stone식 접근은 O(n log n) work를 할 수 있고, step마다 synchronization이 필요하다. parallelism을 얻는 대신 work와 sync 비용을 냈다.

GPU에서 sync는 공짜가 아니다. 특히 scan은 latency-bound 성격이 강해서 `__syncthreads()`가 많이 들어가면 성능이 쉽게 막힌다. 그래서 part 2는 같은 연산을 더 적은 work와 더 적은 sync로 하는 방법을 찾는다.

## 2. Brent-Kung: 덜 일하는 scan

Brent-Kung scan은 reduction tree와 down-sweep에 가까운 구조로 work를 줄인다. 모든 step에서 모든 thread가 바쁘지는 않다. 어떤 단계에서는 active thread가 줄어 idle warp가 생긴다. 대신 전체 work는 더 효율적이다.

여기서 trade-off가 보인다. Kogge-Stone은 parallel step이 많고 work도 많지만 구조가 단순하다. Brent-Kung은 work efficient하지만 일부 단계에서 병렬성이 덜 찬다. 어떤 쪽이 빠른지는 hardware, block size, sync cost에 따라 달라진다. 그래서 알고리즘 이름만 외우면 부족하고, profiler로 봐야 한다.

:::figure ladder
label: Figure · scan 최적화의 층위
- block: segment를 shared memory에서 scan하고 partial sum을 남김
- warp: warp 내부는 shuffle로 sync 비용을 줄임
- thread: 한 thread가 여러 element를 sequential scan
- register: thread-local segment를 register에 보관
- global: block partial sum을 다시 scan하거나 single-pass로 전파
:::

## 3. thread coarsening과 register tiling

Thread coarsening은 thread 하나가 element 하나만 처리하지 않고 여러 element를 맡게 하는 방식이다. 예를 들어 한 thread가 4개나 8개의 consecutive element를 register에 읽어 sequential scan을 한다. 그 thread는 자기 local partial sum을 block-level scan에 제공하고, 나중에 앞 thread들의 prefix를 더한다.

이 방식은 좋은 이유가 있다. thread 내부 sequential scan은 work efficient하고 sync가 필요 없다. shared memory 접근도 줄어든다. 대신 register 사용량이 늘고 occupancy가 떨어질 수 있다. occupancy는 높을수록 무조건 좋은 값이 아니다. memory latency를 숨길 만큼 충분하면 되고, 더 많은 register로 work를 줄이는 편이 나을 수 있다.

## 4. warp-level primitive의 힘

Warp 내부 thread들은 더 싸게 협력할 수 있다. shuffle instruction을 이용하면 shared memory와 block-wide sync 없이 값 교환이 가능하다. block 전체를 바로 scan하기보다, 각 warp가 자기 scan을 하고, warp별 partial sum을 모아 scan한 뒤 다시 각 warp에 더하는 구조를 만들 수 있다.

이렇게 하면 block-wide `__syncthreads()` 수가 줄어든다. 강의에서도 scan은 latency-bound이고 sync가 큰 bottleneck이라고 짚는다. warp-level scan은 이 병목을 직접 겨냥한다. GPU에서 “같은 block 안”이라는 말은 충분히 구체적이지 않다. warp 안인지, warp 사이인지가 다르다.

## 5. partial sums를 다시 global로 보내는 문제

여러 block으로 나뉜 scan에서는 각 block의 partial sum을 처리해야 한다. 가장 단순한 방법은 local scan kernel, partial sums scan kernel, add kernel을 따로 launch하는 것이다. 이해하기 쉽지만 global memory에 partial sums를 쓰고 다시 읽는 왕복이 생긴다.

강의 후반에는 single-pass scan 아이디어도 언급된다. block들이 순서대로 partial sum 상태를 보고 앞 block의 prefix를 이어받는 방식이다. 여기에는 block 간 synchronization을 직접 할 수 없다는 CUDA의 제약, memory ordering, status flag 같은 문제가 따라온다. Lecture 24의 decoupled look-back으로 이어지는 다리다.

## 6. 손으로 해볼 것

8개 element scan을 Kogge-Stone과 Brent-Kung 표로 각각 그려보자. 각 step에서 몇 개 thread가 active한지 세고, 총 add 수를 비교한다. 그 다음 한 thread가 2개 element를 맡는 coarsening 버전을 그려 local scan과 block scan이 어떻게 나뉘는지 본다.

CUDA 실습에서는 warp shuffle 기반 scan을 작은 block에서 구현해보는 것이 좋다. 같은 결과를 shared memory 버전과 비교하고, Nsight Compute에서 shared memory transaction과 synchronization 비용이 어떻게 달라지는지 확인한다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=MH5_FeSSdIE)
- [Slides](https://docs.google.com/presentation/d/1MEMsE5LKi6ush_60hlYu3-cz4DUCFzSL/edit?usp=sharing&ouid=106222972308395582904&rtpof=true&sd=true)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_021.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_021.md`
