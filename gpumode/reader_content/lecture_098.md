---
num: 98
title: "GPU Observability, 빠른지보다 먼저 보이는지"
original: "Lecture 98: GPU Observability"
speaker: "Yusheng (郑昱笙) Zheng"
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: Medium
status: partial
---

:::crux
이 노트는 transcript, slides, code가 없는 자료가 제한된 노트다. 제목에서 분명한 질문은 **GPU workload가 production에서 느려지거나 흔들릴 때, 무엇을 관찰해야 원인을 좁힐 수 있느냐**다. 강의가 다룬 구체 tool, metric, case study는 원본 확인이 필요하다.
:::

## 1. 확인된 자료

local notes에는 speaker가 Yusheng Zheng으로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했고 slides/code/paper/repo folder는 없다. 따라서 특정 observability platform이나 library를 소개하는 강의인지, 일반 원칙을 다루는 강의인지는 아직 모른다.

그래도 GPU observability라는 주제는 Part VII의 시스템 실전과 잘 맞는다. kernel 하나를 최적화하는 것과, 여러 사용자가 공유하는 GPU fleet에서 문제를 알아차리는 것은 다른 기술이다.

## 2. profiling과 observability의 차이

profiling은 보통 개발자가 짧은 시간 동안 깊게 들여다보는 일이다. Nsight Compute로 kernel counter를 보고, Nsight Systems로 timeline을 본다. 이건 현미경에 가깝다.

observability는 운영 중인 시스템이 계속 보내는 신호로 문제를 찾는 일이다. GPU utilization, memory usage, ECC error, throttling, queue length, request latency, tokens/sec, kernel failure, driver reset 같은 신호가 시간축 위에 쌓인다. 현미경만 들고 datacenter를 돌아다닐 수는 없다.

:::figure ladder
label: Figure · GPU 문제를 좁히는 관찰 사다리
- service: request latency, error rate, throughput을 본다
- scheduler: queue length, batch size, admission control을 본다
- runtime: H2D/D2H copy, kernel launch, stream synchronization을 본다
- device: SM utilization, memory bandwidth, temperature, power를 본다
- kernel: occupancy, stalls, instruction mix는 profiler로 깊게 판다
:::

## 3. 좋은 metric은 행동을 만든다

metric이 많다고 좋은 것은 아니다. GPU utilization 95%라는 숫자만 보고는 compute가 잘 쓰이는지, memory copy로 바쁜지, kernel이 spin하고 있는지 알기 어렵다. metric은 다음 행동을 가리켜야 한다.

예를 들어 tokens/sec가 떨어졌고 GPU memory는 꽉 찼으며 batch size가 줄었다면 KV cache pressure를 의심할 수 있다. GPU utilization이 낮고 CPU preprocessing queue가 길면 input pipeline을 본다. observability는 숫자 수집보다 원인 가설을 빨리 세우는 구조다.

## 4. production GPU의 흔한 함정

단일 benchmark에서는 보이지 않던 문제가 production에서 나온다. multi-tenant 환경에서는 noisy neighbor가 생기고, 긴 request가 batch를 붙잡고, thermal throttling이나 power cap이 latency tail을 흔든다.

또한 driver/runtime level error는 application log와 떨어져 있을 수 있다. CUDA error가 늦게 보고되거나, async execution 때문에 원인 위치가 흐려지는 일도 많다. observability system은 host log, runtime event, device metric의 시간을 맞춰야 한다.

## 5. 원본에서 확인할 질문

강의가 어떤 metric taxonomy를 제안하는지 보자. hardware metric 중심인지, ML serving metric 중심인지, Kubernetes/DCGM 같은 운영 stack 중심인지에 따라 실전 적용이 달라진다.

case study가 있다면 "증상에서 원인까지"의 경로를 눈여겨보자. 좋은 observability 강의는 dashboard screenshot보다 추론 과정을 보여 준다. 어떤 signal을 보고 어떤 가능성을 버렸는지가 더 중요하다.

## 6. 혼자 해볼 것

작은 inference server나 training script를 하나 띄우고 GPU metric과 application metric을 동시에 기록해 보자. `nvidia-smi dmon`, DCGM, PyTorch profiler, server latency log 중 가능한 도구를 조합한다.

그다음 일부러 bottleneck을 만든다. CPU preprocessing sleep을 넣거나 batch size를 줄이거나 memory를 압박해 본다. metric이 그 변화를 설명해 주는지 확인하면, observability가 장식인지 도구인지 금방 드러난다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=-6FlMJ-AP74)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_098.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_098.md`
