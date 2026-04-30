---
num: 31
title: Metal kernel을 CUDA 눈으로 읽기
original: "Lecture 31: Beginners Guide to Metal"
speaker: Nikita Shulga
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
Metal은 Apple GPU에서 compute shader를 쓰는 길이다. CUDA를 아는 사람에게 완전히 낯선 세계는 아니다. Metal shader는 CUDA kernel과 닮았고, command buffer는 CUDA stream과 비슷한 실행 통로로 볼 수 있다. 하지만 MPS, buffer, pipeline state, threadgroup memory, PyTorch extension으로 연결되는 방식은 Apple 생태계의 규칙을 따른다.
:::

## 1. Apple GPU는 그냥 옆에 있는 hardware가 아니다

Nikita Shulga는 자신의 laptop을 예로 든다. CPU peak와 GPU peak를 napkin math로 비교하면, laptop 안의 Apple GPU도 충분히 무시하기 어려운 compute를 갖고 있다. 문제는 CUDA capable GPU가 아니라는 점이다. NVIDIA 쪽 지식만으로는 이 compute를 직접 다루기 어렵다.

PyTorch에는 MPS backend가 있다. MPS는 Metal Performance Shaders이고, 결국 professionally written Metal kernel들의 묶음에 가깝다. 다만 모든 operator가 항상 준비되어 있지는 않다. 새 op가 필요하거나 backend coverage가 비어 있으면, 직접 Metal kernel을 알아야 한다. 이 강의는 그 첫 발판이다.

## 2. Metal의 큰 단어들

Metal shader는 GPU에서 실행되는 함수다. CUDA kernel과 역할이 비슷하다. Host side에서는 device, command queue, command buffer, encoder, pipeline state 같은 객체가 등장한다. 이름이 많아 겁이 나지만, 실행 흐름은 익숙하다. GPU가 실행할 code를 준비하고, buffer를 묶고, thread grid를 정하고, command buffer에 넣어 실행한다.

Nikita는 CUDA를 알면 Metal의 상당 부분을 이미 안다고 말한다. 맞는 말이다. Parallel index, memory hierarchy, threadgroup, synchronization 같은 질문은 GPU 언어마다 반복된다. 다른 점은 API의 ceremony와 Apple GPU/MPS/PyTorch가 만나는 접점이다.

:::figure flow
label: Figure · Metal compute dispatch의 기본 흐름
- shader source: Metal Shading Language로 GPU 함수를 작성
- pipeline state: shader를 compile해 실행 가능한 compute pipeline 준비
- buffers: input/output memory를 Metal buffer로 연결
- command buffer: 실행할 command를 기록하고 commit
- threadgroups: grid와 threadgroup size로 parallel work를 배치
:::

## 3. PyTorch에서 Metal kernel을 넣는 길

강의에는 PyTorch extension 관점도 나온다. Metal shader를 PyTorch operator처럼 쓰려면 ATen/MPS utility와 연결해야 한다. Nikita는 MPS operations utility 쪽의 Metal shader library class를 사용해 kernel source를 JIT compile하고 invocation framework를 쓰는 방향을 언급한다.

여기서 중요한 것은 “Metal을 따로 배우기”가 아니라 “PyTorch op의 missing piece를 Apple GPU에서 채우기”다. Input tensor가 MPS device에 있고, Metal buffer로 접근되며, command buffer에 dispatch되어 결과 tensor가 채워진다. CUDA extension을 쓸 때와 마찬가지로 framework boundary가 성능과 correctness의 큰 부분을 차지한다.

## 4. GEMM을 쓰면 진짜 공부가 시작된다

Vector add는 API를 익히기 좋지만, GPU를 이해하게 만드는 것은 GEMM이다. Lecture material에는 `gemm_perf_studies.mm`가 있다. GEMM은 global memory load, threadgroup memory reuse, register accumulation, tile shape가 모두 드러난다. CUDA에서 shared memory tiling을 배웠다면, Metal에서는 threadgroup memory로 비슷한 사고를 해볼 수 있다.

다만 Apple GPU의 execution unit, memory behavior, available matrix instructions는 NVIDIA와 같지 않다. CUDA의 block/thread 이름을 그대로 번역하면 절반만 맞다. 좋은 연습은 “CUDA의 무엇과 닮았나”와 “여기서는 무엇이 다르게 드러나나”를 분리해서 보는 것이다.

## 5. MPS와 custom Metal 사이

가능하면 MPS가 제공하는 빠른 kernel을 쓰는 것이 좋다. 이미 잘 최적화되어 있고, PyTorch와의 integration도 되어 있다. 하지만 MPS가 제공하지 않는 operator나 새 실험을 해야 한다면 custom Metal kernel이 필요하다. 이때 목표는 vendor library를 무조건 이기는 것이 아니라, 없는 path를 정확하게 채우는 것이다.

Custom kernel은 lifecycle과 synchronization도 신경 써야 한다. Command buffer를 언제 commit하고 wait할지, tensor memory가 언제 살아 있는지, CPU와 GPU가 같은 buffer를 언제 볼 수 있는지 명확해야 한다. GPU programming에서 “계산식은 맞는데 실행 순서가 틀림”은 꽤 흔한 고전이다.

## 6. 손으로 해볼 것

Lecture 031의 `gemm_perf_studies.mm`를 열고, host side setup과 shader code를 색으로 나누어보자. Device, pipeline, buffer, dispatch가 어디서 만들어지는지 표시하면 Metal API의 뼈대가 보인다.

그 다음 작은 elementwise op를 PyTorch MPS tensor에 연결하는 흐름을 따라가 보자. CUDA extension을 만든 경험이 있다면, CUDA stream, kernel launch, tensor pointer에 해당하는 Metal/MPS 쪽 단어를 짝지어 적어보면 좋다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=cGtiaJjLkAI)
- [Lecture 031 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_031)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_031/Beginner%27s%20guide%20to%20Metal%20kernels.pdf)
- [gemm_perf_studies.mm](https://github.com/gpu-mode/lectures/blob/main/lecture_031/gemm_perf_studies.mm)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_031.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_031.md`
