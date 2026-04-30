---
num: 19
title: GPU에서 데이터 처리를 한다는 것
original: "Lecture 19: Data Processing on GPUs"
speaker: Devavret Makkar
part: 2
part_label: Part II · 병렬 패턴과 Attention
priority: High
status: rich
---

:::crux
GPU 데이터 처리는 tensor 연산만 빠르게 하는 이야기가 아니다. CSV/Parquet을 읽고, column buffer와 null mask를 다루고, hash group-by를 만들고, query plan을 실행하는 일까지 GPU에 올리는 이야기다. 핵심은 **데이터를 GPU에 올려놓고 여러 pass와 allocation을 어떻게 줄일 것인가**다.
:::

## 1. pandas 같은 API, CUDA 같은 뒤편

Devavret Makkar는 cuDF maintainer였고, 강의 시점에는 Voltron Data에서 GPU-native query engine을 만들고 있다. 그래서 강의의 관점이 흥미롭다. ML kernel만 보던 사람에게 “dataframe도 kernel들의 묶음”이라는 사실을 보여준다.

cuDF는 pandas와 비슷한 Python API를 제공하지만, backend는 CUDA다. CSV나 Parquet을 읽고, filter, group-by, join 같은 연산을 GPU에서 수행한다. TCS 같은 query engine은 SQL query를 execution plan으로 바꾸고, 그 plan을 GPU에서 실행한다. 사용자는 dataframe을 보지만, 안쪽에는 columnar memory와 hash table, scan, atomic이 있다.

## 2. 1 Billion Row Challenge가 좋은 장난감인 이유

강의의 toy workload는 1 Billion Row Challenge다. city와 temperature가 들어 있는 큰 text file에서 city별 min/mean/max 같은 aggregate를 구하는 문제다. CPU에서도 parsing과 aggregation이 만만치 않은데, GPU로 옮기면 병렬성이 생기는 동시에 새로운 제약도 생긴다.

GPU kernel 안에서는 마음대로 global allocation을 늘릴 수 없다. 가능한 city set이나 hash table 크기를 미리 잡아야 한다. file을 chunk로 나누고, 각 thread/block이 line boundary를 찾아 parsing하고, city를 찾아 aggregate slot에 atomic으로 더한다. 잘 짠 tailored kernel은 한 번의 pass로 많은 일을 할 수 있다.

:::figure flow
label: Figure · GPU group-by의 거친 흐름
- input: CSV/Parquet bytes 또는 column buffers
- parse/view: column data, offsets, null mask를 만든다
- hash: key column 값을 hash table slot으로 보낸다
- aggregate: atomic 또는 reduction으로 value를 누적한다
- compact: 빈 slot을 제거하고 결과 table을 만든다
:::

## 3. column은 data buffer만이 아니다

cuDF의 column은 단순한 pointer 하나가 아니다. data buffer, null mask, type 정보, 문자열이면 offsets와 chars buffer까지 가진다. table은 이런 column들의 묶음이고, view는 소유권 없이 buffer를 가리키는 창에 가깝다.

이 구조를 이해해야 group-by가 보인다. key가 하나의 integer column이면 hash가 쉽다. 하지만 string column이나 여러 key column이면 row index를 받아 각 column의 값을 읽고, hash를 combine하고, equality comparator도 여러 column을 비교해야 한다. dataframe API 한 줄 뒤에는 꽤 복잡한 device-side accessor가 있다.

## 4. hash group-by와 GPU의 불편함

Hash table을 GPU에서 만들 때는 CPU처럼 “필요하면 resize”가 쉽지 않다. 보통 충분히 큰 table을 미리 만들고, sentinel value와 atomic compare-and-swap 같은 방식으로 slot을 차지한다. collision이 나면 probing한다. key가 이미 있으면 aggregate를 update하고, 없으면 새 key를 넣는다.

이 방식은 병렬성이 좋지만 memory와 contention에 민감하다. key distribution이 나쁘면 atomic이 몰리고, hash table이 너무 작으면 probing이 길어진다. 반대로 너무 크게 잡으면 memory를 낭비한다. GPU data processing은 kernel만 빠르게 하는 것이 아니라 data structure를 GPU답게 만드는 일이다.

## 5. query engine으로 커지면 문제가 바뀐다

단일 GPU에 file이 올라가고 한두 연산을 하는 수준을 넘으면 query engine이 필요해진다. SQL은 filter, join, group-by, sort를 조합한다. engine은 query를 plan으로 바꾸고, 어떤 operator를 어떤 순서로 실행할지, intermediate를 어디에 둘지 결정한다.

여기서 중요한 비용은 data movement다. 같은 dataset을 query마다 다시 읽으면 GPU가 빠른 이득이 줄어든다. 가능한 한 data를 GPU에 머물게 하고, intermediate table의 lifetime을 짧게 관리해야 한다. ML에서 activation memory를 보는 눈이 data analytics에서는 column buffer와 shuffle memory를 보는 눈으로 바뀐다.

## 6. 손으로 해볼 것

작은 CSV를 하나 만들고 pandas와 cuDF의 API가 어떻게 대응되는지 살펴본다. GPU가 없다면 개념 실험으로 충분하다. city, temperature column을 두고 group-by mean을 만들려면 어떤 buffer, hash key, aggregate value가 필요한지 적어보자.

더 깊게 보려면 string key group-by를 생각한다. key 자체를 hash table에 복사할 것인가, row index를 저장하고 comparator가 column view를 통해 비교하게 할 것인가? 이 질문 하나에 GPU memory layout의 냄새가 꽤 진하게 난다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=FUBrIgdIuh0)
- [Devavret GitHub](https://github.com/devavret)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_019.md`
- Local transcript: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_019.md`
