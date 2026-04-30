---
num: 6
title: Optimizer는 왜 느려지는가
original: Lecture 6 Optimizing Optimizers
speaker: Jane Xu
part: 1
part_label: Part I · 측정과 CUDA 기초
priority: High
status: rich
---

:::crux
optimizer step은 수학으로 보면 간단한 elementwise update지만, 실행으로 보면 parameter마다 많은 작은 연산과 kernel launch가 생길 수 있다. 핵심은 같은 data를 여러 번 왕복시키지 않고, launch와 memory traffic을 줄이는 방식으로 update를 묶는 것이다.
:::

## 1. optimizer는 학습의 뒷정리가 아니다

training loop를 볼 때 forward와 backward가 주인공처럼 보인다. 하지만 optimizer step도 매 iteration마다 실행된다. Adam류 optimizer라면 parameter, gradient, moment buffer들을 읽고 쓰며 여러 elementwise 연산을 수행한다.

Jane은 PyTorch optimizer의 여러 구현 경로를 비교한다. 단순 for-loop 방식, foreach 방식, fused 방식은 모두 같은 수학을 하더라도 GPU 실행 모양이 다르다. 그리고 GPU에서는 이 실행 모양이 시간을 만든다.

작은 tensor가 많으면 특히 launch overhead가 도드라진다. 각 parameter마다 add, mul, lerp, div 같은 연산이 따로 kernel로 나가면, 계산보다 "일을 시키는 비용"이 커질 수 있다.

## 2. for-loop에서 foreach로

가장 직관적인 optimizer 구현은 parameter를 하나씩 돌며 update한다. 이해하기 쉽지만, parameter가 많으면 같은 종류의 CUDA kernel을 아주 많이 launch하게 된다.

foreach 구현은 여러 tensor에 대해 같은 연산을 batch처럼 처리한다. Python-level loop를 줄이고, dispatcher 아래에서 묶인 연산을 실행한다. 여기서 이미 launch 수가 줄어드는 효과가 있다.

하지만 foreach도 만능은 아니다. 여러 tensor pointer와 shape/stride 정보를 넘겨야 하고, 실제 kernel이 어떻게 batching을 처리하는지에 따라 overhead가 남는다. 그래도 "하나씩 하지 말고 묶어라"는 방향은 분명하다.

:::figure flow
label: Figure · optimizer step의 실행 모양
- stage: for-loop optimizer는 parameter마다 여러 CUDA kernel을 부른다.
- stage: foreach optimizer는 같은 연산을 여러 tensor에 묶어 적용한다.
- stage: fused optimizer는 update 수식을 한 kernel 안으로 더 많이 밀어 넣는다.
- stage: 좋은 구현은 launch 수와 global memory 왕복을 함께 줄인다.
:::

## 3. fused optimizer의 의미

fusion은 단순히 코드 줄 수를 줄이는 일이 아니다. GPU에서 fusion은 중간 결과를 global memory에 쓰고 다시 읽는 일을 줄이고, 여러 작은 kernel launch를 하나로 합치는 일이다.

Adam update를 생각해 보자. gradient를 읽고, first moment와 second moment를 갱신하고, bias correction과 learning rate를 적용하고, parameter를 갱신한다. 이것을 여러 kernel로 쪼개면 buffer들이 반복해서 global memory를 오간다.

fused kernel은 가능한 한 한 번 읽어 계산하고 한 번 쓴다. 그래서 계산량이 아주 큰 작업보다 memory-bound elementwise update에서 특히 효과가 크다.

## 4. CUDA kernel의 signature를 읽기

강의는 simplified CUDA kernel signature를 통해 tensor pointer가 어떻게 넘어가는지도 설명한다. PyTorch tensor의 `data_ptr`는 device memory 주소를 가리키는 큰 정수처럼 보일 수 있다. host에서 그 주소를 직접 dereference하는 것이 아니라, CUDA kernel 안에서 GPU가 사용한다.

stride도 중요하다. tensor가 contiguous라고 가정하면 편하지만 PyTorch tensor는 view, transpose 등으로 다양한 stride를 가질 수 있다. production optimizer는 이런 일반성을 어느 정도 감당해야 한다.

여기서 성능과 일반성의 tension이 생긴다. 더 많은 shape와 stride를 지원하려면 kernel이 복잡해지고, 특화된 fast path를 만들면 API 표면이 늘어난다. PyTorch 내부 구현이 어려운 이유다.

## 5. launch overhead를 숫자로 의심하기

강의의 메시지는 아주 실용적이다. CUDA kernel launch는 공짜가 아니다. 연산량이 작거나 tensor가 많이 쪼개져 있으면, 계산보다 launch overhead가 더 눈에 띌 수 있다.

그래서 optimizer 최적화는 "더 빠른 곱셈"보다 "몇 번 launch하는가", "같은 data를 몇 번 memory에서 읽는가"로 시작하는 편이 좋다. profiler trace에서 optimizer step 구간을 열어 kernel이 빗방울처럼 흩어져 있다면 fusion 후보일 수 있다.

unified memory 같은 주제도 언급되지만, PyTorch에서 바로 편하게 쓸 수 있는 해법은 아니다. 일반 사용자는 먼저 foreach/fused 옵션과 tensor layout, parameter grouping을 확인하는 쪽이 현실적이다.

## 6. 실험 과제

작은 모델에서 AdamW를 for-loop, foreach, fused 옵션으로 돌려 보고 profiler trace를 비교해 보자. wall-clock만 보지 말고 optimizer step 안의 kernel launch 개수와 각 kernel 시간을 세어 보면 좋다.

parameter를 일부러 많은 작은 tensor로 쪼갠 모델과, 비교적 큰 tensor 몇 개로 된 모델을 비교해 보자. 같은 optimizer라도 launch overhead가 어떤 경우에 더 크게 보이는지 금방 감이 온다.

:::tip
optimizer가 느릴 때 먼저 learning rate 수식부터 의심하지 말자. profiler에서 optimizer step의 kernel launch 개수, tensor 크기 분포, foreach/fused 사용 여부를 보는 것이 더 빠른 길일 때가 많다.
:::

## Source Links

- [YouTube](https://www.youtube.com/watch?v=hIop0mWKPHc)
- [Slides](https://docs.google.com/presentation/d/13WLCuxXzwu5JRZo0tAfW0hbKHQMvFw4O/edit#slide=id.p1)
- [Code / speaker GitHub](https://github.com/janeyx99)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_006.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_006.md`
