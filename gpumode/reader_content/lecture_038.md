---
num: 38
title: ARM CPU에서 low-bit LLM을 돌리기
original: "Lecture 38: Low Bit ARM kernels"
speaker: Scott Roy
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
이 강의는 GPU 강의 목록 안에 있지만, 주인공은 ARM CPU다. Local LLM을 desktop과 mobile에서 돌리려면 Apple Silicon, phone, Grace Hopper/Blackwell 같은 ARM world를 무시할 수 없다. Low-bit linear와 embedding operator는 weight memory를 줄이고 vectorized CPU kernel로 GEMV를 빠르게 만드는 일이다.
:::

## 1. 왜 ARM CPU kernel인가

Scott Roy는 PyTorch/ExecuTorch 관점에서 low-bit ARM operator를 소개한다. ARM CPU는 mobile device와 Apple Mac에서 이미 널리 쓰이고, NVIDIA의 Grace Hopper, Grace Blackwell 같은 server-side system에서도 중요해지고 있다. Local LLM을 생각하면 GPU만큼 CPU path도 현실적인 target이다.

강의의 operator는 크게 두 종류다. 하나는 dynamic quantized activation과 low-bit weight를 갖는 linear operator이고, 다른 하나는 low-bit weight embedding operator다. Low-bit는 1bit부터 8bit까지를 다룬다. 이 operator들은 eager, `torch.compile`, AOT, ExecuTorch surface에서 쓰일 수 있도록 설계된다.

## 2. Affine quantization을 작게 잡기

Quantization은 float weight를 integer와 scale/zero point로 표현하는 일이다. 예를 들어 fp32 weight를 3bit integer 범위로 줄이면 memory footprint가 크게 감소한다. 하지만 계산할 때는 이 integer를 다시 float 의미로 해석해야 한다. 그래서 unpack과 dequantization이 kernel의 일부가 된다.

ARM CPU에서는 이 작업을 vector instruction과 cache behavior에 맞춰야 한다. GPU kernel처럼 수천 thread를 던지는 문제가 아니라, CPU threadpool과 SIMD vector lane을 잘 쓰는 문제다. 같은 “low-bit”라도 병목의 얼굴이 다르다.

:::figure flow
label: Figure · low-bit ARM linear operator의 층
- packed weights: 1-8bit weight를 compact하게 저장
- dynamic activation: activation은 runtime에 8bit 등으로 quantize
- tiling: output tile을 나누어 threadpool에서 병렬 처리
- ukernel: single-threaded vectorized microkernel이 tile을 계산
- unpack: bit-width별 routine으로 weight를 SIMD-friendly하게 복원
:::

## 3. Operator tiling과 microkernel tiling

강의에서 중요한 구분은 operator level tiling과 kernel 안쪽 tiling이다. Linear operator는 matrix를 output tile로 나누고, 각 tile을 threadpool이 병렬로 처리한다. 각 tile을 실제로 계산하는 lower-level kernel은 single-threaded지만 vectorized되어 ARM SIMD instruction을 사용한다.

Microkernel은 더 안쪽에서 register-level tiling을 한다. Scott은 regular C++ struct와 function으로 kernel config를 표현한다고 설명한다. CUDA처럼 별도 언어를 쓰는 것이 아니라, C++ 안에서 tile size, zero handling, bit-width별 unpack routine을 조합한다. GPU programming과 닮은 개념을 CPU vectorization 문법으로 푸는 셈이다.

## 4. Tile size는 완벽한 공식보다 workload에서 온다

Q&A에서는 cache size를 보고 tile size를 어떻게 정하느냐는 질문이 나온다. 답은 아주 이론적인 auto-tuning이 아니라, GEMV workload와 vectorization에 맞춘 practical choice에 가깝다. M dimension tile은 사실상 1에 가깝고, weight 쪽 tile은 vector lane과 unpack 효율을 고려한다.

강의에서는 ARM CPU용 GEMV kernel이 tile size와 zero 여부 등에 따라 여러 variant를 갖고, bit-width별 unpack routine도 따로 있다고 설명한다. Low-bit CPU kernel은 하나의 generic loop보다 여러 작은 specialist를 갖는 쪽이 유리하다. Code size와 performance 사이의 익숙한 tradeoff다.

## 5. PyTorch surface와 local inference

이 operator들은 torchchat과 ExecuTorch에서 사용할 수 있다고 소개된다. torchchat은 desktop에서 LLM을 locally run하는 PyTorch solution이고, ExecuTorch는 mobile/edge deployment 쪽과 연결된다. 즉 이 작업은 microbenchmark용 장난감이 아니라, 실제 user device에서 model을 돌리기 위한 path다.

Performance slide에서는 Llama 3.1 8B를 M1 Mac Pro에서 benchmark하는 장면이 언급된다. 정확한 숫자는 원자료에서 확인해야 하지만, 읽을 때 포인트는 분명하다. GPU가 없어도, 또는 GPU path가 충분치 않아도, low-bit CPU kernel은 local model experience를 좌우할 수 있다.

## 6. 손으로 해볼 것

작은 matrix-vector multiply를 잡고 weight를 4bit로 pack해보자. 가장 먼저 naive unpack 후 fp32/fp16 GEMV를 만들고, 그 다음 tile별로 unpack하면서 dot product를 하는 version을 만든다. Unpack을 hot loop 어디에 두는지가 곧 성능 질문이 된다.

Apple Silicon machine이 있다면 NEON/Accelerate baseline과 비교해보자. 없다면 C++ code만 읽어도 좋다. GPU Mode 강의 안에서 이 CPU lecture가 주는 교훈은 넓다. 좋은 kernel thinking은 hardware가 바뀌어도 tile, layout, vectorization이라는 비슷한 단어로 돌아온다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=2iNGuZxe1ms)
- [Lecture 038 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_038)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_038/lowbit_kernels.pdf)
- [Speaker GitHub](https://github.com/metascroy)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_038.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_038.md`
