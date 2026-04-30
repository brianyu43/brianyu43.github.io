---
num: 1
title: 프로파일링부터 시작하자
original: Lecture 1 How to profile CUDA kernels in PyTorch
speaker: Mark Saroufim
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
CUDA를 배운다는 말은 처음부터 멋진 kernel을 쓰겠다는 뜻이 아니다. 이 강의의 핵심은 더 수수하다. PyTorch 안에서 작은 CUDA/Triton kernel을 불러오고, profiler로 어디서 시간이 새는지 확인하고, 그 다음에야 더 낮은 층으로 내려간다.
:::

## 1. 왜 첫 강의가 profiler인가

Mark가 잡은 독자는 "CUDA tutorial hell"에 지친 PyTorch 사용자다. CUDA 전문가가 어딘가 어두운 방에서 마법처럼 kernel을 짠다는 식의 이야기를 걷어내고, 필요한 순간에 필요한 만큼만 내려가는 흐름을 보여준다.

그래서 출발점은 `torch.square` 같은 작은 연산이다. 이미 PyTorch가 잘하는 일을 일부러 다시 구현해 본다. 목적은 PyTorch를 이기는 것이 아니라, custom kernel이 Python 프로그램 안으로 들어오고 profiler에서 어떻게 보이는지 손으로 확인하는 것이다.

흥미로운 점은 첫 예제가 빠르지 않아도 된다는 데 있다. 실제로 custom Triton 코드가 PyTorch보다 느릴 수 있다. 이 실패가 오히려 좋은 출발점이다. 느리다는 사실을 알았으면, 이제 "왜 느린가"를 물을 수 있다.

## 2. PyTorch 안으로 CUDA를 들여오기

강의의 실전 축은 PyTorch extension이다. CUDA는 보통 C/C++ 쪽에서 작성되지만, PyTorch는 `load_inline` 같은 경로를 통해 Python 코드에서 C++/CUDA 코드를 컴파일하고 불러올 수 있게 해 준다.

여기서 중요한 감각은 host와 device의 경계다. Python은 kernel을 호출하고 tensor pointer를 넘긴다. 실제 병렬 계산은 GPU 위에서 실행되는 `__global__` 함수가 한다. CUDA 코드 자체는 낯설어 보여도, 입출력 tensor를 받고 index를 계산해 한 element씩 처리한다는 구조는 단순하다.

`load_inline`은 학습용으로 특히 좋다. 컴파일 캐시나 배포 문제까지 한 번에 해결하려 들지 않고, "내 kernel이 PyTorch 프로그램에서 호출된다"는 첫 연결을 빨리 만든다.

:::figure ladder
label: Figure · 처음 내려가는 사다리
- stage: PyTorch 연산으로 baseline을 만든다.
- stage: 같은 일을 하는 CUDA extension을 붙인다.
- stage: Triton으로도 같은 연산을 써 본다.
- stage: profiler에서 CPU 호출, CUDA launch, kernel 실행을 분리해서 본다.
:::

## 3. profiler는 한 가지가 아니다

강의는 profiler를 계단처럼 다룬다. 먼저 autograd profiler로 큰 덩어리의 시간을 본다. 그 다음 PyTorch profiler로 Chrome trace를 열어 CPU activity와 CUDA activity가 어떻게 이어지는지 본다. trace의 화살표, 즉 flow event는 Python 쪽 호출이 어떤 CUDA launch로 연결되는지 보여준다.

이 단계에서 이미 많은 것을 알 수 있다. 어떤 kernel이 자주 호출되는지, CPU가 GPU에게 일을 던지는 시간이 보이는지, 실제 GPU kernel 시간이 지배적인지 확인할 수 있다. 성능 문제를 "GPU가 느림"이라고 뭉뚱그리지 않는 연습이다.

마지막에는 Nsight Compute, 즉 `ncu`로 내려간다. 여기서는 kernel grid, block size, achieved occupancy, memory coalescing, shared memory 관련 힌트가 나온다. 다만 `ncu`는 환경을 탄다. 클라우드 드라이버나 권한 문제로 profiling이 안 될 수 있으니, 도구가 실패하는 경우도 개발 경험의 일부로 받아들여야 한다.

## 4. Triton은 쉬운 길이지만 자동 승리는 아니다

Triton은 Python 안에서 GPU kernel을 쓰게 해 주는 DSL이다. CUDA C++보다 훨씬 짧게 쓸 수 있고, block 단위 프로그래밍 모델이 PyTorch 사용자에게 친절하게 다가온다.

하지만 Triton을 쓴다고 저절로 빨라지지는 않는다. block size, `num_warps`, memory access pattern이 맞지 않으면 PyTorch의 기존 kernel보다 느릴 수 있다. 강의에서 square 예제는 바로 이 점을 보여준다. 성능은 언어의 이름이 아니라 실행된 kernel의 모양에서 나온다.

Triton이 생성한 PTX를 들여다볼 수 있다는 점도 좋다. 고수의 영역처럼 보이는 compiler 산출물을 작게 열어 보면, global memory load/store나 register 사용 같은 단서가 보인다. 처음에는 다 읽지 못해도 괜찮다. "볼 수 있다"는 것 자체가 큰 진전이다.

## 5. 성능 힌트는 질문으로 읽자

profiler가 "occupancy가 낮다", "memory coalescing을 보라", "block size가 이상하다" 같은 신호를 줄 때, 그것을 바로 처방으로 받아들이면 위험하다. occupancy를 올렸다고 항상 빨라지는 것은 아니고, shared memory를 쓴다고 늘 이기는 것도 아니다.

그래도 좋은 질문 목록은 생긴다. launch overhead가 큰가? 같은 일을 너무 많은 kernel로 쪼갰는가? memory access가 연속적인가? PyTorch baseline은 어떤 kernel을 호출하는가? Triton이 알아서 해 주는 부분과 CUDA로 직접 관리해야 하는 부분은 어디인가?

:::tip
작은 실험으로 `torch.square`, CUDA extension, Triton implementation 세 가지를 같은 입력 크기에서 비교해 보자. timing만 보지 말고 PyTorch profiler trace에서 launch 개수와 kernel 이름을 같이 확인하면 훨씬 덜 막막하다.
:::

## 6. 이 강의에서 가져갈 태도

첫 강의의 결론은 "CUDA는 쉽다"가 아니다. 더 정확히는 "CUDA로 내려가는 첫 계단은 생각보다 낮다"에 가깝다. PyTorch에서 extension을 붙이고, Triton kernel을 작성하고, profiler로 보는 일은 충분히 손에 잡힌다.

반대로 최적화는 여전히 정직하다. 내 kernel이 왜 느린지 모르면 더 낮은 층으로 내려가야 한다. profiler, PTX, Nsight Compute는 겁주는 도구가 아니라 질문을 정교하게 만들어 주는 도구다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=LuhJEEJQgUM)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_001/CUDA%20MODE_%20Lecture%201.pdf)
- [Slides Google](https://docs.google.com/presentation/d/110dnMW94LX1ySWxu9La17AVUxjgSaQDLOotFC3BZZD4/edit?usp=sharing)
- [Code](https://github.com/gpu-mode/lectures/tree/main/lecture_001)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_001.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_001.md`
