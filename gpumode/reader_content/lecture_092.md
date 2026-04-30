---
num: 92
title: "Smol Training Playbook, 작게 훈련하며 크게 배우기"
original: "Lecture 92: Smol Training Playbook"
speaker: Loubna Ben Allal
part: 7
part_label: Part VII · 시스템 실전과 최신 주제
priority: Low
status: partial
---

:::crux
이 노트는 transcript, slides, code가 없는 상태에서 작성한 자료가 제한된 노트다. 제목과 speaker metadata만으로 붙잡을 수 있는 질문은 **작은 모델이나 작은 실험으로 training decision을 얼마나 신뢰할 수 있게 만들 것인가**다. 구체적인 recipe, dataset, optimizer 설정, benchmark 숫자는 원본 영상 확인 전까지 비워 두어야 한다.
:::

## 1. 지금 손에 있는 것

local notes에는 speaker가 Loubna Ben Allal로 기록되어 있고 YouTube link만 있다. transcript fetch는 실패했고, slides/code/paper/repo folder는 없다. 그래서 이 강의가 Hugging Face식 practical training guide인지, small model pretraining recipe인지, fine-tuning 운영 playbook인지는 아직 단정할 수 없다.

다만 "smol training playbook"이라는 제목은 좋은 학습 태도를 알려 준다. 거대한 run 하나를 신앙처럼 기다리기보다, 작고 빠른 실험으로 가설을 부수고 고치는 방식이다. GPU 시스템 공부에서도 이 감각은 꽤 중요하다. 큰 cluster에서 틀리면 비싸고, 작은 run에서 틀리면 배운다.

## 2. 작은 훈련은 축소판이 아니라 실험 장치다

작은 모델은 production 모델의 미니어처가 아니다. capacity, data mixture, optimizer stability, communication overhead가 모두 다르게 나타난다. 그래서 작은 실험을 "그대로 성능 예측기"로 읽으면 위험하다.

대신 작은 훈련은 decision filter로 쓰는 편이 좋다. tokenization이 깨졌는가, loss curve가 정상적으로 내려가는가, dataloader가 병목인가, checkpoint/resume이 되는가, eval이 training objective와 싸우는가 같은 질문은 작은 run으로도 많이 걸러진다.

:::figure flow
label: Figure · smol training을 decision filter로 쓰기
- hypothesis: 바꿀 가설을 하나만 정한다
- tiny_run: 작은 model/data/step으로 빠르게 돌린다
- failure_check: data, loss, throughput, reproducibility를 먼저 본다
- scale_probe: 통과한 가설만 조금 더 큰 run으로 보낸다
- full_run: 비싼 실험은 마지막에 쓴다
:::

## 3. GPU 관점에서 먼저 볼 신호

training playbook은 model quality 이야기처럼 보이지만, 시스템 쪽에서는 먼저 throughput과 utilization을 본다. step time이 들쭉날쭉하면 학습 곡선도 해석하기 어렵다. dataloader, host-to-device copy, activation checkpointing, optimizer step, logging이 어디서 시간을 쓰는지 분리해야 한다.

작은 run에서는 GPU가 너무 작게 먹이를 받아 underutilized될 수도 있다. 이때 "작은 모델이 느리다"가 아니라 batch size, sequence length, kernel launch overhead, CPU preprocessing 중 무엇이 dominant인지 보아야 한다. 작은 실험의 미덕은 바로 여기 있다. 원인을 바꿔 가며 볼 수 있다.

## 4. playbook에 들어가야 할 최소 기록

좋은 playbook은 명령어 모음이 아니라 재현 가능한 관찰 기록이다. model size, dataset slice, tokenizer, sequence length, global batch, gradient accumulation, precision, optimizer, learning-rate schedule, seed, hardware, wall-clock, tokens/sec를 남겨야 한다.

특히 작은 training에서는 "잘 된 run"보다 "왜 실패했는지"가 더 귀하다. divergence, NaN, data corruption, eval mismatch, checkpoint incompatibility를 짧게라도 적어 두면 다음 사람이 같은 구덩이에 다시 들어가지 않는다.

## 5. 과장하지 않는 scaling 읽기

작은 run의 loss curve가 예쁘다고 큰 run도 성공한다고 말할 수는 없다. 반대로 작은 run에서 absolute quality가 낮다고 아이디어를 버릴 필요도 없다. 작은 실험은 주로 방향과 버그를 보는 도구다.

원본을 볼 때는 강의가 어떤 기준으로 "smol"을 정의하는지 확인하자. parameter count인지, dataset size인지, GPU budget인지, 혹은 iteration speed인지에 따라 playbook의 의미가 달라진다. 같은 단어가 귀여워 보여도 budget spreadsheet 앞에서는 꽤 냉정해진다.

## 6. 혼자 해볼 것

작은 language model fine-tuning run을 하나 정하고, 100 step짜리 smoke test를 만든다. 목표는 좋은 모델을 얻는 것이 아니라 loss, tokens/sec, memory, checkpoint/resume, eval script가 모두 살아 있는지 확인하는 것이다.

그다음 한 가지만 바꾼다. batch size, precision, sequence length, dataloader workers 중 하나를 바꾸고 결과를 표로 남겨 보자. 작은 playbook은 멋진 선언보다 이런 표 한 장에서 시작된다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=PQZt5L5Mwtg)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_092.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_092.md`
