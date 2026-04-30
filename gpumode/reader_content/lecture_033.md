---
num: 33
title: BitBLAS, low-bit GEMM을 compiler 문제로 보기
original: "Lecture 33: Bitblas"
speaker: Wang Lei
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
BitBLAS는 mixed-precision, weight-only quantization, low-bit GEMM을 하나의 kernel library와 compiler 문제로 본다. 낮은 bit weight를 쓰면 memory traffic은 줄지만, dequantization, layout transform, Tensor Core-friendly packing이 새 병목이 된다. 핵심은 compute definition과 schedule을 분리하고, layout을 kernel들 사이로 전파해 불필요한 변환을 줄이는 것이다.
:::

## 1. Quantization의 목적이 바뀌었다

Wang Lei는 mixed precision computing의 배경에서 시작한다. 예전에는 lower precision이 hardware low precision instruction, 즉 Tensor Core 같은 unit을 더 잘 쓰기 위한 도구로 많이 이해되었다. 최근 LLM에서는 model이 너무 커져서 GPU memory에 올리는 것 자체가 문제가 되었다. Weight-only quantization은 memory를 줄이는 동시에, memory-bound inference에서 speed도 줄 수 있다.

하지만 낮은 bit weight를 쓰면 계산이 자동으로 쉬워지는 것은 아니다. Weight는 int4, int2처럼 packed되어 있고, activation은 보통 fp16/bf16일 수 있다. GEMM 전에 dequantize를 해야 하며, scale과 zero point도 고려해야 한다. 이 모든 것을 대충 처리하면 memory를 아낀 만큼 layout 변환과 unpacking에서 시간을 잃는다.

## 2. BitBLAS와 Ladder의 관점

BitBLAS는 kernel library이고, Ladder는 end-to-end compiler로 소개된다. 목표는 quantized model을 실제 hardware instruction에 맞는 fast kernel로 이어주는 것이다. TVM이나 Triton 같은 system이 compute와 schedule을 분리하는 것처럼, BitBLAS도 “무엇을 계산하는가”와 “어떤 layout과 tile로 실행하는가”를 나눠 생각한다.

강의에서 흥미로운 지점은 “Triton-like language”인 Tile Language(TL) 언급이다. Python DSL로 kernel을 쓰는 편의는 가져오되, low-bit GEMM에 필요한 layout와 schedule abstraction을 더 직접적으로 다루려는 시도다. Low-bit workload에서는 일반 matmul보다 layout이 더 앞에 나온다.

:::figure flow
label: Figure · BitBLAS가 보는 low-bit GEMM 경로
- quantized weight: int4/int2 weight와 scale metadata를 준비
- layout transform: Tensor Core가 좋아하는 packed layout으로 배치
- dequantize: global/shared/register 단계에서 필요한 형태로 복원
- MMA: mixed precision dot product를 hardware instruction에 맞춤
- epilogue: scale, bias, activation 등 후처리를 fusion할 수 있음
:::

## 3. Layout은 성능의 절반이다

NVIDIA Tensor Core는 peak throughput을 내려면 data가 특정 모양으로 들어오기를 기대한다. BitBLAS 강의에서 반복되는 주제는 data layout이다. Layout이 맞지 않으면 memory access가 나빠지거나, Tensor Core를 충분히 먹이지 못하거나, kernel 사이에 변환이 추가된다.

Layout transform을 별도 kernel로 자주 수행하면 memory traffic이 다시 커진다. 그래서 layout을 operator graph 위로 전파하는 생각이 나온다. Elementwise op나 memory-intensive 작은 op에서는 layout을 유지하고, compute-intensive op끼리는 fusion하거나 shared memory 안에서 data를 재사용한다. 좋은 compiler는 “이 layout을 지금 바꿔야 하나?”를 계속 묻는다.

## 4. Dequantization은 어디에서 할 것인가

Weight-only quantization에서는 matmul 중 weight를 dequantize해야 한다. 이때 global memory에서 unpack한 뒤 fp16 weight를 써버리면 memory 절약의 의미가 약해진다. 더 나은 방향은 packed weight를 읽고, shared memory나 register 가까운 곳에서 필요한 tile만 풀어 MMA에 넣는 것이다.

하지만 이것도 쉽지는 않다. Packed bit를 꺼내는 instruction, scale load, zero point 처리, tile shape가 모두 얽힌다. 작은 shape에서는 overhead가 크게 보이고, 큰 compute-bound GEMM에서는 dequantization이 상대적으로 묻힐 수 있다. 그래서 workload shape별 benchmark가 필요하다. Low-bit kernel은 “한 가지 빠른 kernel”로 끝나기 어렵다.

## 5. Correctness와 performance를 같이 잡기

BitBLAS 같은 system은 correctness도 까다롭다. Quantized path에서는 reference fp16/fp32 output과 bit-exact로 맞지 않는 경우가 자연스럽다. 그래서 tolerance와 error metric을 정하고, layer별 performance와 quality impact를 같이 봐야 한다.

강의의 compiler 관점은 여기서 도움이 된다. Compute definition은 reference semantics를 잡고, schedule은 performance를 바꾼다. 이 둘을 분리하면, optimization을 바꿀 때 “수학을 바꿨는지, 실행 방법만 바꿨는지”를 더 분명히 추적할 수 있다.

## 6. 손으로 해볼 것

작은 int4 weight-only linear layer를 만들어보자. Weight를 pack하고, scale을 group별로 저장한 뒤, matmul 안에서 dequantize하는 naive implementation을 작성한다. 그 다음 dequantized weight를 미리 풀어놓는 baseline과 memory traffic을 비교한다.

가능하면 BitBLAS tutorial이나 lecture repo를 열어 layout transform이 어디서 일어나는지 찾아보자. Kernel code보다 먼저 tensor가 어떤 physical layout으로 흐르는지 그려보면, low-bit GEMM이 왜 compiler problem인지 선명해진다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=iA49QqWwMcA)
- [Lecture 033 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_033)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_033/GPUMODE_TALK_20241026.pdf)
- [Wang Lei GitHub](https://github.com/LeiWang1999)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_033.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_033.md`
