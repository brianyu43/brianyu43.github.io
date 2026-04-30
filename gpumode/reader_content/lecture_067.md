---
num: 67
title: NCCL과 NVSHMEM, collective와 one-sided 사이
original: "Lecture 67: NCCL and NVSHMEM"
speaker: Jeff Hammond
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
transcript는 실패했지만 title, slides link, code link가 남아 있다. 이 강의의 중심 질문은 **multi-GPU program에서 NCCL 같은 collective abstraction과 NVSHMEM 같은 GPU-centric communication model을 언제, 어떤 감각으로 구분해 써야 하는가**다. 세부 benchmark와 API 예제는 원본 slides/code 확인이 필요하다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Jeff Hammond로 기록되어 있고, slides는 Google Drive, code는 ParRes `Kernels/tree/main/Cxx11`로 연결되어 있다. transcript가 없으므로 lecture가 어떤 kernel 예제를 live로 다뤘는지, NCCL과 NVSHMEM을 어떤 순서로 비교했는지는 알 수 없다.

그래도 제목만으로도 읽는 축은 꽤 분명하다. NCCL은 all-reduce, broadcast, all-gather 같은 collective communication을 다루는 대표 library다. NVSHMEM은 GPU thread가 remote memory access와 synchronization을 더 직접적으로 표현할 수 있게 하는 PGAS 계열 model로 읽을 수 있다.

## 2. collective는 "다 같이 약속한 동작"이다

NCCL을 쓸 때 programmer는 보통 "이 tensor를 모든 GPU에서 reduce하자"처럼 group operation을 요청한다. library는 topology, protocol, chunking, scheduling을 안쪽에서 처리한다. 사용자는 높은 수준의 collective semantics를 얻고, 대신 세부 통신 순서는 library에게 맡긴다.

이 abstraction은 training에서 특히 강하다. data parallel all-reduce, tensor parallel all-gather, pipeline boundary communication처럼 pattern이 반복될 때 collective API는 읽기 쉽고 실수도 줄인다. 하지만 모든 communication이 예쁜 collective로 떨어지지는 않는다. irregular exchange, fine-grained handoff, computation과 communication의 촘촘한 overlap을 직접 표현하고 싶을 때 다른 model이 필요해진다.

:::figure flow
label: Figure · 두 communication model의 감각
- NCCL call: host 또는 framework가 collective operation을 요청한다
- collective schedule: library가 ring/tree/protocol 같은 세부 경로를 정한다
- NVSHMEM put/get: GPU 쪽 코드가 remote memory 접근을 더 직접 표현한다
- sync point: collective barrier 또는 finer-grained signal/wait로 순서를 맞춘다
- benchmark: message size, topology, overlap 가능성을 따로 본다
:::

## 3. NVSHMEM을 볼 때의 질문

NVSHMEM을 "NCCL보다 low-level"이라고만 기억하면 조금 아쉽다. 더 좋은 질문은 communication을 kernel 내부의 control flow와 얼마나 가까이 붙일 수 있느냐다. GPU가 remote data를 가져오거나 밀어 넣고, 필요한 순간에 signal을 기다리는 식의 표현은 특정 알고리즘에서 CPU scheduling 부담을 줄일 수 있다.

물론 그 자유에는 비용이 있다. memory ordering, synchronization, progress, topology를 더 많이 이해해야 한다. collective가 숨겨 주던 세부 사항이 다시 programmer 앞으로 나온다. 이 강의의 code link를 볼 때도 "API가 신기하다"보다 "어떤 pattern에서 이 노출이 이득인가"를 먼저 물어보면 좋다.

## 4. 성능에서 조심할 점

multi-GPU 성능은 bandwidth 숫자 하나로 끝나지 않는다. 작은 message는 latency와 synchronization overhead가 지배할 수 있고, 큰 message는 link bandwidth와 topology가 중요해진다. computation과 communication이 겹치는지, stream synchronize가 숨어 있는지도 봐야 한다.

특히 NCCL과 NVSHMEM을 비교한다면 같은 일을 하고 있는지부터 확인해야 한다. collective와 one-sided operation은 API semantics가 다르기 때문에, benchmark가 공정하려면 data movement 양, synchronization 조건, correctness check를 맞춰야 한다.

## 5. 손으로 해볼 것

두 GPU가 있다면 작은 all-reduce benchmark와 point-to-point style exchange benchmark를 나눠 돌려 보자. message size를 바꾸며 latency 구간과 bandwidth 구간이 어디서 갈라지는지 적어 둔다. GPU가 없다면 ParRes code를 읽으며 communication call이 어디에서 synchronization을 요구하는지만 표시해도 좋다.

원본 slides를 볼 때는 NCCL과 NVSHMEM의 결론을 "A가 B보다 빠르다"로 적지 말자. 어느 topology, 어느 message size, 어느 synchronization model에서 그런지까지 같이 적어야 다음 사람이 다시 실험할 수 있다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=zxGVvMN6WaM)
- [Slides](https://drive.google.com/file/d/1T8uHhFIeVa_g1oYb_O4d2Ltb8YQly1zK/view?usp=sharing)
- [Code](https://github.com/ParRes/Kernels/tree/main/Cxx11)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_067.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_067.md`
