---
num: 54
title: LeanRL, 작은 RL 모델을 빠르게 굴리는 감각
original: "Lecture 54: Small RL Models at the Speed of Light with LeanRL"
speaker: Unknown
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: Medium
status: partial
---

:::crux
이 장은 자료가 아주 얇다. LeanRL의 실제 API, benchmark, algorithm 선택은 아직 확인되지 않았다. 그래서 여기서는 **작은 RL 모델을 빠르게 돌린다는 말이 무엇을 재야 하는지**에 초점을 둔다. model forward만 볼지, environment stepping과 rollout collection까지 볼지에 따라 "빠르다"의 뜻이 달라진다.
:::

## 1. 제목만으로 algorithm을 만들지 않는다

확인된 정보는 제목, YouTube link, transcript failure뿐이다. PPO, DQN, policy gradient, vectorized environment, JAX, PyTorch 중 무엇을 썼는지는 notes에서 확인되지 않는다. speaker도 local notes에는 Missing으로 남아 있다.

그래서 이 원고는 LeanRL의 내부 구조를 설명하지 않는다. "Small RL Models at the Speed of Light"라는 제목을 만났을 때, 강의를 보며 어떤 장부를 열어야 하는지 정리한다. 작은 model을 빠르게 학습시킬 때 병목이 어디로 이동하는가, 그리고 GPU를 쓰는 일이 항상 답인가를 묻는 글이다.

## 2. 작은 RL은 GPU보다 loop가 먼저 보일 때가 많다

RL training은 supervised learning처럼 큰 batch tensor 하나를 계속 밀어 넣는 모양이 아닐 수 있다. environment를 step하고, observation을 모으고, action을 샘플링하고, reward와 done을 처리한 뒤 update한다. model이 작으면 neural network forward보다 이 control loop가 더 비싸질 수 있다.

따라서 "빠른 RL"은 kernel optimization만의 문제가 아니다. environment vectorization, rollout buffer layout, CPU-GPU transfer, random number generation, logging, Python dispatch를 같이 봐야 한다. 작은 모델일수록 사소한 overhead가 주인공이 된다.

:::figure flow
label: Figure · 작은 RL 학습 loop에서 볼 병목
- env step: 여러 환경을 동시에 진행한다
- policy: observation batch로 action을 만든다
- collect: reward, done, logprob, value를 buffer에 쌓는다
- update: 짧은 training step을 여러 번 돌린다
- measure: env throughput과 learner throughput을 따로 잰다
:::

## 3. "speed of light"는 상한선을 묻는 말로 읽자

제목의 표현은 과감하지만, reader에서는 과장 대신 상한선을 묻는 말로 읽는 편이 좋다. 작은 RL workload에서 이론적으로 얼마나 빨라질 수 있는가. environment가 초당 몇 step을 낼 수 있는가. learner는 그 data를 얼마나 빨리 소비하는가. 둘 중 어느 쪽이 기다리는가.

이렇게 보면 benchmark도 더 정직해진다. frames per second, samples per second, episode throughput, wall-clock-to-reward 같은 지표는 서로 다르다. 강의를 다시 볼 때 어떤 지표를 speed라고 부르는지 먼저 적어야 한다.

## 4. LeanRL을 볼 때 확인할 것

자료가 보강되면 가장 먼저 LeanRL이 무엇을 단순화했는지 확인해야 한다. codebase 구조인지, algorithm 구현인지, vectorized rollout인지, compiler/JIT 경로인지, 아니면 benchmark methodology인지에 따라 원고의 중심이 달라진다.

또 작은 RL 모델이라고 해도 "작다"의 의미가 여러 가지다. parameter 수가 작은가, environment가 가벼운가, observation이 작은가, horizon이 짧은가, batch가 작은가. 강의의 실제 예제가 무엇인지 알기 전까지는 결론을 비워 두는 편이 안전하다.

## 5. 손으로 해볼 것

가벼운 toy environment를 하나 잡고, random policy로 environment step throughput만 먼저 재 보자. 그 다음 작은 MLP policy forward를 붙이고, 마지막으로 learner update를 붙인다. 각 단계가 초당 몇 sample을 처리하는지 따로 적는다.

이 실험은 LeanRL 원본을 볼 때 좋은 기준점이 된다. speaker가 어디를 줄였는지, 그리고 그 줄임이 algorithmic change인지 systems change인지 구분할 수 있다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=En2Wdagwe24)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_054.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_054.md`
