---
num: 27
title: WebGPU로 로컬 GPU를 작게 열기
original: "Lecture 27: gpu.cpp - Portable GPU compute using WebGPU"
speaker: Austin Huang
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
gpu.cpp의 질문은 “CUDA가 아닌 곳에서도 GPU compute를 연구자 손에 가깝게 둘 수 있을까?”다. WebGPU는 Vulkan, DirectX, Metal 위에 놓인 공통 GPU API이고, gpu.cpp는 그 API의 긴 setup을 작게 접어 C++ 코드에서 WGSL kernel, GPU buffer, dispatch를 다루게 한다. 성능의 끝을 당장 찍겠다는 도구라기보다, heterogenous local device에서 실험을 시작하게 해주는 얇은 문이다.
:::

## 1. 왜 local GPU인가

Austin Huang은 강의를 H100 cluster가 아니라 laptop, phone, workstation에서 시작한다. MacBook Pro 한 대는 작아 보이지만, 매년 팔리는 수를 생각하면 세상에 깔린 local GPU compute는 무시하기 어렵다. Pixel 같은 phone도 high-end 쪽부터 점점 더 많은 GPU 연산 능력을 갖고, AR, robotics, real-time multimodal model처럼 latency와 privacy가 중요한 use case가 생긴다.

문제는 이 compute가 균질하지 않다는 점이다. NVIDIA CUDA만 생각하면 편하지만, 개인 장치 세계에는 Apple GPU, AMD, Intel, mobile GPU가 섞여 있다. 그래서 보통은 PyTorch, game engine, inference runtime 같은 큰 framework를 통해 간접적으로 GPU를 쓴다. 흔한 작업에는 괜찮지만, 낯선 algorithm을 작게 실험하려면 “runtime에 PR을 내야 하나?” 같은 이상한 벽을 만난다.

## 2. WebGPU와 gpu.cpp의 자리

WebGPU는 browser 전용 장난감이 아니라 GPU resource를 요청하고, buffer를 만들고, shader를 dispatch하는 API specification이다. native 쪽에서는 Dawn 같은 구현을 통해 Vulkan, DirectX, Metal backend로 내려갈 수 있다. Austin의 설명대로 “Vulkan이나 DirectX나 Metal을 돌릴 수 있으면 WebGPU도 기대해볼 수 있다”는 식의 mental model이 유용하다.

하지만 raw WebGPU도 작지 않다. 강의에서는 작은 activation kernel 하나를 launch하는 데도 WebGPU direct API는 수백 줄 setup이 필요하다고 보여준다. Vulkan은 더 길다. gpu.cpp는 여기서 compute workload에 필요한 부분만 잡는다. device code, resource allocation, hot-path dispatch. 이 세 가지만 작게 감싸면, 거대한 engine을 만들지 않고도 C++ project 안에서 GPU kernel을 날릴 수 있다.

:::figure flow
label: Figure · gpu.cpp가 접어 주는 WebGPU compute 경로
- device code: WGSL로 GPU에서 실행할 compute shader를 쓴다
- context: GPU device와 queue를 다루는 handle을 얻는다
- tensor: GPU memory allocation을 flat buffer처럼 잡는다
- kernel: WGSL program과 buffer binding을 묶는다
- dispatch: workgroup 수를 정해 asynchronous하게 실행한다
:::

## 3. CUDA와 닮았지만 CUDA는 아니다

WGSL(WebGPU Shading Language)은 gpu.cpp가 만든 문법이 아니다. WebGPU standard의 일부다. CUDA kernel처럼 thread id를 보고 index를 계산하며, `workgroup_size`는 CUDA block size와 비슷한 감각으로 읽을 수 있다. 그래서 CUDA를 아는 사람은 squint하면 대충 읽힌다. 다만 memory model, binding, syntax는 WebGPU 쪽의 규칙을 따른다.

Host side도 CUDA 예제와 일부 닮아 있다. context를 만들고, input/output buffer를 만들고, kernel과 buffer를 bind하고, workgroup 수를 지정해 dispatch한다. 끝나면 wait하고 host로 copy한다. 이 유사성이 중요하다. 완전히 새로운 사고를 강요하기보다, CUDA에서 익힌 “device code와 host orchestration을 나눈다”는 감각을 portable API 위로 옮긴다.

## 4. 작은 library가 중요한 이유

gpu.cpp의 core implementation은 강의에서 약 천 줄 정도로 소개된다. 이 크기는 단지 귀엽다는 뜻이 아니다. compile iteration이 짧고, project에 넣었을 때 빌드가 과하게 무거워지지 않는다는 뜻이다. Dawn 자체를 매번 빌드하면 몇 분이 걸릴 수 있지만, shared library로 연결하면 사용자가 컴파일하는 것은 자기 C++ snippet에 가깝다.

Austin이 보여준 demo도 이 철학과 잘 맞는다. simulation loop에서 kernel을 반복 dispatch하거나, Shadertoy처럼 `x, y, time`의 함수로 animation을 만들고, 실행 중에 다른 compute kernel로 바꿔 끼운다. GPU buffer state가 유지되기 때문에 kernel이 바뀌어도 animation transition이 자연스럽게 이어진다. “GPU compute를 app 내부의 live material로 다룬다”는 느낌이 있다.

## 5. matmul 최적화가 portability의 시험지다

강의 후반의 matmul 이야기는 gpu.cpp가 단순 wrapper인지 아닌지를 보는 시험이다. 유명한 CUDA matmul worklog처럼 naive kernel에서 시작해 shared memory tiling 같은 최적화를 더해 본다. 목표는 WebGPU/WGSL에서도 CUDA에서 배운 병목 감각, 즉 memory reuse, coalescing, tile shape 같은 것들을 표현할 수 있는지 확인하는 것이다.

물론 portable API가 vendor library를 항상 이긴다는 뜻은 아니다. Tensor Core 같은 특정 hardware feature를 얼마나 직접 쓸 수 있는지, WebGPU standard가 어떤 기능을 언제 받아들이는지는 별개의 문제다. 다만 local GPU 연구의 첫 장애물이 “800줄 setup”이면 아무도 재미있게 실험하지 못한다. gpu.cpp는 그 첫 장애물을 낮춘다.

## 6. 손으로 해볼 것

gpu.cpp repository의 vector add나 작은 activation example을 읽고, 같은 코드를 CUDA vector add와 나란히 놓아보자. `workgroup_size`, global id, buffer binding, dispatch count가 각각 CUDA의 어떤 개념과 닮았는지 표로 쓰면 빠르게 감이 온다.

그 다음 작은 matmul을 naive하게 작성하고, tile을 도입해 읽기/쓰기 횟수를 줄여 본다. 최고 성능보다 중요한 것은 같은 algorithm을 CUDA와 WebGPU에서 어떻게 다르게 표현해야 하는지 보는 것이다. portability는 추상 명사가 아니라, index 계산과 buffer binding에서 매번 드러난다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=Ll5Sr1L5LvA)
- [Slides](https://gpucpp-presentation.answer.ai/)
- [Code: gpu.cpp](https://github.com/AnswerDotAI/gpu.cpp)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_027.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_027.md`
