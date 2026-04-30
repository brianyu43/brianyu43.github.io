---
num: 70
title: PCCL, fault tolerant collective를 묻다
original: "Lecture 70: PCCL Fault tolerant collectives"
speaker: mike64t
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
transcript는 없고 slides link만 확인된다. 이 강의의 중심 질문은 **collective communication이 실패를 거의 예외로 두는 세계에서, GPU cluster의 실제 failure를 어떻게 견디게 만들 것인가**다. PCCL의 구체 API와 protocol은 slides 원문에서 확인해야 한다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 `mike64t`로 기록되어 있고, Google Slides link가 있다. code와 paper link는 없다. transcript가 없으므로 PCCL이 정확히 어떤 project 이름인지, 어떤 failure model을 가정하는지, 어떤 benchmark를 보여줬는지는 확인 필요다.

제목이 말하는 두 단어는 분명하다. collective와 fault tolerance다. all-reduce 같은 collective는 모든 rank가 정해진 순서로 참여해야 한다. 그런데 rank 하나가 느려지거나 죽거나 network path가 흔들리면, 전체 training job이 같이 멈출 수 있다.

## 2. collective는 실패에 약한 약속이다

collective는 "모두가 들어와야 끝나는" 연산이다. 그래서 성능이 좋고 semantics가 깔끔한 대신, partial failure에는 민감하다. 한 rank가 collective call에 도달하지 못하면 나머지는 기다린다. timeout과 retry를 붙일 수는 있지만, 그 순간 correctness와 progress의 정의가 어려워진다.

fault tolerant collective는 여기서 질문을 바꾼다. 실패를 드문 accident로 볼 것인가, 아니면 large-scale job에서 반드시 만나는 상태로 볼 것인가. 후자라면 collective library는 단순히 빠른 ring을 만드는 것을 넘어 membership, recovery, consistency까지 생각해야 한다.

:::figure flow
label: Figure · fault tolerant collective의 기본 고민
- normal ranks: 모든 rank가 같은 collective schedule에 참여한다
- failure: rank, process, device, link 중 하나가 진행을 멈춘다
- detection: timeout이나 heartbeat로 failure를 관찰한다
- recovery: 재시도, rank exclusion, checkpoint rollback 같은 선택지가 생긴다
- correctness: 어떤 tensor state가 유효한지 다시 정의한다
:::

## 3. LLM training에서 왜 중요한가

큰 training job은 GPU 수가 늘수록 failure surface도 넓어진다. 하루짜리 실험이라면 재시작으로 버틸 수 있지만, 긴 pretraining run에서는 한 번의 failure가 큰 비용이 된다. communication layer가 failure를 더 잘 다루면 checkpoint interval, wasted compute, operator intervention이 모두 달라진다.

하지만 fault tolerance는 공짜가 아니다. logging, redundancy, recovery protocol, extra synchronization이 latency와 bandwidth를 잡아먹을 수 있다. PCCL을 읽을 때는 "얼마나 견디는가"와 "정상 상태에서 얼마를 더 내는가"를 같이 봐야 한다.

## 4. 확인해야 할 세부 질문

첫째, failure model이다. process crash만 다루는지, GPU reset, network partition, silent data corruption까지 보는지 확인해야 한다. 둘째, recovery granularity다. collective 하나를 재시도하는지, communicator를 재구성하는지, training step을 rollback하는지에 따라 system design이 달라진다.

셋째, integration layer다. PCCL이 NCCL replacement인지 wrapper인지, PyTorch distributed와 어떻게 연결되는지, application code가 얼마나 바뀌는지 봐야 한다. fault tolerance는 library 안에서만 멋져도 실제 stack에 못 들어가면 오래 살기 어렵다.

## 5. 혼자 해볼 것

작은 all-reduce pseudo-code를 그리고 한 rank가 중간에 멈추는 경우를 손으로 추적해 보자. 나머지 rank가 어디에서 block되는지, timeout을 넣으면 tensor state가 어떻게 되는지 적어 보면 fault tolerant collective가 왜 어려운지 금방 드러난다.

원본 slides를 볼 때는 PCCL의 API 이름보다 failure scenario 그림을 먼저 찾자. 어떤 failure를 견디는지 알면, 성능 숫자도 비로소 읽힌다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=2KUyEdlVBsw)
- [Slides](https://docs.google.com/presentation/d/1MKB51lhNOsV-Y_hscSaJk7wZskzxft2pFJQZKyvcMyo/edit?usp=sharing)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_070.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_070.md`
