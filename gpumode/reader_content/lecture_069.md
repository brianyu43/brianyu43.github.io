---
num: 69
title: Quartet, FP4 training을 진짜 학습 문제로 다루기
original: "Lecture 69: Quartet 4 bit training"
speaker: Roberto Castro and Andrei Panferov
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: Low
status: partial
---

:::crux
transcript와 slides는 없지만 paper와 code link가 있다. 이 강의의 핵심 질문은 **4-bit를 inference 압축이 아니라 training arithmetic으로 쓸 때, 정확도와 compute 이득의 균형을 어디까지 밀 수 있는가**다. paper abstract는 Quartet이 native FP4 training을 목표로 하며 Blackwell GPU용 CUDA kernel 구현을 포함한다고 말한다.
:::

## 1. 지금 확인된 자료

local notes에는 speaker가 Roberto Castro and Andrei Panferov로 기록되어 있고, paper는 `Quartet: Native FP4 Training Can Be Optimal for Large Language Models`다. code link는 `IST-DASLab/Quartet`과 `isT-DASLab/qutlass`다. transcript fetch는 실패했다.

paper abstract에 따르면 Quartet은 Llama-type model을 대상으로 low-precision scaling law를 살피고, FP4 precision에서 accuracy와 computation의 trade-off를 다룬다. "state-of-the-art"나 "optimal" 같은 표현은 논문 안의 조건을 확인해야 한다. reader에서는 결론을 먼저 믿기보다 실험 설정을 먼저 읽어야 한다.

## 2. 4-bit training은 weight-only quantization과 다르다

많은 사람이 4-bit라고 들으면 inference용 weight quantization을 떠올린다. 하지만 training에서 4-bit를 쓴다는 것은 forward, backward, gradient, accumulation, optimizer update 중 어디를 낮은 precision으로 처리하는지 따져야 한다는 뜻이다. weight만 줄이는 문제보다 훨씬 까다롭다.

FP4는 표현할 수 있는 값의 범위와 간격이 매우 거칠다. scale 선택, outlier 처리, accumulation dtype, stochastic rounding 여부가 곧 학습 안정성으로 이어진다. Quartet을 읽을 때도 "몇 bit인가"보다 "어느 tensor가 어떤 format으로 계산되는가"를 먼저 봐야 한다.

:::figure grid
label: Figure · FP4 training을 볼 때의 네 칸
- arithmetic: matmul이 실제 FP4 path를 타는가
- scaling: tensor/channel/block별 scale을 어떻게 잡는가
- accumulation: partial sum과 optimizer state는 어떤 precision인가
- kernel: hardware-supported path와 custom CUDA kernel이 맞물리는가
:::

## 3. scaling law가 있다면 조건이 본문이다

paper abstract는 low-precision scaling law를 언급한다. 이런 주장은 매력적이지만, scaling law는 식보다 조건표가 중요하다. model family, parameter size, token count, optimizer, learning rate schedule, dataset, baseline precision, evaluation metric이 함께 있어야 의미가 생긴다.

특히 4-bit training에서는 hardware generation도 조건이다. Blackwell의 FP4 support를 전제로 한 결과라면, 이전 GPU에서 같은 code를 흉내 내도 같은 cost model이 나오지 않을 수 있다. code link의 `qutlass`는 kernel 쪽을 볼 때 중요한 단서가 될 가능성이 있다.

## 4. GPU Mode 독자에게 중요한 연결점

Quartet은 algorithm paper인 동시에 kernel paper처럼 읽어야 한다. FP4 training이 이론적으로 가능해도, kernel이 conversion과 scaling overhead에 먹히면 실제 throughput 이득은 줄어든다. 반대로 hardware path에 잘 올라가면 memory bandwidth, Tensor Core throughput, energy efficiency가 함께 움직인다.

여기서 좋은 질문은 "FP16 대비 몇 배 빠른가" 하나가 아니다. 어떤 layer에서 이득이 크고, 어느 부분이 여전히 higher precision fallback을 요구하는지 봐야 한다. training 전체 step time에서 FP4 kernel이 차지하는 비중도 확인해야 한다.

## 5. 혼자 해볼 것

간단한 linear layer를 놓고 FP16, FP8, FP4 가상 policy를 표로 비교해 보자. weight, activation, gradient, accumulation, optimizer state를 행으로 두고 dtype을 채우면 "4-bit training"이라는 말이 얼마나 많은 설계 선택을 숨기는지 보인다.

원본 강의나 paper를 다시 볼 때는 모든 benchmark 옆에 hardware, model size, token count, metric을 적자. low precision은 숫자가 멋질수록 조건을 더 끈질기게 봐야 한다. 이건 의심이 아니라 예의에 가깝다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=XVo17Q7YapA)
- [Paper](https://arxiv.org/abs/2505.14669)
- [Code: Quartet](https://github.com/IST-DASLab/Quartet)
- [Code: qutlass](https://github.com/isT-DASLab/qutlass)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_069.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_069.md`
