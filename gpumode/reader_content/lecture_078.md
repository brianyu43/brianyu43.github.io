---
num: 78
title: Iris, Triton 안에서 multi-GPU를 일급 시민으로
original: "Lecture 78 Iris: Multi-GPU Programming in Triton"
speaker: Muhammad Awad, Muhammad Osama & Brandon Potter
part: 6
part_label: Part VI · DSL·정확성·새 커널 모델
priority: High
status: partial
---

:::crux
transcript는 없지만 Iris slide PDF가 있다. 이 강의의 핵심 질문은 **Triton의 programmability를 유지하면서 multi-GPU communication을 kernel 가까이에서 표현할 수 있는가**다. slide는 Iris를 Triton 기반 RMA framework로 소개하고, SHMEM-like API와 PyTorch/Triton-like 사용감을 강조한다.
:::

## 1. 지금 확인된 자료

local notes에는 speakers가 Muhammad Awad, Muhammad Osama, Brandon Potter로 기록되어 있고, GitHub lecture folder와 Iris PDF가 있다. slide에는 `Github.com/ROCm/iris`가 보이며, RDMA support는 work in progress라고 적혀 있다. transcript와 code link는 notes에는 없다.

slide의 첫 메시지는 분명하다. multi-GPU programming을 Triton에서 first-class citizen으로 만들고 싶다는 것이다. familiar PyTorch/Triton-like API, host/device abstraction, SHMEM-like remote memory access가 핵심 단어로 보인다.

## 2. 기존 방식의 불편함

slide는 contemporary approach를 CPU가 communication을 시작하고, host-device synchronization과 bulk-synchronous phase가 생기는 방식으로 그린다. GPU kernel 사이에 RCCL 같은 communication kernel이 들어가고, stream synchronization 때문에 remote communication이 일찍 시작되지 못할 수 있다는 문제의식을 보여 준다.

Iris가 겨냥하는 자리는 이 control path다. communication을 host가 큰 덩어리로 지시하는 대신, GPU 쪽 computation 흐름 가까이에서 remote memory operation과 synchronization을 표현하려는 방향이다.

:::figure flow
label: Figure · Iris가 바꾸려는 control path
- conventional: CPU가 kernel launch와 collective call을 순서대로 enqueue한다
- sync gap: stream/channel synchronization이 communication 시작을 늦출 수 있다
- iris kernel: Triton style code 안에서 remote load/store/signal을 표현한다
- overlap: fine-grained GEMM과 communication을 더 가깝게 겹칠 여지가 생긴다
- scale-up: node 안 multi-GPU path를 우선 목표로 본다
:::

## 3. API를 볼 때의 질문

slide는 Iris가 Triton, PyTorch, Pythonic API를 강조한다고 말한다. 좋은 API라면 programmer가 device rank, symmetric heap, remote pointer, signal/wait 같은 개념을 너무 낯설지 않게 다룰 수 있어야 한다. 동시에 communication ordering을 숨기기만 하면 correctness bug가 생길 수 있다.

따라서 Iris를 읽을 때는 예제 code의 짧음보다 semantics를 먼저 보자. remote write가 언제 보이는지, synchronization primitive가 어떤 guarantee를 주는지, deadlock을 어떻게 피하는지, memory allocation이 모든 GPU에서 어떻게 맞춰지는지 확인해야 한다.

## 4. 성능에서 조심할 점

fine-grained communication은 잘 맞으면 computation overlap을 만든다. 하지만 너무 잘게 쪼개면 latency와 synchronization overhead가 커진다. collective library가 bulk transfer에서 잘하는 일을 Iris-style RMA가 항상 이기는 것은 아니다.

벤치마크를 볼 때는 message size, GPU topology, PCIe/NVLink/Infinity Fabric 경로, scale-up과 scale-out의 차이를 구분해야 한다. slide가 RDMA를 WIP로 표시했다면 node 밖 통신에 대한 결론은 특히 조심해서 읽어야 한다.

## 5. 혼자 해볼 것

두 GPU에서 block GEMM을 한다고 상상하고, 한 GPU의 tile이 다른 GPU의 partial result를 언제 필요로 하는지 diagram으로 그려 보자. conventional collective phase와 Iris-style fine-grained remote access를 나란히 그리면 어떤 경우에 overlap이 생길 수 있는지 보인다.

원본 slide를 볼 때는 Iris가 Triton에 추가하는 primitive를 표로 만들자. allocation, remote access, synchronization, locking, example kernel을 분리해 적으면 "multi-GPU programming made easier"가 실제로 무엇을 쉽게 만드는지 확인할 수 있다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=i6Y2EelEC04)
- [Slides folder](https://github.com/gpu-mode/lectures/tree/main/lecture_078)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_078/Awad-Osama-Potter%20-%20Iris%20Multi-GPU%20Programming%20Made%20Easier%20%28GPU%20Mode%29%20%281%29.pdf)
- [GPU Mode lectures index](https://github.com/gpu-mode/lectures#lecture-78-iris-multi-gpu-programming-in-triton)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_078.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_078.md`
