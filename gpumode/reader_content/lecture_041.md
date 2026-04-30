---
num: 41
title: FlashInfer, KV cache를 있는 그대로 다루기
original: "Lecture 41: FlashInfer"
speaker: Zihao Ye
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: High
status: rich
---

:::crux
LLM inference에서 attention은 더 이상 "QK를 곱하고 softmax를 한다" 정도로 끝나지 않는다. request 길이는 제각각이고, KV cache는 page table, radix tree, speculative decoding tree, pruning/compression 구조로 흩어진다. FlashInfer의 핵심은 **이 복잡한 KV cache layout을 block sparse 표현으로 통일하고, attention kernel과 scheduler가 그 구조를 직접 다루게 하는 것**이다.
:::

## 1. 왜 또 attention engine인가

강의는 vLLM의 paged attention에서 출발한다. autoregressive inference serving에서는 요청마다 길이가 다르고, 최대 길이에 맞춰 cache를 잡으면 memory fragmentation이 커진다. paged attention은 KV cache를 작은 page 단위로 관리하고, attention kernel이 page table을 직접 따라가도록 만든다. 먼저 contiguous cache로 gather한 뒤 FlashAttention을 돌리는 방식보다 memory 효율이 좋다.

하지만 paged attention은 끝이 아니다. RadixAttention류의 prefix caching은 공유 prefix를 tree 구조로 관리하고, speculative decoding은 draft model이 만든 후보 tree를 검증한다. 긴 context에서는 Quest 같은 방식처럼 page별 reduced key로 중요도를 먼저 보고 top-k page만 본다. KV cache는 점점 더 "연속된 tensor"에서 멀어진다.

Zihao의 문제의식은 여기 있다. serving framework가 새 cache policy를 낼 때마다 attention kernel을 새로 쓰면 유지보수가 어려워진다. FlashInfer는 여러 cache management 전략을 kernel이 이해할 수 있는 공통 형식으로 바꾸려 한다.

## 2. block sparse로 KV cache를 설명한다

FlashInfer는 KV cache와 attention mask를 block sparse representation으로 본다. sparse matrix의 원소가 scalar 하나가 아니라 작은 block이라는 점이 중요하다. GPU Tensor Core는 일정한 MMA shape를 좋아하므로, 완전히 자유로운 sparse pattern보다 block 단위 구조가 hardware에 더 잘 맞는다.

paged attention도 이 관점으로 볼 수 있다. 전체 KV address space를 column으로 보고, 각 request가 접근하는 page를 nonzero block으로 두면 page table이 block sparse matrix가 된다. radix tree나 speculative decoding tree도 attention에서 허용되는 위치를 sparse structure로 표현할 수 있다.

다만 16x16이나 128x128 block을 고정하면 sparse ratio가 높은 tree attention에서 낭비가 커진다. 강의에서는 vector sparse에 가까운, column 수를 더 유연하게 잡는 설계가 나온다. 16x16 block 하나에 nonzero가 하나만 있어도 256개 element를 활성화하는 대신, 더 좁은 vector 단위로 낭비를 줄이는 식이다. 그래도 Tensor Core를 쓰기 위해 global memory에서 흩어진 row/column을 shared memory로 모은 뒤, on-chip에서는 dense하게 먹이는 구조를 유지한다.

:::figure flow
label: Figure · FlashInfer가 보는 serving attention
- cache policy: paged KV cache, radix prefix cache, speculative tree, pruning/compression
- representation: request와 KV address를 block sparse matrix로 표현
- data movement: scattered HBM access를 shared memory/register로 모은다
- compute: on-chip dense tile은 Tensor Core 또는 CUDA core attention kernel로 처리한다
- scheduler: variable length request를 CTA 단위 작업으로 나누고 균형을 맞춘다
:::

## 3. dense처럼 계산하려면 먼저 잘 모아야 한다

block sparse 구조라고 해서 Tensor Core를 포기하는 것은 아니다. attention의 head dimension은 보통 contiguous하고 크기도 충분하다. 그래서 global memory에서는 page index를 따라가며 흩어진 KV를 읽더라도, shared memory에 올린 뒤에는 dense tile처럼 Tensor Core에 먹일 수 있다.

Hopper의 TMA는 contiguous tensor copy에는 강력하지만, page index를 거치는 nonlinear memory access에는 바로 맞지 않는다. 그래서 FlashInfer는 sparse KV loading에서는 Ampere식 asynchronous copy인 `ldgsts`로 fallback한다. 성능이 완전히 무너지지는 않지만, pointer arithmetic과 register pressure가 늘어난다. 강의의 평가에서도 FlashAttention 3 template에서 sparse와 dense의 gap이 더 커지는 이유가 여기에 있다.

이 지점이 재미있다. "최신 hardware feature를 쓰면 빠르다"가 아니라, data layout이 feature의 전제와 맞아야 한다. TMA가 좋은 도구라도 indirect index array를 따라가는 access pattern에는 다른 전략이 필요하다.

