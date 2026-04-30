---
num: 17
title: NCCL과 all-reduce의 자리
original: "Lecture 17: NCCL"
speaker: Dan Johnson
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
분산 학습에서 NCCL은 “통신 library”라는 말보다 더 구체적으로 이해해야 한다. backward pass 중 layer별 gradient가 준비되는 순간, PyTorch DDP는 bucket 단위로 all-reduce를 걸어 compute와 communication을 겹친다. 핵심 질문은 이것이다. **언제 어떤 gradient가 준비되고, 어느 stream에서 어떤 collective가 시작되는가?**
:::

## 1. collective는 여러 GPU의 약속이다

NCCL은 여러 GPU 사이의 point-to-point와 collective communication을 다루는 NVIDIA library다. collective는 참여한 rank들이 같은 종류의 통신에 함께 들어오는 약속이다. all-gather는 각 rank의 조각을 모두에게 모아주고, broadcast는 한 rank의 값을 모두에게 보낸다. scatter는 반대로 rank별로 다른 조각을 나눠준다.

딥러닝에서 가장 중요한 예는 all-reduce다. 각 GPU가 자기 mini-batch로 gradient를 계산한 뒤, 모든 rank의 gradient를 reduce하고 결과를 다시 모든 rank가 갖는다. 보통 평균 gradient를 얻기 위해 sum 후 rank 수로 나눈다. 이렇게 해야 각 GPU의 model parameter가 같은 방향으로 update된다.

## 2. DDP는 all-reduce를 숨기지만 없애지는 않는다

PyTorch `DistributedDataParallel`을 쓰면 Python 코드에는 all-reduce가 직접 보이지 않는다. forward, loss, backward, optimizer step만 있는 것처럼 보인다. 하지만 profiler를 보면 backward 중간중간 NCCL all-reduce kernel이 나타난다.

이 숨김은 좋은 추상화지만, 성능을 볼 때는 투명해져야 한다. DDP는 autograd hook을 이용해 gradient가 준비되는 순간 bucket 단위 all-reduce를 시작한다. 모든 backward 계산이 끝난 뒤 한 번에 통신하는 것보다, 앞쪽 layer의 gradient를 먼저 보내는 편이 compute와 communication을 겹칠 수 있다.

:::figure flow
label: Figure · DDP backward와 all-reduce overlap
- backward start: 마지막 layer부터 gradient 계산
- bucket ready: 특정 parameter 묶음의 gradient가 준비됨
- NCCL all-reduce: 별도 stream에서 평균 gradient 통신
- more backward: GPU는 다음 layer gradient를 계속 계산
- optimizer: 모든 bucket이 끝나면 같은 update 적용
:::

## 3. rank, communicator, stream

NCCL API를 보면 communicator가 등장한다. communicator는 어떤 rank들이 함께 통신하는지, 각 rank가 누구인지, 어떤 장치를 쓰는지에 대한 문맥이다. 분산 코드를 읽을 때 rank는 “프로세스 번호” 정도로 시작해도 되지만, 실제로는 device, process group, communicator가 함께 움직인다.

stream도 중요하다. communication이 compute와 겹치려면 all-reduce가 compute stream을 막지 않아야 한다. 물론 dependency는 지켜야 한다. gradient가 계산되기 전에 all-reduce를 시작할 수는 없다. 그래서 이벤트와 stream dependency가 들어간다. 성능은 결국 “겹칠 수 있는 것은 겹치고, 기다려야 하는 것은 정확히 기다리는” 쪽으로 간다.

## 4. toy DDP로 보는 평균 gradient

Dan Johnson은 toy model로 DDP의 작동을 설명한다. rank 0과 rank 1이 서로 다른 input을 가지고 forward를 하고, 각자 local gradient를 계산한다. 그 다음 all-reduce를 통해 두 gradient의 평균을 각 rank가 받는다. 이후 optimizer step을 하면 두 model replica는 계속 같은 parameter를 유지한다.

이 예제의 장점은 DDP를 신비한 framework magic에서 끌어내린다는 것이다. 결국 일어나는 일은 “각 rank가 계산한 숫자를 모아 같은 숫자로 맞춘다”다. 큰 모델과 많은 GPU에서도 원리는 같다. 다만 bucket, overlap, topology, algorithm 선택이 성능을 좌우한다.

## 5. profiler에서 NCCL을 찾는 법

Nsight Systems나 PyTorch profiler를 열면 compute kernel 사이에 NCCL 관련 kernel과 memcpy/communication activity가 보인다. 여기서 볼 것은 all-reduce가 backward와 겹치는지, 긴 communication tail이 남는지, 특정 bucket이 너무 늦게 준비되는지다.

통신은 공짜가 아니다. 빠른 GEMM을 아무리 잘 써도 all-reduce가 step 끝에 길게 남으면 throughput이 막힌다. 반대로 통신이 잘 overlap되면 같은 network 비용도 덜 아프게 느껴진다. 분산 학습 성능은 kernel과 network의 합이 아니라, timeline 위 배치의 문제다.

## 6. 손으로 해볼 것

2 GPU가 있다면 작은 linear model을 DDP로 돌리고 profiler trace를 저장한다. 코드에는 all-reduce가 없는데 trace에는 NCCL call이 나타나는 지점을 찾는다. 그 다음 bucket size를 바꾸거나 model layer 수를 바꿔 overlap 모양이 어떻게 달라지는지 본다.

GPU가 하나뿐이라면 개념 실험만 해도 좋다. 두 rank의 gradient vector를 손으로 두 개 만들고 all-reduce sum/average 결과를 계산해본다. DDP는 이 작은 산술을 거대한 model parameter 전체에 반복해서 적용하는 장치다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=T22e3fgit-A)
- [Lecture 017 repo folder](https://github.com/gpu-mode/lectures/tree/main/lecture_017)
- [Slides](https://github.com/gpu-mode/lectures/blob/main/lecture_017/slides.pdf)
- [ddp_example.py](https://github.com/gpu-mode/lectures/blob/main/lecture_017/ddp_example.py)
- [ddp_simple.py](https://github.com/gpu-mode/lectures/blob/main/lecture_017/ddp_simple.py)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_017.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_017.md`
