---
num: 56
title: Kernel Benchmarking Tales, 숫자 뒤의 습관
original: "Lecture 56: Kernel Benchmarking Tales"
speaker: Georgii Evtushenko
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: partial
---

:::crux
transcript와 slides가 없어 Georgii Evtushenko가 들려준 실제 benchmarking 이야기는 확인되지 않았다. 그래도 제목과 notes가 말하는 중심은 kernel과 benchmarking이다. 핵심 질문은 **kernel이 빠른지 느린지 말하기 전에, 우리가 정말 같은 일을 같은 조건에서 재고 있는가**다.
:::

## 1. kernel benchmark는 작은 거짓말을 잘 만든다

kernel benchmark는 짧고 숫자가 선명해서 믿기 쉽다. 하지만 warmup을 빼먹거나, synchronization을 안 하거나, tensor shape를 편한 것만 고르거나, memory allocation을 같이 재면 숫자는 쉽게 흔들린다. GPU는 비동기 실행이라 wall-clock timing 하나로는 특히 조심해야 한다.

local archive에는 이 강의의 transcript가 없으므로 구체 사례는 만들지 않는다. 대신 benchmarking tale을 읽을 때 필요한 질문을 남긴다. 무엇을 재는가, 어디서 synchronize하는가, baseline은 무엇인가, cache와 allocator 상태는 어떻게 통제하는가.

## 2. 올바른 측정은 kernel 밖에서 시작한다

좋은 benchmark는 kernel code만 보지 않는다. input tensor 생성, host-to-device transfer, allocation, stream, synchronization, warmup, repeat count를 모두 통제한다. kernel launch overhead를 포함할지 뺄지도 명확해야 한다.

PyTorch와 비교할 때도 같은 연산인지 확인해야 한다. broadcasting, dtype promotion, layout conversion, contiguous call이 숨어 있으면 baseline이 다른 일을 하고 있을 수 있다. "내 kernel이 빠르다" 전에 "둘이 같은 일을 한다"가 먼저다.

:::figure ladder
label: Figure · kernel benchmark 체크리스트
- correctness: baseline과 bitwise 또는 tolerance 기준으로 맞는가
- warmup: JIT, cache, clock ramp-up을 지나 steady state인가
- sync: GPU 비동기 실행을 정확히 막고 재는가
- sweep: shape, dtype, stride, alignment를 여러 조건으로 보는가
- profiler: wall time을 counter와 trace로 설명하는가
:::

## 3. 평균 하나로는 부족하다

kernel timing은 평균만 보면 놓치는 것이 많다. p50, p95, variance, outlier를 같이 봐야 한다. 특히 짧은 kernel은 launch overhead와 scheduler noise가 커서 작은 차이를 과장하기 쉽다.

또 benchmark는 shape 하나로 끝나지 않는다. block size가 잘 맞는 shape에서는 빨라도, ragged shape나 non-contiguous input에서는 느릴 수 있다. production workload에 가까운 shape distribution을 따로 모아 두면 benchmark가 훨씬 덜 장식적이 된다.

## 4. profiler가 숫자에 이유를 붙인다

time만으로는 병목을 알 수 없다. memory bandwidth가 한계인지, occupancy가 낮은지, register pressure가 큰지, instruction mix가 나쁜지, uncoalesced access가 있는지는 profiler counter를 봐야 한다.

Nsight Compute나 PyTorch profiler 같은 도구는 benchmark의 뒷면을 보여 준다. 단, profiler도 overhead와 sampling/collection 조건이 있으므로 timing 숫자와 profiler run을 구분해서 해석하는 것이 좋다.

## 5. 손으로 해볼 것

elementwise add kernel을 하나 직접 만들고 PyTorch baseline과 비교해 보자. 첫 번째 버전은 일부러 synchronization을 빼고 재고, 두 번째 버전은 CUDA event나 명시적 sync를 넣어 잰다. 숫자가 어떻게 달라지는지 보는 것만으로도 benchmarking 감각이 확 달라진다.

그 다음 shape를 크게, 작게, non-contiguous하게 바꿔 본다. 빠른 kernel을 만드는 일만큼이나, 빠르다고 말할 수 있는 조건을 쓰는 일이 중요하다는 걸 몸으로 알게 된다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=CtrqBmYtSEk)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_056.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_056.md`
