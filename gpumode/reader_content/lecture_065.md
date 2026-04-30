---
num: 65
title: Neighborhood Attention, 가까운 곳만 보는 attention
original: "Lecture 65: Neighborhood Attention"
speaker: Ali Hassani
part: 5
part_label: Part V · 추론·학습·통신 스케일
priority: High
status: partial
---

:::crux
transcript는 실패했지만 local notes에는 Ali Hassani, YouTube, Google Slides link가 확인된다. slide 내용은 여기서 재구성하지 않는다. 제목에서 안전하게 잡을 수 있는 핵심은 **neighborhood attention이 모든 token pair를 보지 않고 가까운 주변만 보게 하여, vision workload에서 attention 비용과 locality를 다시 설계한다는 점**이다.
:::

## 1. neighborhood attention은 locality를 attention에 넣는다

일반 self-attention은 모든 token이 모든 token을 볼 수 있다. vision에서 image patch나 feature map token이 많아지면 이 global attention은 비용이 커진다. neighborhood attention은 각 위치가 주변 window 안의 token만 보도록 제한하는 방향으로 이해할 수 있다.

다만 원본 강의가 어떤 version, paper, implementation, benchmark를 다뤘는지는 transcript 없이 확인되지 않는다. 따라서 여기서는 구체 수식이나 성능 수치를 만들지 않는다. 핵심은 local window가 algorithm과 kernel 양쪽에 어떤 질문을 던지는지다.

## 2. 비용은 줄지만 정보 흐름도 바뀐다

neighborhood attention은 attention 대상 수를 줄여 compute와 memory를 줄일 수 있다. 특히 2D feature map에서는 주변 patch만 보는 구조가 convolution의 locality와 닮아 있다. GPU 관점에서는 attention score matrix 전체를 만들지 않아도 되는 가능성이 생긴다.

하지만 global interaction이 줄어드는 tradeoff가 있다. 멀리 떨어진 token 사이 정보가 바로 섞이지 않으면 layer를 여러 번 거치거나 window를 이동시키는 설계가 필요할 수 있다. speed만 보고 model behavior를 잊으면 안 된다.

:::figure grid
label: Figure · 2D neighborhood attention의 직관
- center: 현재 patch 또는 pixel 위치
- window: 주변 k x k 영역만 attention 대상으로 본다
- boundary: 가장자리에서는 mask나 padding 처리가 필요하다
- layers: 여러 층을 지나며 정보가 더 넓게 퍼진다
:::

## 3. kernel에서는 gather pattern이 중요하다

local window는 이론적으로 비용을 줄이지만, memory access가 쉬워지는 것은 아니다. 각 query 위치마다 주변 key/value를 모아야 하므로 gather pattern, boundary handling, layout, vectorization이 성능을 좌우한다.

vision tensor는 보통 batch, height, width, channel 축을 가진다. layout이 NHWC인지 NCHW인지, head dimension이 어떻게 놓이는지에 따라 coalescing이 달라진다. neighborhood attention kernel은 "적은 계산"을 "좋은 memory access"로 바꾸는 일이 관건이다.

## 4. window size는 model과 hardware의 공동 선택이다

window가 커지면 더 넓은 context를 보지만 비용이 늘어난다. window가 작으면 빠르지만 표현력이 제한될 수 있다. dilation, shifted window, hierarchical structure 같은 선택지도 있을 수 있으나, 원본 강의가 무엇을 다뤘는지는 확인 필요다.

benchmark를 볼 때는 resolution, window size, head dimension, batch size, dtype, layout을 함께 적어야 한다. neighborhood attention은 shape에 민감한 operation이다. 한 resolution에서 빠른 구현이 다른 resolution에서도 자동으로 빠르다고 볼 수 없다.

## 5. 손으로 해볼 것

`8 x 8` patch grid에서 각 위치가 `3 x 3` neighborhood만 본다고 가정하자. 중앙 patch 하나와 모서리 patch 하나가 각각 몇 개의 key를 보는지 세어 본다. 그 다음 global attention의 64개 key와 비교한다.

이 작은 계산은 neighborhood attention의 장점을 바로 보여 준다. 동시에 boundary mask가 왜 귀찮은지도 드러난다. 예쁜 아이디어가 kernel에서는 늘 약간의 장부 정리를 요구한다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=y5r2asbfNcs)
- [Slides](https://docs.google.com/presentation/d/1sLgni2AVSsxxwLSbMuo0aS_ZM8iP0MFBEb1ERoxS5CY/edit)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_065.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_065.md`
