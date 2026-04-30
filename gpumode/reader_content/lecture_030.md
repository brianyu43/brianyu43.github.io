---
num: 30
title: Quantized Training은 inference보다 까다롭다
original: "Lecture 30: Quantized Training"
speaker: Thien Tran
part: 3
part_label: Part III · 커널 프레임워크와 이식성
priority: High
status: rich
---

:::crux
Quantization을 training에 넣으면 weight만 줄이는 inference 이야기로 끝나지 않는다. Forward, backward, gradient, optimizer state, activation, distributed communication이 모두 memory와 precision의 대상이 된다. 이 강의의 중심 질문은 “무엇을 낮은 bit로 저장하고, 언제 fp32/bf16으로 되돌리며, 그 중간값을 global memory에 쓰지 않을 수 있는가?”다.
:::

## 1. Training에는 저장할 것이 너무 많다

Thien Tran은 post-training quantization을 짧게 복습한 뒤 바로 training으로 넘어간다. Inference에서는 보통 weight-only quantization이나 activation quantization을 생각한다. Weight를 int4/int8로 저장하고 matmul 안에서 dequantize하거나, activation scale을 dynamic하게 계산해 더 낮은 precision Tensor Core를 쓰는 식이다.

Training은 더 복잡하다. Forward pass에서는 backward를 위해 activation을 저장하고, backward에서는 gradient가 생기며, optimizer step에는 Adam 같은 optimizer state가 필요하다. Adam은 parameter에 비례해 두 개의 state를 갖기 때문에, model parameter보다 optimizer state가 더 큰 부담이 되기도 한다. Memory profile을 보면 activation이 쌓이고 사라지는 모양, gradient가 생겼다가 optimizer step 뒤 줄어드는 모양이 보인다.

:::figure memory
label: Figure · training memory에서 quantization을 넣을 수 있는 곳
- parameters: model weight 자체를 낮은 bit로 저장하거나 계산 직전에 dequantize
- activations: backward에 필요한 중간값을 저장할지 recompute할지 결정
- gradients: optimizer와 fuse하면 gradient buffer를 오래 들고 있지 않을 수 있음
- optimizer state: Adam moments 같은 큰 state를 8bit/4bit로 압축
- communication: distributed training에서 주고받는 tensor precision도 후보
:::

## 2. 목표는 memory와 speed, 둘 다다

Quantized training의 첫 목표는 memory footprint를 줄이는 것이다. Activation, model parameters, optimizer state가 모두 후보가 된다. 특히 optimizer state quantization은 이해하기 쉽다. Adam state가 parameter의 두 배 크기라면, 여기를 8bit나 4bit로 줄이는 것만으로도 큰 memory 절약이 가능하다.

두 번째 목표는 speed다. 낮은 precision Tensor Core, 예를 들어 int8이나 FP8 경로를 사용할 수 있으면 throughput이 오른다. 하지만 speed는 공짜가 아니다. Scale 계산, quantize/dequantize, rounding, reduction이 추가된다. 이 overhead가 줄어든 memory traffic보다 커지면, bit를 낮췄는데 wall time은 별로 좋아지지 않는 상황이 생긴다.

## 3. Low-bit optimizer kernel의 핵심

Optimizer kernel을 생각해보자. 일반적으로 parameter, gradient, optimizer state를 읽고, Adam이나 SGD update를 계산한 뒤 parameter와 state를 다시 쓴다. Low-bit optimizer에서는 저장된 state를 dequantize하고 update를 계산한 뒤 다시 quantize해야 한다.

강의에서 중요한 포인트는 dequantized optimizer state를 global memory에 쓰지 않는 것이다. 낮은 bit로 저장한 state를 읽어 kernel 안에서 fp32 같은 계산 형태로 풀고, update를 한 뒤 다시 낮은 bit로 압축해 저장한다. 중간의 큰 fp32 state가 global memory에 나타나지 않아야 memory 절약이 살아 있다. 가능하면 shared memory 안에서 scale 계산과 quantization을 처리한다.

## 4. Group size와 scale은 사소한 knob이 아니다

Quantization에는 scale이 필요하다. Tensor-wise scaling은 단순하지만 range가 큰 tensor에서 error가 커질 수 있다. Row-wise나 block-wise scaling은 품질을 개선할 수 있지만, scale을 계산하기 위한 reduction과 metadata가 필요하다. Group size가 커지면 scale 수는 줄지만 quantization error가 커질 수 있고, group size가 작아지면 scale 계산과 저장 비용이 올라간다.

Optimizer state에서는 이 tradeoff가 더 예민하다. Update가 반복되기 때문에 작은 numerical bias가 누적될 수 있다. Stochastic rounding 같은 기법이 등장하는 이유도 여기에 있다. 이 강의는 algorithm paper를 깊게 파기보다, 구현자가 kernel 안에서 어떤 state를 어느 precision으로 들고 있어야 하는지 보여주는 데 초점을 둔다.

## 5. Tensor Core를 쓰려면 data가 그 모양이어야 한다

낮은 precision은 성능상 매력적이지만, hardware가 좋아하는 layout과 dtype으로 들어가야 한다. int8, FP8 Tensor Core를 쓰려면 matmul input이 올바른 packing, alignment, scale 처리와 맞아야 한다. “dtype을 바꿨으니 빠르겠지”는 GPU 앞에서 자주 깨지는 순진한 기대다.

Triton이나 CUTLASS를 사용할 때도 마찬가지다. Quantized path는 memory bandwidth를 줄이는 대신 dequantization과 scale load가 생긴다. Compute-bound인지 memory-bound인지 먼저 봐야 한다. Weight를 더 작게 만들어도 kernel이 scale 처리에 묶이면 이득은 줄어든다.

## 6. 손으로 해볼 것

작은 Adam optimizer를 PyTorch로 작성하고, optimizer state를 fp32에서 int8 block-wise 저장으로 바꿔보자. 처음에는 빠른 kernel보다 state size, scale 계산, dequantize-update-quantize 순서를 정확히 적는 것이 좋다.

그 다음 tiny model training을 몇 step만 돌려 loss curve와 parameter difference를 비교한다. Quantized training은 “한 step의 max error”만 봐서는 부족하다. 반복되는 update에서 error가 어떤 방향으로 쌓이는지 봐야 한다. 아주 작은 실험이어도 이 감각은 꽤 오래 간다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=Br07GsnnvWc)
- [Lecture 030 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_030)
- [Slides PDF](https://github.com/gpu-mode/lectures/blob/main/lecture_030/%5BGPU-MODE%5D%20Quantized%20training%20%2820241006%29.pdf)
- [Notebook](https://github.com/gpu-mode/lectures/blob/main/lecture_030/%5BGPU_MODE%5D_Quantized_training.ipynb)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_030.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_030.md`
