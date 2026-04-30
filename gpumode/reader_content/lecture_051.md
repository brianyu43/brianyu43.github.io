---
num: 51
title: Consumer GPU performance, 데이터센터 밖의 GPU
original: "Lecture 51: Consumer GPU performance"
speaker: Jake Cannell
part: 4
part_label: Part IV · 프로덕션 커널과 GEMM
priority: Medium
status: partial
---

:::crux
이 강의는 transcript와 slides가 없어 구체 내용은 확인되지 않았다. 제목에서 확실히 읽을 수 있는 질문은 이것이다. **consumer GPU는 data center GPU와 같은 CUDA를 쓰더라도 memory, interconnect, driver, cooling, feature set, workload assumption이 달라 성능 해석이 달라진다**는 점이다.
:::

## 1. 확인된 자료

local notes에는 speaker Jake Cannell, YouTube link, transcript failure만 있다. slides, code, paper, repo folder는 없다. 따라서 어떤 GPU model을 다뤘는지, gaming GPU와 data center GPU를 어떻게 비교했는지, benchmark 결과가 무엇인지는 확인 필요다.

이 source-limited 원고는 consumer GPU performance를 읽을 때의 조심스러운 틀이다. 특히 4090, 3090, laptop GPU, Apple GPU 같은 이름을 제목만 보고 끌어오지 않는다.

## 2. 같은 FLOP 숫자라도 같은 GPU가 아니다

consumer GPU는 peak FLOPs가 높아 보여도 data center GPU와 제약이 다르다. ECC, HBM 대 GDDR, NVLink 유무, PCIe bandwidth, power limit, cooling, sustained clock, MIG 같은 partitioning feature가 다를 수 있다. kernel이 순간적으로 빠른 것과 장시간 안정적으로 serving하는 것은 다른 문제다.

또 data center GPU에는 H100처럼 TMA, WGMMA, cluster-level feature가 강조되는 세대가 있고, consumer line은 feature exposure나 performance ratio가 다를 수 있다. 정확한 비교는 architecture와 compute capability, driver/toolchain 조건을 확인해야 한다.

## 3. consumer GPU에서 병목은 더 실용적이다

개인 workstation에서는 VRAM 용량이 먼저 한계가 될 수 있다. 큰 model을 올리기 위해 quantization, CPU offload, paging, smaller batch를 선택하면 kernel peak보다 memory footprint와 transfer가 중요해진다. fan curve나 thermal throttling도 긴 benchmark에서는 무시하기 어렵다.

또 multi-GPU를 하더라도 NVLink가 없거나 bandwidth가 제한될 수 있다. 이 경우 tensor parallelism이나 distributed inference에서 communication cost가 data center node와 다르게 보인다. "내 4090 두 장"과 "H100 NVLink node"는 숫자만 GPU 두 개로 같을 뿐, 시스템은 다르다.

:::figure ladder
label: Figure · consumer GPU 성능을 볼 때의 질문
- capacity: model과 KV cache가 VRAM에 들어가는가
- bandwidth: GDDR/PCIe가 workload에 충분한가
- feature: 필요한 Tensor Core path와 CUDA feature가 노출되는가
- sustained: power/thermal limit 아래에서 장시간 유지되는가
- system: CPU, RAM, PCIe lane, storage가 GPU를 먹여 살리는가
:::

## 4. benchmark는 생활 조건을 포함한다

consumer GPU benchmark는 실사용 조건을 함께 적어야 한다. case open/closed, power limit, driver version, background display load, OS, batch size, quantization format이 결과에 영향을 줄 수 있다. data center benchmark보다 더 "집안 사정"을 탄다.

그렇다고 consumer GPU가 덜 중요하다는 뜻은 아니다. 오히려 많은 개발자가 이 환경에서 kernel을 배우고 prototype을 만든다. 다만 reader는 data center GPU의 optimization recipe가 그대로 옮겨진다고 가정하지 않아야 한다.

## 5. 손으로 해볼 것

자신의 GPU 또는 흔한 consumer GPU 하나를 골라 spec sheet를 적어 보자. VRAM 용량, memory bandwidth, PCIe generation/lane, Tensor Core 지원 dtype, compute capability, power limit을 적고, H100 같은 data center GPU와 차이를 표로 만든다.

원본 강의를 볼 때는 speaker가 어떤 차이를 가장 중요하게 봤는지 표시하자. 이 source-limited 원고는 그 표를 중심으로 다시 써야 한다.

## Source Links

- [YouTube](https://www.youtube.com/watch?v=7GO2t-8S2w0)
- Local notes: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/notes/lecture_051.md`
- Local transcript stub: `/Users/xavier/dev/gpumodelyrics/gpumode_lecture_archive/transcripts/lecture_051.md`
