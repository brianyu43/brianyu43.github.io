---
num: 7
title: quantization은 dtype 하나가 아니다
original: Lecture 7 Advanced Quantization
speaker: Charles Hernandez
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
"int4 quantization"이라고 말하면 너무 많은 것이 생략된다. weight만 줄이는지, activation도 줄이는지, accumulation은 어떤 dtype인지, dequantize를 언제 하는지에 따라 kernel과 성능이 완전히 달라진다.
:::

## 1. quantization은 왜 GPU kernel 문제가 되는가

GPT Fast나 SAM Fast 같은 사례에서 quantization은 중요한 속도/메모리 도구로 등장한다. 하지만 model weight를 4-bit로 저장한다고 끝나는 일이 아니다. 실제 inference에서 그 압축된 값을 어떻게 읽고, 풀고, 곱하고, 누적할지가 GPU kernel의 문제로 바뀐다.

Charles는 CUDA와 Triton의 경계에서 quantization을 다룬 경험을 공유한다. 예전에는 GPU에서 쓸 만한 quantized kernel이 부족했고, 필요한 모델과 format이 기존 라이브러리와 딱 맞지 않는 경우가 많았다.

여기서 "직접 kernel을 쓴다"는 요구가 나온다. quantization algorithm은 논문 이름으로 끝나지 않고, memory layout과 dequantization 위치와 Tensor Core 사용 가능성으로 내려온다.

## 2. dynamic, static, weight-only

dynamic quantization은 activation을 실행 중에 관찰해 scale을 정하고 낮은 bit 표현으로 바꾸는 방식이다. compute-bound 상황에서는 도움이 될 수 있고, PyTorch와 `torch.compile`만으로도 꽤 많은 부분을 처리할 수 있다.

weight-only quantization은 activation은 그대로 두고 weight만 낮은 bit로 저장한다. 이 경우 선택지가 갈린다. weight를 먼저 dequantize해서 일반 matmul을 할 수도 있고, low-bit weight를 읽으며 mixed dtype 곱셈을 시도할 수도 있다.

그래서 "int4"라는 말은 모호하다. W4A16인지, accumulation은 FP32인지, scale은 per-channel인지 per-group인지, zero point가 있는지 없는지까지 말해야 kernel의 일을 알 수 있다.

:::figure flow
label: Figure · weight-only quantization의 실행 경로
- stage: compressed weight와 scale/metadata를 memory에서 읽는다.
- stage: 필요한 위치에서 weight를 dequantize하거나 mixed dtype 계산을 준비한다.
- stage: activation과 곱하고 더한다.
- stage: output dtype과 accumulation policy에 맞게 결과를 쓴다.
:::

## 3. Triton의 장점과 마법성

Triton은 quantized kernel 실험에 매력적이다. CUDA C++보다 짧고, Python 생태계와 가깝고, block 단위로 memory access와 program id를 표현할 수 있다.

강의에서도 Triton kernel이 손으로 쓴 CUDA/CUTLASS 계열 kernel에 꽤 가까운 성능을 내는 사례가 언급된다. 특히 빠르게 실험하고 PyTorch로 붙이는 데 강하다.

하지만 이 편리함은 때로 마법처럼 느껴진다. 왜 빨라졌는지, 왜 느려졌는지 알기 위해서는 결국 generated code, memory access, block size, register pressure를 봐야 한다. Triton은 생각을 없애 주는 도구가 아니라 반복 속도를 높여 주는 도구다.

## 4. block size와 layout이 발목을 잡는다

low-bit weight는 packed format으로 저장된다. int4 두 개가 byte 하나에 들어갈 수 있고, scale과 metadata도 같이 움직인다. 이때 thread들이 연속적인 memory를 잘 읽는지, unpack 비용이 어디서 발생하는지, block size가 Tensor Core나 cache에 맞는지가 중요하다.

강의에는 block size가 성능을 제한할 수 있다는 관찰이 나온다. 같은 quantization 방식이어도 tile shape와 grouping이 다르면 memory coalescing과 reuse가 달라진다.

또한 quantization은 layer마다 민감도가 다르다. 모든 layer를 같은 bit로 밀어붙이면 정확도나 성능에서 손해를 볼 수 있다. kernel 개발과 model 품질 실험이 서로 떨어져 있지 않다.

## 5. 정확도와 성능을 같이 봐야 한다

quantization은 성능 최적화이면서 numerical approximation이다. 빠른 kernel이 나와도 model 품질이 무너지면 쓸 수 없다. 반대로 정확도는 괜찮지만 dequantization overhead 때문에 느리면 역시 곤란하다.

그래서 실험은 최소 세 값을 같이 봐야 한다. memory 사용량, latency/throughput, 정확도 지표다. 여기에 kernel 관점의 profiler 지표, 예를 들어 memory bandwidth와 occupancy를 붙이면 원인이 더 잘 보인다.

:::aside
quantization 용어를 쓸 때는 가능한 한 명시적으로 쓰자. 예를 들어 "W4A16, FP32 accumulation, group-wise scale"처럼 쓰면 독자와 kernel 작성자가 같은 그림을 볼 가능성이 훨씬 높다.
:::

## 6. 따라 해볼 읽기 순서

먼저 PyTorch로 dynamic quantization 또는 weight-only quantization의 reference를 만든다. 그 다음 같은 연산을 Triton으로 구현하고, dequantize를 kernel 밖에서 할 때와 안에서 할 때를 비교한다.

마지막으로 generated PTX나 profiler를 보며 packed load, unpack, multiply-accumulate 중 어디가 병목인지 찾는다. "4-bit니까 4배 빠르겠지"라는 생각은 잠시 접어 두는 편이 안전하다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=1u9xUK3G4VM)
- [Slides](https://www.dropbox.com/scl/fi/hzfx1l267m8gwyhcjvfk4/Quantization-Cuda-vs-Triton.pdf?rlkey=s4j64ivi2kpp2l0uq8xjdwbab&dl=0)
- [Code / speaker GitHub](https://github.com/HDCharles)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_007.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_007.md`