## 4. compiler는 단순하고, runtime은 현실적이다

FlashInfer는 attention variant를 바꾸기 위해 compiler와 runtime layer를 둔다. compile time에는 CUDA/CUTLASS template과 Jinja string generation을 써서 kernel을 만든다. Zihao는 ML compiler 경험이 있지만 여기서는 단순함 때문에 Jinja template을 선택했다고 말한다. type checking과 debugging은 약하지만, 사용자는 생성된 CUDA code를 볼 수 있고 `torch.load`류의 흐름으로 빠르게 붙일 수 있다.

customization은 FlexAttention에서 영향을 받았다. score transform, logits transform, logits mask 같은 functor를 넣어 sigmoid attention, sliding window, paged attention, custom mask, RoPE fusion 같은 변형을 표현한다. 단, 모든 attention을 다 포괄하지는 않는다. QK를 만든 뒤 elementwise transform과 scan/online softmax류를 거쳐 V와 곱하는 계열이 주 영역이다. linear attention처럼 계산 구조가 완전히 다른 것은 밖에 있다.

runtime 쪽은 serving의 변동성을 맡는다. prefill은 query length와 KV length가 크고, decode는 query length가 1에 가깝다. append나 incremental prefill은 그 중간이다. FlashInfer는 query tile size 16, 32, 64, 128 같은 여러 kernel을 준비하고, workload 특성에 따라 고른다.

## 5. variable length는 scheduler 문제다

serving batch 안에는 긴 request와 짧은 request가 섞인다. 그대로 CTA에 나누면 어떤 SM은 일이 끝나고 놀고, 어떤 SM은 긴 request에 붙잡힌다. FlashInfer의 runtime scheduler는 attention work를 tile로 쪼갠 뒤, 큰 작업부터 가장 덜 바쁜 CTA에 배치하는 식으로 load balancing을 한다.

split-K와 비슷한 느낌이 있지만, atomic reduction을 피하고 deterministic output을 유지하려는 선택이 들어간다. floating point accumulation order가 바뀌면 결과가 조금 달라질 수 있고, serving system에서는 이 작은 차이가 재현성 문제로 이어질 수 있다. 그래서 partial output을 만들고, 두 번째 contraction kernel에서 정해진 순서로 merge한다.

API도 serving framework와 맞춘다. `init`, `plan`, `run` 단계가 있고, `plan`은 generation step마다 scheduling 정보를 만든다. 같은 KV cache layout이 여러 layer에서 재사용되기 때문에 planning cost는 amortize될 수 있다. CUDA Graph와 `torch.compile`과의 호환성도 언급된다.

## 6. 성능 숫자를 읽는 태도

강의에는 여러 benchmark가 나온다. page size 1의 paged attention에서 FA2 template은 sparse KV와 contiguous KV의 gap이 10% 안쪽으로 보이고, FA3 template은 TMA를 못 쓰는 영향으로 gap이 더 커진다. variable length에서는 constant distribution보다 uniform이나 Zipf-like distribution에서 load balancing 효과가 더 잘 드러난다.

end-to-end에서는 SGLang과 결합해 Llama 3.1 8B/70B, 1 H100/4 H100 설정에서 비교한 결과가 언급된다. transcript 기준으로 "up to 2x latency reduction" 같은 표현이 나오지만, 정확한 표와 조건은 원본 slide 확인이 필요하다. 좋은 독자는 숫자만 외우지 않는다. 어떤 distribution을 썼는지, attention이 병목인지, plan overhead가 amortize되는지, TMA를 쓸 수 있는 access pattern인지 함께 본다.

마지막으로 로드맵도 중요하다. NanoFlow식 intra-device parallelism, 제한된 SM budget에서 kernel 실행, CUDA green context, fully reproducible serving kernel, FlexAttention alignment, DP acceleration 같은 주제가 나온다. FlashInfer는 attention kernel 하나가 아니라 serving system과 같이 움직이는 CUDA kernel library가 되려 한다.

## 7. 손으로 해볼 것

작은 batch를 만들고 request별 KV length를 `[128, 2048, 64, 1024]`처럼 섞어 보자. attention work를 동일 크기 tile로 나눈 뒤 greedy하게 CTA에 배치하면 각 CTA의 총 work가 어떻게 달라지는지 손으로 계산해 보면 runtime scheduler의 필요가 보인다.

두 번째로 paged KV cache를 block sparse matrix로 그려 보자. row는 request, column은 page address로 두고, 각 request가 접근하는 page만 색칠한다. 이 그림 위에 shared prefix가 있는 request들을 추가하면 왜 "하나의 block size"가 항상 좋은 답이 아닌지 보인다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=iOLBJwENuvA)
- [Slides](https://docs.google.com/presentation/d/15lTG6aqf72Hyk5_lqH7iSrc8aP1ElEYxCxch-tD37PE/edit#slide=id.g326210b960f_0_42)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_041.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_041.md`
