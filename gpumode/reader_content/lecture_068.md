---
num: 68
title: GPU 중심 communication, 지형도를 그리기 전에
original: "Lecture 68: Landscape of GPU Centric communication"
speaker: Didem Unat
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: Low
status: partial
---

:::crux
이 강의의 archive record는 speaker가 Didem Unat이라는 점과 YouTube 링크를 알려 준다. caption fetch는 실패했고, slide/code/repo 근거는 없다. 따라서 특정 통신 라이브러리나 논문 흐름을 강의 내용으로 단정하지 않는다. 여기서 붙잡을 질문은 **GPU가 계산만 하는 장치가 아니라 data movement와 synchronization의 더 가까운 주체가 될 때, programmer가 무엇을 새로 구분해야 하는가**다.
:::

## 1. 지형도라는 제목의 함정

`Landscape`라는 말은 넓은 survey를 기대하게 만든다. 하지만 실제 강의가 어떤 기술을 포함했는지는 아직 모른다. NCCL, MPI, NVSHMEM, UCX, GPUDirect, runtime system 중 무엇이 중심이었는지 source bundle은 말해 주지 않는다.

그래서 이 글은 "이 기술들이 강의에 나왔다"가 아니라 "이런 분류축으로 들으면 좋다"에 머문다. 통신 주제는 이름이 비슷하고 층이 겹쳐서, 출처 없는 나열이 가장 쉽게 생긴다.

## 2. GPU-centric을 두 단계로 나눠 듣기

첫 단계는 data path다. GPU buffer가 host memory를 거치지 않고 다른 GPU나 network 쪽과 더 직접 연결되는지 묻는다. 이 질문은 bandwidth, copy overhead, topology와 이어진다.

두 번째는 control path다. 통신을 CPU가 시작하고 기다리는지, GPU execution 가까이에서 시작하거나 진행을 표현할 수 있는지 묻는다. 두 질문은 관련 있지만 같지 않다. data path가 GPU-aware여도 control은 host API 중심일 수 있다.

:::figure ladder
label: Figure · communication을 분류하는 축
- data path: host staging이 있는지, GPU buffer가 직접 쓰이는지 본다
- control path: CPU call 중심인지, GPU-side progress가 있는지 나눈다
- operation: collective, point-to-point, one-sided를 구분한다
- topology: NVLink, PCIe, InfiniBand, node boundary를 함께 적는다
- overlap: communication과 computation이 실제로 겹치는지 측정한다
:::

## 3. communication 병목은 한 문장이 아니다

"통신이 느리다"는 말은 너무 크다. 작은 message의 latency가 문제일 수 있고, 큰 tensor의 bandwidth가 문제일 수 있다. synchronization 때문에 GPU가 쉬는 것일 수도 있고, topology와 collective algorithm이 맞지 않는 것일 수도 있다.

GPU-centric communication을 읽을 때는 그래서 symptom을 쪼개야 한다. profiler timeline에서 gap이 보이는가, network counter가 찼는가, collective가 serialized되었는가, kernel과 transfer가 겹쳤는가. 강의가 어떤 증상을 사례로 삼는지 원본에서 확인한다.

## 4. ML systems와 이어지는 자리

대규모 training이나 distributed model system에서는 all-reduce, all-gather, reduce-scatter, send/recv가 model path 안으로 들어온다. 통신은 더 이상 training loop 바깥의 부록이 아니라 layer latency와 memory pressure를 바꾸는 요인이다.

다만 이 강의가 특정 model family를 중심으로 삼았다는 근거는 현재 없다. GPU Mode 독자는 자신의 배경지식으로 연결해 보되, 강의 본문에 있었던 예제와 독자의 응용을 따로 표시해야 한다.

## 5. 읽으면서 만들 표

원본 영상을 볼 수 있다면 등장한 API나 runtime 이름을 행으로 둔다. 열은 data path, control path, operation type, synchronization model, topology assumption, example workload로 둔다.

표를 채우다 보면 "GPU-centric"이 단일 기능명이 아니라 여러 선택의 묶음이라는 점이 드러난다. 이 강의가 그 중 어디까지를 landscape로 잡았는지가 나중에 rich 원고의 중심이 된다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=beuOWBbiJfQ)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_068.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_068.md`
