---
num: 48
title: Ultra Scale Playbook, 큰 시스템 앞에서 서두르지 않기
original: "Lecture 48: The Ultra Scale Playbook"
speaker: Nouamane Tazi
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: Medium
status: partial
---

:::crux
이 파일이 기대는 근거는 얇다. archive note에는 speaker, YouTube 링크, 그리고 caption fetch 실패만 남아 있고, transcript나 slide 텍스트는 없다. 다만 transcript stub의 `Other links`에는 `nanotron/ultrascale-playbook` 링크가 기록되어 있다. 그래서 여기서는 강의 내용을 복원하지 않고, **ultra-scale이라는 말을 들을 때 어떤 숫자와 경계를 먼저 적어야 하는가**를 읽기 안내로 남긴다.
:::

## 1. 지금 손에 있는 것

확실한 항목은 강의 제목, speaker 이름, YouTube URL, 그리고 public transcript/caption 수집이 실패했다는 사실이다. source bundle은 slides, code, papers, related repo folder를 찾지 못했다.

이 정도 자료로는 "강의가 어떤 playbook을 제시했다"라고 말할 수 없다. training playbook인지, serving playbook인지, cluster 운영 노하우인지도 아직 빈칸이다. reader 원고는 그 빈칸을 덮기보다 표시해야 한다.

## 2. playbook은 정답 목록이 아니라 절차일 수 있다

큰 GPU 시스템에서 문제는 한 층에만 머물지 않는다. kernel이 빨라도 data loader가 늦을 수 있고, GPU memory가 충분해 보여도 checkpoint I/O가 막을 수 있으며, single-node 성능이 좋아도 multi-node communication이 전체 속도를 잡을 수 있다.

그래서 `playbook`이라는 단어는 조심해서 읽을 가치가 있다. 좋은 playbook은 "항상 이 설정을 써라"가 아니라, 병목을 찾고, 조건을 적고, 작은 변경을 시험하고, 되돌릴 수 있게 만드는 순서에 가깝다. 원본을 볼 때는 speaker가 절차를 말하는지, 특정 stack을 말하는지 분리해서 적자.

:::figure ladder
label: Figure · ultra-scale 시스템을 훑는 층
- workload: model size, sequence length, batch, precision을 먼저 적는다
- kernels: GEMM, attention, normalization, fusion이 어디서 시간을 쓰는지 본다
- memory: HBM capacity, activation, KV/cache, optimizer state를 나눈다
- network: node 내부와 외부, collective, overlap 조건을 구분한다
- operations: checkpoint, queueing, failure, observability를 성능의 일부로 둔다
:::

## 3. 숫자는 단위와 조건으로만 읽힌다

ultra-scale 이야기에서 성능 숫자는 특히 쉽게 멋있어 보인다. 하지만 tokens/sec, samples/sec, latency percentile, GPU utilization, MFU, cost per token은 서로 다른 질문에 답한다.

원본 영상에 그래프가 나오면 값보다 먼저 분모를 적자. GPU 종류, GPU 수, interconnect, model, precision, sequence length, global batch size, warmup 여부가 빠지면 비교가 흔들린다. scale-out 결과라면 single-node baseline도 같이 필요하다.

## 4. 자료가 보강되면 채울 자리

강의가 training 중심이면 ZeRO류 sharding, activation checkpointing, pipeline bubble, all-reduce overlap 같은 항목이 들어올 수 있다. inference 중심이면 prefill/decode, batching, KV cache, SLO, admission control 쪽을 봐야 한다.

하지만 지금은 어느 쪽도 강의 내용으로 귀속하지 않는다. 제목과 관련 링크만으로는 범위를 고를 수 없다. 이 노트의 역할은 나중에 원본을 보며 "무엇이 실제로 언급되었고, 무엇은 독자의 배경지식이었나"를 가르는 것이다.

## 5. 작은 독서 준비

원본을 열기 전에 자신이 아는 training 또는 serving path를 한 장으로 그려 보자. 각 edge 옆에는 측정 가능한 지표를 붙인다. 예를 들어 all-reduce는 bandwidth와 overlap, attention은 TFLOP/s와 HBM traffic, queue는 p95/p99 latency처럼 둔다.

강의를 본 뒤에는 speaker가 실제로 다룬 층만 표시한다. 표시되지 않은 층은 "중요하지 않다"가 아니라 "이 강의에서는 아직 근거가 없다"로 남겨 둔다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=1E8GDR8QXKw)
- [Ultra-Scale Playbook link recorded in transcript stub](https://huggingface.co/spaces/nanotron/ultrascale-playbook)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_048.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_048.md`
