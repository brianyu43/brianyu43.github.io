---
num: 34
title: Low Bit Triton Kernel의 현실
original: "Lecture 34: Low Bit Triton Kernels"
speaker: Hicham Badri
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
Low-bit Triton kernel의 질문은 단순히 “int4로 줄이면 빠른가?”가 아니다. Weight, activation, KV cache 중 무엇을 quantize하는지, linear quantization인지 nonlinear quantization인지, dequantize를 어디에서 하는지, 그리고 Triton이 그 layout을 잘 다룰 수 있는지가 중요하다. 낮은 bit는 memory를 줄이지만, packing과 contiguity가 새 숙제를 만든다.
:::

## 1. Quantization은 어디에 쓰는가

Hicham Badri는 quantization을 넓게 잡고 시작한다. Weight quantization은 큰 model을 더 적은 VRAM에 올리고, memory-bound inference를 빠르게 할 수 있다. Activation quantization은 많은 user를 serve하는 compute-bound 상황에서 Tensor Core path를 더 잘 쓰게 할 수 있다. KV cache quantization은 long prompt나 long context에서 memory를 줄이는 데 중요하다.

즉 “quantization”이라는 단어 하나로 여러 병목을 덮어버리면 안 된다. Weight가 병목인지, activation bandwidth가 병목인지, KV cache capacity가 병목인지에 따라 kernel 모양이 달라진다. 같은 int4라도 inference prefill, decode, fine-tuning에서 의미가 다르다.

:::figure memory
label: Figure · LLM에서 low-bit가 들어가는 위치
- weights: model size와 memory bandwidth를 줄이는 주된 대상
- activations: dynamic quantization과 low precision compute path가 중요
- KV cache: long context serving에서 capacity와 bandwidth를 줄임
- scales: quantized value를 복원하기 위한 metadata, 자주 숨은 비용이 됨
- packing: bit 단위 저장 방식, kernel layout과 직접 연결됨
:::

## 2. Linear quantization부터 붙잡자

강의는 linear quantization과 nonlinear quantization을 구분한다. Linear quantization은 scale과 zero point 또는 symmetric scale을 이용해 float value를 integer range로 mapping한다. Nonlinear quantization이나 vector quantization도 있지만, kernel 구현을 설명할 때는 linear quantization이 가장 손에 잡힌다.

핵심은 group이다. Tensor 전체에 scale 하나를 쓰면 단순하지만 정확도가 떨어질 수 있다. Group-wise quantization은 더 정확하지만, group별 scale을 읽고 적용해야 한다. Low-bit kernel에서 scale load는 생각보다 크게 보인다. Weight data는 4배 줄였는데 scale과 unpack이 발목을 잡는 장면이 흔하다.

## 3. Dequantize를 matmul과 붙이기

가장 naive한 방법은 quantized weight를 미리 dequantize해 fp16 weight를 만들고, 일반 matmul을 부르는 것이다. 쉽지만 memory 절약이 사라진다. 더 좋은 방법은 matmul kernel 안에서 packed weight를 읽고, 필요한 tile만 dequantize해 dot product에 넣는 것이다.

여기서 Triton이 매력적이다. Python 가까운 syntax로 custom matmul variant를 빠르게 실험할 수 있고, PyTorch와 integration도 좋다. Hicham은 Triton을 맹목적으로 배우기보다 CUDA concepts, warps, memory hierarchy를 같이 이해해야 한다고 말한다. Triton이 쉽다는 말은 GPU가 쉬워졌다는 말이 아니다. 단지 실험의 마찰이 줄었다는 말에 가깝다.

## 4. Packing, repacking, contiguity

Low-bit kernel은 data representation이 까다롭다. int4 weight 두 개를 byte 하나에 pack할 수 있고, int2는 더 복잡해진다. Hardware가 좋아하는 tile layout과 model checkpoint가 저장한 layout이 다르면 repack이 필요하다. Repack 비용은 한 번만 내면 괜찮을 수 있지만, hot path에 들어오면 곧바로 성능을 잡아먹는다.

강의에서 나오는 contiguity 문제도 중요하다. Transpose된 tensor는 logical shape이 맞아도 physical memory가 contiguous하지 않을 수 있다. `.contiguous()`를 호출하면 correctness는 쉬워지지만 copy 비용이 생긴다. Low-bit path에서는 packing까지 얽히므로, tensor stride와 packing layout을 kernel contract에 명확히 적어야 한다.

## 5. Triton의 장점과 한계

Triton은 빠른 iteration과 readability가 강점이다. TVM 기반 solution은 compiler build와 customization이 무겁고, CUDA는 개발 속도가 느릴 수 있다. Triton은 아이디어가 괜찮은지 빨리 볼 수 있다. PyTorch integration도 좋고, `torch.compile` ecosystem과 가까운 것도 장점이다.

하지만 performance ceiling이 항상 최고라는 뜻은 아니다. 특히 Tensor Core를 매우 세밀하게 먹이는 GEMM, TMA, architecture-specific path에서는 CUDA/CUTLASS 계열이 더 강할 수 있다. Low-bit Triton kernel은 “충분히 빠르고, 고치기 쉽고, 배포하기 쉬운” 지점을 노린다. 이 균형이 실제 library에서는 자주 이긴다.

## 6. 손으로 해볼 것

작은 linear layer에서 int4 weight-only path를 만들어보자. 먼저 dequantize 후 PyTorch matmul을 부르고, 다음에는 Triton kernel 안에서 dequantize하는 version을 만든다. 두 version의 memory allocation과 runtime을 비교하면 fusion의 의미가 보인다.

그 다음 일부러 transpose된 non-contiguous input을 넣어보자. Kernel이 stride를 제대로 처리하는지, `.contiguous()`를 호출해 성능이 얼마나 바뀌는지 확인한다. Low-bit kernel debugging은 bit packing보다 stride에서 먼저 미끄러지는 경우가 많다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=7c3c3bCGzKU)
- [Slides](https://docs.google.com/presentation/d/1R9B6RLOlAblyVVFPk9FtAq6MXR1ufj1NaT0bjjib7Vc/edit)
- [Lecture 34 README](https://github.com/gpu-mode/lectures#lecture-34-low-bit-triton-kernels)
- [Hicham Badri GitHub](https://github.com/mobicham)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_034.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_034.md`
