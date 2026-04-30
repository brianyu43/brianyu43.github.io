---
num: 39
title: TorchTitan을 책처럼 읽기
original: "Lecture 39: Torchtitan"
speaker: Mark Saroufim and Tianyu Liu
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: rich
---

:::crux
TorchTitan은 거대한 framework라기보다 PyTorch distributed large-scale training을 읽고 베낄 수 있게 만든 reference repo다. 약 5천 줄의 핵심 Python code 안에 device mesh, data parallel, tensor parallel, FSDP, activation checkpointing, compile, distributed checkpointing이 들어 있다. 핵심 질문은 “model code를 덜 침범하면서 parallelism을 어떻게 조합할 것인가?”다.
:::

## 1. 큰 training을 작게 읽기

2024년 마지막 GPU Mode 강의는 TorchTitan codebase walk-through에 가깝다. Mark Saroufim은 TorchTitan을 100개 이상 GPU scale의 training을 쉽게 시도할 수 있는 repository로 소개한다. 핵심 code는 대략 5천 줄의 Python이고, config 등을 포함해도 매우 작다. 그래서 한두 시간 안에 repo를 책처럼 읽는 것이 가능하다는 점이 강의의 분위기다.

Tianyu Liu는 performance 문서보다 더 큰 scale의 3D parallelism experiment도 paper에 있다고 보충한다. 정확한 최신 숫자는 repo/paper에서 확인해야 하지만, 이 강의에서 중요한 것은 scale record가 아니다. PyTorch distributed primitive를 어떻게 composable하게 엮는지 보는 것이다.

## 2. Copy-paste하라는 reference architecture

TorchTitan의 철학은 “너무 숨기지 않는다”에 가깝다. Mark는 강의 중 code가 적고 copy-paste해서 자기 project에 맞게 고치기를 원한다고 말한다. Megatron이나 DeepSpeed처럼 자체 core function을 깊게 갖는 방식과 다르게, TorchTitan은 PyTorch에 있는 기능을 드러내어 조합하는 쪽을 택한다.

이 접근은 교육적으로 좋다. Single GPU 작업에 익숙한 사람도 `train.py`에서 config, data loader, model build, parallelize, optimizer, checkpointing 흐름을 따라갈 수 있다. Distributed training을 처음 볼 때 제일 무서운 것은 수식보다 repo가 너무 커서 입구를 못 찾는 일이다. TorchTitan은 입구를 작게 만든다.

:::figure flow
label: Figure · TorchTitan training script를 읽는 순서
- config: model, parallelism, checkpoint, compile 옵션을 읽는다
- data: DP rank별로 다른 data, non-DP rank에는 같은 data를 준다
- model: Llama 계열 model을 먼저 평범하게 만든다
- parallelize: TP, FSDP, loss parallel 등을 model 위에 적용한다
- train loop: forward, backward, optimizer, checkpoint를 반복한다
:::

## 3. Data loader도 distributed object다

강의에서 조용히 중요한 부분은 data loading이다. Data parallel rank마다 다른 data를 받아야 하지만, tensor parallel이나 pipeline parallel처럼 같은 sample을 함께 처리하는 non-DP rank들은 같은 data를 봐야 한다. 그래서 DP degree와 DP rank가 data loader에 들어간다.

또 하나는 checkpointable data loader다. 거대한 token dataset을 한 번만 훑는 상황에서는 mid-epoch resumption이 중요하다. Training을 중간에 멈췄다가 checkpoint에서 재개할 때 dataset 처음으로 돌아가면 안 된다. Distributed training의 correctness는 model weight뿐 아니라 data iterator state에도 걸려 있다.

## 4. Model은 평범하게 만들고 parallelism을 얹기

TorchTitan은 model definition 자체를 최대한 distributed-aware하게 만들지 않으려 한다. 먼저 Llama 3.1 같은 transformer model을 평범하게 build하고, 그 위에 parallelism strategy를 적용한다. Tianyu는 이것이 Megatron류와 다른 점이라고 설명한다. Model을 침범하지 않고 parallelism을 조합하려는 방향이다.

물론 완전히 무침습적일 수는 없다. Tensor parallelism은 QKV projection, MLP, output head 같은 layer에 sharding과 communication hook을 넣어야 한다. Loss parallel은 vocabulary dimension이 큰 cross entropy를 sharded computation으로 처리한다. FSDP는 parameter/gradient/optimizer state shard를 관리한다. 중요한 것은 이 조합의 순서와 boundary를 code에서 볼 수 있다는 점이다.

## 5. Communication overlap과 activation checkpointing

TorchTitan은 async tensor parallel 같은 기능도 다룬다. 기본 tensor parallel communication은 blocking일 수 있다. Matrix를 여러 조각으로 나누고 일부 multiplication을 먼저 수행하면 communication과 computation을 동시에 진행할 수 있다. PyTorch의 symmetric memory 같은 기능이 이 방향과 연결된다.

Activation checkpointing도 중요한 memory-speed tradeoff다. 모든 activation을 저장하면 memory가 커지고, 모두 recompute하면 time이 커진다. TorchTitan은 full checkpointing과 selective checkpointing mode를 제공한다. Operator-based selective checkpointing은 offline benchmark와 경험에 기반한 list를 사용한다고 설명된다. 여기에도 정답 하나는 없다. 저장할 것과 다시 계산할 것을 workload에 맞게 고르는 일이다.

## 6. Distributed checkpoint와 손으로 해볼 것

Large training에서 checkpointing은 `torch.save` 한 번으로 끝나지 않는다. TorchTitan은 PyTorch Distributed Checkpoint(DCP)를 사용한다. 여러 GPU가 model shard를 나누어 저장하고, async mode로 CPU-to-disk stage를 overlap할 수 있다. GPU-to-CPU staging과 disk write를 어떻게 겹칠지에 따라 training interruption이 달라진다.

강의에서는 zero-overhead checkpointing 논의도 언급된다. Optimizer step 직후 저장할 state를 CPU로 옮기면서 다음 forward를 진행하고, backward가 시작되기 전에 copy가 끝나도록 맞추는 식이다. 아직 fault tolerance까지 모두 해결한 것은 아니지만, checkpoint가 training loop의 성능 feature라는 점은 분명하다.

TorchTitan repo에서 `train.py`를 열고, config parsing부터 model build, parallelize call, checkpoint call까지 한 화면짜리 call graph를 그려보자. Distributed training을 배울 때는 처음부터 NCCL 내부를 파기보다 “어느 시점에 어떤 parallelism이 적용되는가”를 잡는 편이 낫다.

작은 2-GPU 환경이 있다면 data loader가 DP rank별로 다른 sample을 주는지 확인한다. GPU가 없다면 code를 읽으며 TP, FSDP, activation checkpointing, compile이 적용되는 순서를 적어보자. TorchTitan은 실행하지 못해도 꽤 좋은 교과서다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=VYWRjcUqW6w)
- [TorchTitan repository](https://github.com/pytorch/torchtitan)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_039.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_039.md`
