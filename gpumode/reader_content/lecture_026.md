---
num: 26
title: SYCL로 Intel GPU를 만지기
original: "Lecture 26: SYCL Mode (Intel GPU)"
speaker: Patric Zhao
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
SYCL은 CUDA 문법을 Intel GPU에 그대로 옮긴 것이 아니다. queue, device selector, buffer/USM, command group, `parallel_for`, event dependency로 heterogeneous device를 다루는 C++ programming model이다. 핵심은 **memory와 dependency를 runtime에게 어떻게 설명하고, kernel 안의 parallelism을 어떻게 표현하느냐**다.
:::

## 1. CUDA Mode가 SYCL Mode로 잠깐 바뀐 날

Patric Zhao의 강의는 Intel GPU와 SYCL programming을 소개한다. 강의 초반의 메시지는 분명하다. 인터넷에는 NVIDIA GPU를 low-level로 다루는 자료가 많지만, non-NVIDIA GPU programming 자료는 상대적으로 적다. 그래서 이 강의는 portability와 vendor diversity 측면에서 가치가 있다.

SYCL은 Khronos 계열의 C++ 기반 heterogeneous programming model이다. CPU, GPU, FPGA 같은 device를 대상으로 할 수 있고, Intel oneAPI/DPC++ 생태계에서 많이 쓰인다. CUDA가 NVIDIA GPU에 강하게 묶여 있다면, SYCL은 더 넓은 device abstraction을 목표로 한다. 물론 abstraction이 넓다고 performance detail이 사라지지는 않는다.

## 2. device, queue, command

SYCL 프로그램은 먼저 device를 고른다. CPU selector, GPU selector처럼 어떤 device에서 실행할지 선택하고, 그 device에 대응하는 queue를 만든다. queue는 device로 보낼 command의 통로다. kernel launch와 memory copy도 queue에 submit된다.

이 구조는 CUDA stream과 닮은 부분이 있지만 용어와 추상화가 다르다. queue 하나 안에서는 dependency가 순서대로 추적될 수 있고, 여러 queue를 쓰면 developer가 event dependency를 더 명시적으로 관리해야 한다. Patric은 SYCL graph도 언급한다. 여러 memory copy와 kernel 사이 dependency를 graph로 잡아 runtime이 실행하게 하는 방향이다.

:::figure flow
label: Figure · SYCL 실행의 기본 흐름
- select device: CPU/GPU/FPGA 중 실행 장치를 고른다
- create queue: device에 work를 보낼 통로를 만든다
- manage memory: buffer 또는 USM으로 host/device data 이동을 표현
- submit kernel: command group 안에서 parallel_for 실행
- wait/event: 필요한 dependency와 synchronization을 처리
:::

## 3. memory model: buffer와 USM

Heterogeneous programming의 첫 문제는 memory다. CPU와 discrete GPU는 보통 독립 memory space를 가진다. data를 GPU에서 쓰려면 옮겨야 하고, 다시 CPU에서 읽으려면 되돌려야 한다. SYCL은 buffer/accessor 방식과 USM(Unified Shared Memory) 방식으로 이 문제를 다룬다.

Buffer 방식은 runtime에게 data access pattern을 더 많이 알려준다. 어떤 kernel이 어떤 buffer를 읽고 쓰는지 알 수 있으므로 dependency를 자동으로 잡기 쉽다. USM은 pointer 기반이라 CUDA에 익숙한 사람에게 편하지만, 명시적 copy와 lifetime 관리 책임이 더 직접적으로 온다. 편한 방식과 runtime이 최적화하기 쉬운 방식이 항상 같지는 않다.

## 4. 첫 kernel: parallel_for

SYCL kernel은 보통 `queue.submit` 안의 command group에서 `parallel_for`로 작성한다. `range`는 전체 work item 수를 정하고, `item`은 global index 같은 정보를 제공한다. 더 세밀하게는 `nd_range`를 써서 global range와 local range를 함께 지정한다. CUDA의 grid/block과 비슷한 감각을 만들 수 있다.

여기서도 질문은 같다. 어떤 부분을 parallel하게 만들 것인가? 모든 코드를 GPU에 올리는 것은 의미가 없다. computation-intensive하고 data parallel한 hot spot을 골라야 한다. CPU에서 잘하는 control-heavy 작업과 GPU에서 잘하는 throughput 작업을 나누는 눈이 필요하다.

## 5. Intel GPU architecture와 local memory

강의 후반은 Intel GPU architecture와 memory mode, shared local memory를 다룬다. NVIDIA의 shared memory처럼, Intel 쪽에서도 local memory를 잘 쓰면 global memory traffic을 줄이고 data reuse를 늘릴 수 있다. FlashAttention 같은 fused kernel에서도 결국 HBM에서 한 번 읽은 tile을 local/shared memory에 두고 재사용하는 사고가 반복된다.

Patric은 memory transfer time과 compute time을 분리해서 보는 관점도 보여준다. 어떤 경우에는 kernel compute보다 host-device transfer가 지배적이다. 이때는 dtype을 줄이거나, transfer와 compute를 overlap하거나, data를 device에 오래 머물게 하는 전략이 필요하다. vendor가 달라도 병목의 얼굴은 비슷하다.

## 6. 손으로 해볼 것

SYCL hello-world vector add를 읽고 CUDA vector add와 대응시켜보자. `queue`는 무엇에 해당하는가, `parallel_for`의 index는 CUDA의 무엇과 비슷한가, buffer/accessor가 memory dependency를 어떻게 표현하는가를 표로 적어보면 좋다.

그 다음 같은 vector add를 buffer 방식과 USM 방식으로 비교한다. 코드가 어느 쪽이 더 직접적인지, dependency 표현은 어느 쪽이 더 명시적인지 본다. SYCL을 배울 때는 syntax보다 execution model을 먼저 잡는 편이 덜 헷갈린다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=7HqbuMBUV7A)
- [Slides](https://docs.google.com/presentation/d/1SW4XKomAJhhJSH5-jpZI9Qlwp7TEunbV/edit?usp=sharing&ouid=106222972308395582904&rtpof=true&sd=true)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_026.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_026.md`
