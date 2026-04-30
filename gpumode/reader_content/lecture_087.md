---
num: 87
title: NVSHMEM, communication을 kernel 가까이로
original: "Lecture 87: Low Latency Communication Kernels with NVSHMEM"
speaker: Prajwal Singhania
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: High
status: partial
---

:::crux
구체 API, benchmark, topology claim은 원본 확인이 필요하다. 다만 notes가 `kernel`과 `NVSHMEM`을 핵심 term으로 잡고 있으므로, 이 장은 **low-latency communication을 host orchestration 바깥, GPU kernel 가까운 곳에서 생각하는 법**을 준비한다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Prajwal Singhania로 기록되어 있고 YouTube 링크만 있다. transcript fetch는 실패했다. slides와 code는 missing이다. notes는 `kernel`과 `NVSHMEM`을 핵심 term으로 잡았다.

NVSHMEM은 GPU 중심의 partitioned global address space 통신 library로 설명할 수 있다. 다만 이 강의가 어떤 primitive나 kernel 예제를 다뤘는지는 알 수 없다. 그러니 여기서는 API 사용법보다, NVSHMEM 이야기를 들을 때 어떤 성능과 correctness 질문을 적어야 하는지에 집중한다.

## 2. 왜 communication kernel인가

multi-GPU program에서는 계산 kernel만 빠르다고 끝나지 않는다. GPU 사이에 activation, gradient, KV cache, partial result가 오가야 한다. 이때 CPU가 큰 collective call을 순서대로 넣는 방식은 단순하지만, fine-grained overlap을 놓칠 수 있다.

communication을 kernel 가까이로 가져오면 GPU가 계산 흐름 안에서 remote memory operation이나 synchronization을 더 직접 표현할 수 있다. 잘 맞으면 latency를 줄이고 overlap을 늘릴 수 있다. 잘못 쓰면 ordering bug와 deadlock이 기다린다. 문은 낮아져도 바닥은 깊다.

:::figure flow
label: Figure · computation과 communication을 겹쳐 읽기
- compute: local tile이나 partial result를 만든다
- signal: remote GPU가 읽어도 되는 상태를 알린다
- transfer: NVSHMEM primitive로 data를 이동하거나 접근한다
- wait: 필요한 dependency를 만족할 때까지 기다린다
- continue: 다음 compute tile로 넘어가 overlap을 만든다
:::

## 3. latency를 볼 때의 함정

low latency communication은 작은 message에서 특히 중요하다. 하지만 latency만 보면 bandwidth를 놓치고, bandwidth만 보면 synchronization cost를 놓친다. message size, GPU topology, intra-node/inter-node 여부, stream interaction을 같이 봐야 한다.

NVSHMEM 같은 도구는 programmer에게 더 많은 통제권을 준다. 그만큼 memory ordering, visibility, barrier semantics를 정확히 알아야 한다. "작동했다"와 "항상 맞다"는 분산 GPU 코드에서 꽤 먼 사이일 수 있다.

## 4. LLM workload와 연결하기

LLM training에서는 tensor parallelism, pipeline parallelism, optimizer state sharding 같은 곳에서 communication이 중요하다. inference에서도 multi-GPU serving, KV cache placement, expert parallelism이 communication path를 만든다.

이 강의를 볼 때는 어떤 workload를 target으로 삼는지 확인하자. collective 대체인지, point-to-point RMA인지, custom kernel 안의 fine-grained synchronization인지에 따라 평가 기준이 다르다. NCCL과 비교한다면 어떤 조건에서 비교했는지도 꼭 봐야 한다.

## 5. 혼자 해볼 것

두 GPU가 있다고 가정하고, 한 GPU의 tile 결과를 다른 GPU가 언제 필요로 하는지 timeline을 그려 보자. CPU가 collective을 launch하는 방식과 device-side communication이 가능한 방식을 나란히 그리면 overlap의 가능성과 위험이 같이 보인다.

실제 실험을 한다면 작은 ping-pong latency test부터 시작하자. message size를 바꾸고, synchronization 위치를 바꾸며 측정한다. distributed kernel은 큰 model보다 작은 실험에서 먼저 진실을 말해 준다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=6bqnqDZg4_0)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_087.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_087.md`
