---
num: 99
title: "Consumer device 위의 distributed ML"
original: "Lecture 99: Distributed ML on consumer devices"
speaker: Matt Beton
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: Low
status: partial
---

:::crux
이 노트는 transcript, slides, code가 없는 자료가 제한된 노트다. 제목에서 읽을 수 있는 질문은 **datacenter GPU가 아니라 소비자 기기들의 느슨한 집합 위에서 ML workload를 분산할 수 있는가**다. 실제 system design, security model, performance result는 원본 확인이 필요하다.
:::

## 1. 무엇을 알고 무엇을 모르는가

local notes에는 speaker가 Matt Beton으로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했고 slides/code/paper/repo folder는 없다. 그래서 이 강의가 federated learning, edge inference, volunteer compute, browser/device cluster 중 무엇을 중심으로 하는지 아직 알 수 없다.

consumer device라는 말은 GPU Mode 맥락에서 흥미롭다. data center에서는 hardware, network, driver, scheduler를 통제할 수 있다. 소비자 기기에서는 그 통제가 약해진다. 바로 그 불편함이 주제의 핵심일 가능성이 높다.

## 2. consumer device는 작고 많고 제멋대로다

소비자 기기는 성능이 균일하지 않다. laptop GPU, desktop GPU, phone NPU, integrated GPU, browser runtime이 섞일 수 있다. 전원 상태, 발열, background app, network가 계속 바뀐다.

distributed ML은 보통 동기화 비용과 straggler 문제를 안고 있다. consumer device에서는 이 문제가 더 커진다. 빠른 기기 몇 대가 느린 기기 하나를 기다리게 되면 전체 효율이 무너진다. 그래서 "분산"이라는 말은 늘 scheduling과 fault tolerance를 동반한다.

:::figure flow
label: Figure · 소비자 기기 분산 ML의 압력
- devices: 성능, memory, runtime이 서로 다른 기기들이 참여한다
- network: bandwidth와 latency가 안정적이지 않다
- scheduler: 작업을 작게 쪼개고 straggler를 피해야 한다
- privacy: data와 model parameter가 어디로 가는지 통제해야 한다
- aggregation: 결과를 모으되 실패와 지연을 견뎌야 한다
:::

## 3. 어떤 workload가 맞을까

모든 ML workload가 consumer device 분산에 맞지는 않는다. 큰 synchronous training은 network와 straggler에 약하다. 반면 embarrassingly parallel한 evaluation, data preprocessing, hyperparameter sweep 일부, small fine-tuning, federated averaging류 작업은 더 가능성이 있다.

inference도 경우에 따라 나뉜다. model을 여러 device에 shard하면 communication이 커지고, request latency가 불안해질 수 있다. 대신 각 device가 독립 request를 처리하는 식이면 scheduling이 단순해진다.

## 4. 보안과 신뢰는 성능 문제이기도 하다

consumer device를 쓰면 data privacy, model theft, malicious result, sandboxing 문제가 따라온다. 이건 별도 정책 문제가 아니라 system cost로 돌아온다. 암호화, verification, sandbox overhead가 latency와 throughput에 영향을 준다.

또한 device가 언제든 사라질 수 있다고 가정해야 한다. checkpointing, idempotent task, retry, partial aggregation 같은 설계가 필요하다. datacenter에서 당연하던 "노드가 한동안 살아 있다"는 믿음이 약해진다.

## 5. 원본에서 확인할 질문

강의가 training을 말하는지 inference를 말하는지 먼저 확인하자. 그다음 target device, runtime, network model, privacy assumption을 본다. 이 네 가지가 없으면 performance claim을 해석하기 어렵다.

benchmark가 있다면 평균 throughput보다 tail latency와 failure rate를 보자. consumer device system은 최고 성능보다 흔들림을 견디는 능력이 중요할 수 있다.

## 6. 혼자 해볼 것

두 대의 서로 다른 machine이나 하나의 machine 안의 서로 다른 process를 consumer device라고 가정하고 작은 distributed job을 만들어 보자. 일부 worker에 sleep을 넣어 straggler를 만들고, synchronous aggregation이 얼마나 흔들리는지 본다.

그다음 작업 단위를 더 작게 쪼개거나 timeout/retry를 넣어 본다. distributed ML은 algorithm만큼 운영 조건을 먹고 산다는 사실이 손에 잡힌다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=sV0PJC1dOmM)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_099.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_099.md`
