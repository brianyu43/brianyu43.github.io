---
num: 24
title: Scan at the Speed of Light
original: "Lecture 24: Scan at the Speed of Light"
speaker: Jake Hemstad & Georgii Evtushenko
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
이 강의의 좋은 점은 “우리 scan이 몇 배 빨라졌다”에서 멈추지 않는다는 것이다. 먼저 scan의 speed-of-light, 즉 이론적으로 가능한 memory bandwidth 한계를 잡고, 현재 구현이 그 몇 퍼센트인지 본다. 핵심은 **speedup보다 한계 대비 효율을 묻는 습관**이다.
:::

## 1. scan은 왜 다시 등장하나

Jake Hemstad와 Georgii Evtushenko는 scan을 병렬 컴퓨팅의 강력한 building block으로 본다. 순차적으로 보이는 문제를 병렬로 바꿔주는 힘이 있기 때문이다. Mamba 같은 modern architecture에서도 scan 계열 연산이 중요해지며, ML 사람에게도 더 이상 먼 알고리즘이 아니다.

Lecture 20과 21이 scan을 직접 구현하는 법을 다뤘다면, Lecture 24는 “정말 빠르게 만들려면 무엇을 기준으로 삼아야 하는가”를 묻는다. 답은 speed-of-light analysis다. benchmark 숫자 하나보다, hardware 한계와 비교한 위치를 보자는 이야기다.

## 2. speedup은 종종 착시다

어떤 구현이 baseline보다 200배 빠르다고 하자. 멋져 보인다. 그런데 peak memory bandwidth의 2%밖에 쓰지 못한다면 이야기가 달라진다. baseline이 너무 나빴을 뿐, 새 구현도 아직 hardware를 거의 못 쓰고 있을 수 있다.

Scan은 arithmetic intensity가 낮다. prefix sum은 element를 읽고 결과를 쓰는 memory-bound operation으로 보는 것이 자연스럽다. 최소한 input을 한 번 읽고 output을 한 번 써야 하므로 대략 2N memory operation이 lower bound가 된다. 따라서 speed-of-light는 peak bandwidth에서 이 필수 traffic을 처리하는 시간으로 잡을 수 있다.

:::figure memory
label: Figure · scan의 speed-of-light 감각
:::

## 3. hierarchy scan의 한계

전통적인 hierarchical scan은 block scan을 하고, partial sums를 저장하고, 다시 scan하고, 결과를 더한다. 이해하기 쉽지만 extra global memory traffic이 생긴다. memory operation이 2N보다 많아지므로, 아무리 잘해도 speed-of-light의 일정 비율을 넘기 어렵다.

강의에서는 이런 식으로 알고리즘을 숫자로 본다. “이 구현은 3N traffic이 필요하니 2N lower bound 기준으로 최대 66% 근처가 한계” 같은 사고다. 정확한 숫자는 조건에 따라 달라지지만, 이 계산 방식이 중요하다. 알고리즘의 구조가 성능 상한을 미리 정한다.

## 4. decoupled look-back의 아이디어

빠른 device-wide scan에서 중요한 알고리즘이 decoupled look-back이다. 각 block이 자기 tile scan을 하고, 앞 block의 prefix 상태를 보며 전체 prefix를 이어받는다. partial sums를 별도 kernel로 다시 scan하지 않고, 한 pass에 가깝게 처리하려는 아이디어다.

하지만 여기에는 memory ordering 문제가 있다. block이 “내 prefix 값이 준비됐다”는 flag를 쓰고, 다음 block이 그 값을 읽는다. flag와 value가 잘못된 순서로 보이면 틀린 결과가 나온다. 그래서 status flag, memory barrier, packed state 같은 세부가 중요하다. 빠른 scan은 알고리즘과 memory model이 만나는 지점이다.

## 5. CUB/CCCL이 왜 강한가

NVIDIA의 CUB/CCCL scan은 단순히 좋은 코드 한 파일이 아니다. block scan, warp scan, decoupled look-back, architecture별 tuning, 많은 parameter search가 쌓인 결과다. 강의에서 “scan이 speed of light에 가까운가”를 계속 묻는 이유도 여기에 있다. library가 좋은지 판단하려면 baseline 대비 speedup보다 bandwidth 효율을 봐야 한다.

또한 speed-of-light analysis는 성능 regression을 잡는 데도 유용하다. GPU가 바뀌면 peak bandwidth와 practical bandwidth가 달라진다. CI에서 여러 GPU의 bandwidth 대비 효율을 보면, 절대 시간만 보는 것보다 건강한 지표가 된다.

## 6. 손으로 해볼 것

먼저 scan의 최소 traffic을 계산한다. `float32` N개를 scan하면 input read N개와 output write N개, 총 `8N` bytes가 lower bound다. 가지고 있는 GPU의 measured copy bandwidth를 기준으로 최소 시간을 추정해본다.

그 다음 직접 구현한 scan이나 library scan의 처리량을 GB/s로 바꾼다. “몇 ms”보다 “speed-of-light의 몇 퍼센트인가”를 적어보자. 이 한 줄이 performance engineering의 표정을 꽤 바꾼다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=VLdm3bV4bKo)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_024.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_024.md`
