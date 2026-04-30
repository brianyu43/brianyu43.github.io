---
num: 64
title: Multi-GPU programming, 여러 GPU를 하나처럼 쓰지 않기
original: "Lecture 64: Multi-GPU programming"
speaker: Markus Hrywniak
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
Markus Hrywniak가 어떤 API, library, 예제를 썼는지는 이 자료만으로는 알 수 없다. 그래서 이 장은 특정 framework 설명이 아니라, **multi-GPU programming을 읽을 때 꼭 분리해야 할 네 가지 질문**으로 간다. computation, communication, memory ownership, synchronization을 따로 보지 않으면 GPU 수가 늘어도 생각은 오히려 흐려진다.
:::

## 1. GPU가 두 개면 자동으로 두 배가 되지 않는다

single GPU에서 빠른 code가 multi-GPU에서 그대로 빠른 것은 아니다. data를 나누고, 결과를 모으고, GPU 사이 communication을 맞추고, host와 device의 역할을 정해야 한다. 이 과정에서 synchronization 하나가 전체 throughput을 잡아먹을 수 있다.

local archive에는 구체 자료가 없으므로 CUDA-aware MPI, NCCL, peer-to-peer, unified memory, multi-process 중 무엇을 다뤘는지는 확인 필요다. 이 노트는 multi-GPU 강의를 읽을 때의 기본 질문을 정리한다.

## 2. 먼저 분할 방식을 정해야 한다

multi-GPU programming의 첫 질문은 "무엇을 나눌 것인가"다. data parallelism은 batch를 나누고 gradient나 결과를 합친다. tensor parallelism은 model의 matrix 연산 자체를 나눈다. pipeline parallelism은 layer나 stage를 나눈다. inference에서는 prefill/decode 역할을 나눌 수도 있다.

분할 방식에 따라 communication pattern이 달라진다. all-reduce, all-gather, reduce-scatter, point-to-point send/recv가 어디에 놓이는지 봐야 한다. computation이 빨라도 communication이 critical path에 있으면 scaling은 금방 꺾인다.

:::figure flow
label: Figure · multi-GPU 성능을 보는 기본 경로
- partition: data, tensor, layer, request 중 무엇을 나누는가
- compute: 각 GPU가 독립적으로 처리하는 work를 만든다
- communicate: 필요한 activation, gradient, KV, output을 옮긴다
- overlap: communication과 compute를 겹칠 수 있는지 본다
- synchronize: 어디서 모두가 기다리는지 확인한다
:::

## 3. topology는 코드 밖에 있지만 성능 안에 있다

GPU 사이 연결은 중요하다. 같은 machine 안에서도 NVLink, PCIe, switch topology에 따라 bandwidth와 latency가 다르다. node를 넘어가면 network가 더 큰 변수가 된다. multi-GPU code는 hardware topology를 모르면 반쯤 눈을 감고 쓰는 셈이다.

원본 강의를 볼 때는 실험 machine 구성을 꼭 적어야 한다. GPU model, GPU 수, interconnect, driver/library version, process layout이 benchmark 해석에 필요하다. "8 GPU"라는 말만으로는 아무것도 충분하지 않다.

## 4. overlap은 좋지만 복잡하다

communication을 compute와 겹치면 scaling을 개선할 수 있다. 하지만 overlap은 stream, event, dependency, buffer lifetime을 제대로 다뤄야 한다. 잘못하면 race condition이나 숨은 synchronization이 생긴다.

또 overlap이 항상 가능한 것은 아니다. 다음 계산이 communication 결과를 바로 필요로 하면 기다릴 수밖에 없다. 따라서 algorithm 구조에서 overlap 가능한 구간을 찾는 일이 먼저다. profiler trace는 여기서 매우 유용하다.

## 5. 손으로 해볼 것

두 GPU가 있다고 가정하고 큰 matrix multiply 결과를 row-wise로 나눠 계산하는 toy plan을 그려 보자. input이 어디에 복사되어야 하는지, 각 GPU가 어떤 output row를 만들지, 마지막 결과를 어디서 합칠지 적는다.

그 다음 tensor parallel matmul처럼 K dimension을 나누는 경우를 생각해 보자. 이번에는 partial sum을 어떻게 합칠지 필요하다. 두 그림의 communication이 다르다는 점이 multi-GPU programming의 첫 문턱이다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=BgeFR4UfajQ)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_064.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_064.md`
