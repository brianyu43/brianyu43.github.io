---
num: 46
title: Distributed GEMM, 통신까지 포함한 matmul
original: "Lecture 46: Distributed GEMM"
speaker: Ali Hassani
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: partial
---

:::crux
이 원고는 transcript 없이 notes와 제목, slide link만 보고 쓴 source-limited 원고다. Distributed GEMM의 세부 algorithm은 강의 확인 전까지 단정하지 않는다. 다만 중심 질문은 분명하다. **GEMM이 한 GPU 안의 tile 문제가 아니라 여러 GPU 사이의 data partition, collective communication, overlap 문제가 되면 무엇이 달라지는가**다.
:::

## 1. local GEMM과 distributed GEMM은 병목의 모양이 다르다

한 GPU 안의 GEMM에서는 Tensor Core utilization, shared memory tiling, register reuse, TMA pipeline 같은 질문이 먼저 온다. Distributed GEMM에서는 여기에 통신이 붙는다. A와 B를 어떻게 나누고, partial result를 어디서 합치며, 어떤 collective를 쓰고, compute와 communication을 어떻게 겹칠지가 성능을 좌우한다.

local notes에는 title과 speaker, slide link만 있고 transcript는 실패했다. 따라서 강의가 row/column parallelism, 2D SUMMA, ring, all-gather, reduce-scatter 중 무엇을 다뤘는지는 확인 필요다. 이 글에서는 distributed GEMM을 읽을 때 필요한 기본 틀만 잡는다.

:::figure flow
label: Figure · Distributed GEMM에서 생기는 추가 경로
- partition: A/B/C matrix를 GPU들에 row, column, 2D grid로 나눈다
- local compute: 각 GPU가 자기 tile의 GEMM을 수행한다
- communication: 필요한 A/B tile이나 partial C를 collective로 주고받는다
- overlap: 다음 tile 통신과 현재 tile compute를 겹친다
- reduction: partial result를 합쳐 최종 C shard를 만든다
:::

## 2. partition이 algorithm을 정한다

GEMM `C = A B`에서 A를 row-wise로 나누면 각 GPU는 C의 row shard를 계산할 수 있지만 B 전체가 필요할 수 있다. B를 column-wise로 나누면 C의 column shard를 얻지만 A 전체가 필요하다. 2D partition은 memory와 communication을 더 균형 있게 만들 수 있지만 scheduling과 collective가 복잡해진다.

어떤 partition이 좋은지는 cluster topology와 matrix shape에 달려 있다. NVLink, PCIe, InfiniBand, node boundary가 모두 다르다. 같은 FLOP 수라도 data movement가 다르면 distributed GEMM의 시간이 달라진다. 그래서 distributed GEMM은 local roofline만으로 설명되지 않는다.

## 3. overlap이 없으면 통신이 그대로 보인다

여러 GPU에서 matmul을 하려면 어차피 data를 주고받아야 한다. 중요한 것은 그 시간이 compute 뒤에 줄 서느냐, compute와 겹치느냐이다. tile 단위로 쪼개고, 한 tile을 계산하는 동안 다음 tile을 all-gather하거나 reduce-scatter하면 통신 비용을 일부 숨길 수 있다.

다만 overlap은 공짜가 아니다. stream, event, buffer lifetime, collective ordering이 모두 맞아야 한다. 너무 작은 tile은 launch와 collective overhead를 키우고, 너무 큰 tile은 overlap 기회를 줄인다. H100 같은 빠른 GPU에서는 compute가 짧아져 통신을 숨기기 더 어려워질 수도 있다.

## 4. correctness도 분산된다

distributed GEMM에서는 성능만 아니라 correctness debugging도 어려워진다. 한 rank의 shard shape가 틀리거나, collective group이 어긋나거나, accumulation order가 달라지면 결과가 조금씩 혹은 크게 달라진다. mixed precision이나 low precision accumulation이 끼면 재현성 문제도 커진다.

강의를 볼 때는 benchmark보다 먼저 data layout diagram을 찾자. 각 GPU가 어떤 A/B/C shard를 들고 시작하고 끝나는지, 중간 buffer가 어떤 shape인지 그릴 수 있어야 한다. 그림이 안 그려지면 performance number도 오래 못 간다.

## 5. 손으로 해볼 것

GPU 4개를 2x2 grid로 두고 `C = A B`를 계산한다고 상상해 보자. A와 B를 각각 2D block으로 나눈 뒤, 각 GPU가 어떤 block을 갖고 있고 어떤 block을 받아야 `C_ij`를 계산할 수 있는지 써 보자. 그 다음 각 step에서 필요한 all-gather 또는 send/recv를 표시한다.

원본 강의를 다시 볼 때는 slide의 algorithm 이름을 확인하고, 이 손그림과 비교하면 좋다. 특히 "communication volume", "overlap", "topology aware" 같은 단어가 나오면 실제로 어떤 buffer와 collective를 말하는지 붙잡아야 한다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=NHRTCQBZokg)
- [Slides](https://docs.google.com/presentation/d/1n5nZU4n2uS-1gI_YRQorkhpzEy8_EapLI3juWfacbUA/edit)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_046.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_046.md`
