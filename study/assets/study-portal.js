const categories = ["전체", "수학", "기초 CS", "시스템", "컴파일러/PL", "CUDA/병렬"];

const books = [
  {
    id: "networking",
    title: "네트워크 한 입에",
    category: "기초 CS",
    description: "컴퓨터 네트워크를 톱다운 흐름으로 읽는 한국어 노트입니다.",
    href: "networkingbook/web/index.html",
    tags: ["네트워크", "톱다운", "인터넷"],
    chapters: [
      ["01", "컴퓨터 네트워크와 인터넷", "networkingbook/web/chapter01.html"],
      ["02", "애플리케이션 계층", "networkingbook/web/chapter02.html"],
      ["03", "트랜스포트 계층", "networkingbook/web/chapter03.html"],
      ["04", "네트워크 계층 - 데이터 평면", "networkingbook/web/chapter04.html"],
      ["05", "네트워크 계층 - 제어 평면", "networkingbook/web/chapter05.html"],
      ["06", "링크 계층과 LAN", "networkingbook/web/chapter06.html"],
      ["07", "무선과 이동 네트워크", "networkingbook/web/chapter07.html"],
      ["08", "네트워크 보안", "networkingbook/web/chapter08.html"]
    ]
  },
  {
    id: "datastruct",
    title: "Open Data Structures 한국어 재편찬",
    category: "기초 CS",
    description: "자료구조를 코드와 메모리의 모양으로 따라가는 단권형 인터랙티브 교재입니다.",
    href: "datastruct/data_structures_ko.html",
    tags: ["자료구조", "C++", "복잡도"],
    chapters: []
  },
  {
    id: "algorithms",
    title: "알고리즘 한국어 인터랙티브 교재",
    category: "기초 CS",
    description: "알고리즘 핵심 개념을 한 페이지에서 훑고 복습할 수 있는 교재입니다.",
    href: "algobook/algorithms_ko.html",
    tags: ["알고리즘", "그래프", "DP"],
    chapters: []
  },
  {
    id: "calculus2",
    title: "미적분학 II",
    category: "수학",
    description: "적분, 미분방정식, 급수, 매개곡선과 극좌표를 한국어 해설형 리더로 엮었습니다.",
    href: "calculus2/index.html",
    tags: ["미적분", "적분", "급수"],
    chapters: [
      ["01", "적분", "calculus2/index.html#ch1"],
      ["02", "적분의 응용", "calculus2/index.html#ch2"],
      ["03", "적분 기법", "calculus2/index.html#ch3"],
      ["04", "미분방정식 입문", "calculus2/index.html#ch4"],
      ["05", "수열과 급수", "calculus2/index.html#ch5"],
      ["06", "거듭제곱급수", "calculus2/index.html#ch6"],
      ["07", "매개방정식과 극좌표", "calculus2/index.html#ch7"],
      ["A-C", "부록", "calculus2/index.html#appendix"]
    ]
  },
  {
    id: "calculus3",
    title: "미적분학 III",
    category: "수학",
    description: "다변수 미분, 중적분, 벡터해석과 2계 미분방정식을 공간 감각 중심으로 풀었습니다.",
    href: "calculus3/index.html",
    tags: ["다변수미적분", "벡터해석", "중적분"],
    chapters: [
      ["01", "매개방정식과 극좌표", "calculus3/index.html#ch1"],
      ["02", "공간의 벡터", "calculus3/index.html#ch2"],
      ["03", "벡터값 함수", "calculus3/index.html#ch3"],
      ["04", "다변수 함수의 미분", "calculus3/index.html#ch4"],
      ["05", "중적분", "calculus3/index.html#ch5"],
      ["06", "벡터해석", "calculus3/index.html#ch6"],
      ["07", "2계 미분방정식", "calculus3/index.html#ch7"],
      ["A-C", "부록", "calculus3/index.html#appendix"]
    ]
  },
  {
    id: "linearalge",
    title: "응용 선형대수",
    category: "수학",
    description: "Vectors, Matrices, and Least Squares 흐름을 한국어 해설형 웹 교재로 재구성했습니다.",
    href: "linearalge/index.html",
    tags: ["선형대수", "행렬", "최소제곱"],
    chapters: [
      ["01", "벡터", "linearalge/index.html#ch1"],
      ["02", "선형 함수", "linearalge/index.html#ch2"],
      ["03", "노름과 거리", "linearalge/index.html#ch3"],
      ["04", "클러스터링", "linearalge/index.html#ch4"],
      ["05", "선형 독립", "linearalge/index.html#ch5"],
      ["06", "행렬", "linearalge/index.html#ch6"],
      ["07", "행렬 예제", "linearalge/index.html#ch7"],
      ["08", "선형방정식", "linearalge/index.html#ch8"],
      ["09", "선형 동역학 시스템", "linearalge/index.html#ch9"],
      ["10", "행렬곱", "linearalge/index.html#ch10"],
      ["11", "역행렬", "linearalge/index.html#ch11"],
      ["12", "최소제곱", "linearalge/index.html#ch12"],
      ["13", "최소제곱 데이터 피팅", "linearalge/index.html#ch13"],
      ["14", "최소제곱 분류", "linearalge/index.html#ch14"],
      ["15", "다목적 최소제곱", "linearalge/index.html#ch15"],
      ["16", "제약 최소제곱", "linearalge/index.html#ch16"],
      ["17", "제약 최소제곱 응용", "linearalge/index.html#ch17"],
      ["18", "비선형 최소제곱", "linearalge/index.html#ch18"],
      ["19", "제약 비선형 최소제곱", "linearalge/index.html#ch19"],
      ["A-D", "부록", "linearalge/index.html#appendix"]
    ]
  },
  {
    id: "optimization",
    title: "최적화 알고리즘",
    category: "수학",
    description: "연속·제약·확률·대리모델·이산 최적화를 독립 한국어 학습 가이드로 정리했습니다.",
    href: "optimization/index.html",
    tags: ["최적화", "알고리즘", "모델링"],
    chapters: [
      ["01", "최적화 입문", "optimization/index.html#ch1"],
      ["02", "도함수와 그래디언트", "optimization/index.html#ch2"],
      ["03", "브래키팅", "optimization/index.html#ch3"],
      ["04", "국소 하강", "optimization/index.html#ch4"],
      ["05", "1차 방법", "optimization/index.html#ch5"],
      ["06", "2차 방법", "optimization/index.html#ch6"],
      ["07", "직접 방법", "optimization/index.html#ch7"],
      ["08", "확률적 방법", "optimization/index.html#ch8"],
      ["09", "집단 방법", "optimization/index.html#ch9"],
      ["10", "제약조건", "optimization/index.html#ch10"],
      ["11", "쌍대성", "optimization/index.html#ch11"],
      ["12", "선형계획법", "optimization/index.html#ch12"],
      ["13", "이차계획법", "optimization/index.html#ch13"],
      ["14", "규율 볼록 프로그래밍", "optimization/index.html#ch14"],
      ["15", "다목적 최적화", "optimization/index.html#ch15"],
      ["16", "샘플링 계획", "optimization/index.html#ch16"],
      ["17", "대리모델", "optimization/index.html#ch17"],
      ["18", "확률적 대리모델", "optimization/index.html#ch18"],
      ["19", "대리모델 최적화", "optimization/index.html#ch19"],
      ["20", "불확실성 아래 최적화", "optimization/index.html#ch20"],
      ["21", "불확실성 전파", "optimization/index.html#ch21"],
      ["22", "이산 최적화", "optimization/index.html#ch22"],
      ["23", "표현 최적화", "optimization/index.html#ch23"],
      ["24", "다학제 최적화", "optimization/index.html#ch24"],
      ["A-C", "부록", "optimization/index.html#appendix"]
    ]
  },
  {
    id: "numericallinalg",
    title: "수치선형대수",
    category: "수학",
    description: "오차, 안정성, 직접해법, QR/SVD, 반복법, 고유값과 정칙화를 계산 감각 중심으로 정리했습니다.",
    href: "numericallinalg/index.html",
    tags: ["수치선형대수", "QR", "SVD"],
    chapters: [
      ["01", "동기와 계산 고려사항", "numericallinalg/index.html#ch1"],
      ["02", "선형시스템과 직접해법", "numericallinalg/index.html#ch2"],
      ["03", "최소제곱 문제", "numericallinalg/index.html#ch3"],
      ["04", "반복해법", "numericallinalg/index.html#ch4"],
      ["05", "행렬 고유값 문제", "numericallinalg/index.html#ch5"],
      ["06", "나쁜 조건과 저랭크 근사", "numericallinalg/index.html#ch6"],
      ["07", "부록", "numericallinalg/index.html#appendix"]
    ]
  },
  {
    id: "discrete",
    title: "이산수학 노트",
    category: "기초 CS",
    description: "Mathematics for Computer Science를 한국어 학습 흐름으로 묶은 교재입니다.",
    href: "descrete/index.html",
    tags: ["이산수학", "증명", "확률"],
    chapters: []
  },
  {
    id: "osstep",
    title: "OSTEP 한글 노트",
    category: "시스템",
    description: "운영체제: 세 가지 쉬운 조각을 한국어 노트로 정리한 단권형 자료입니다.",
    href: "osstep/osstep-ko.html",
    tags: ["운영체제", "가상화", "동시성"],
    chapters: []
  },
  {
    id: "csapp",
    title: "CS:APP 한글 학습 노트",
    category: "시스템",
    description: "컴퓨터 시스템을 프로그래머 관점에서 읽는 챕터형 학습 노트입니다.",
    href: "systemprogramming/csapp_kr/index.html",
    tags: ["시스템", "메모리", "링킹"],
    chapters: [
      ["01", "컴퓨터 시스템 둘러보기", "systemprogramming/csapp_kr/chapters/chapter01.html"],
      ["02", "정보의 표현과 처리", "systemprogramming/csapp_kr/chapters/chapter02.html"],
      ["03", "프로그램의 기계 수준 표현", "systemprogramming/csapp_kr/chapters/chapter03.html"],
      ["04", "프로세서 구조", "systemprogramming/csapp_kr/chapters/chapter04.html"],
      ["05", "프로그램 성능 최적화", "systemprogramming/csapp_kr/chapters/chapter05.html"],
      ["06", "메모리 계층", "systemprogramming/csapp_kr/chapters/chapter06.html"],
      ["07", "링킹", "systemprogramming/csapp_kr/chapters/chapter07.html"],
      ["08", "예외적 제어 흐름", "systemprogramming/csapp_kr/chapters/chapter08.html"],
      ["09", "가상 메모리", "systemprogramming/csapp_kr/chapters/chapter09.html"],
      ["10", "시스템 수준 입출력", "systemprogramming/csapp_kr/chapters/chapter10.html"],
      ["11", "네트워크 프로그래밍", "systemprogramming/csapp_kr/chapters/chapter11.html"],
      ["12", "병행 프로그래밍", "systemprogramming/csapp_kr/chapters/chapter12.html"]
    ]
  },
  {
    id: "comarchi",
    title: "컴퓨터 구조 RISC-V판",
    category: "시스템",
    description: "컴퓨터 구조를 RISC-V 중심으로 읽는 한국어 위트 가이드입니다.",
    href: "comarchi/index.html",
    tags: ["컴퓨터구조", "RISC-V", "프로세서"],
    chapters: [
      ["02", "명령어: 컴퓨터의 언어", "comarchi/chapters/chapter2.html"],
      ["03", "컴퓨터를 위한 산술", "comarchi/chapters/chapter3.html"],
      ["04", "프로세서", "comarchi/chapters/chapter4.html"],
      ["05", "크고 빠르게: 메모리 계층 활용", "comarchi/chapters/chapter5.html"],
      ["06", "병렬 프로세서", "comarchi/chapters/chapter6.html"]
    ]
  },
  {
    id: "comarchi-advanced",
    title: "컴퓨터구조 심화",
    category: "시스템",
    description: "정량 설계, 메모리 계층, ILP/DLP/TLP, 창고 규모 컴퓨터를 숫자 중심으로 읽는 심화 해설 노트입니다.",
    href: "comarchi/advanced/index.html",
    tags: ["컴퓨터구조", "정량분석", "성능"],
    chapters: [
      ["01", "정량 설계와 분석", "comarchi/advanced/chapter1.html"],
      ["02", "메모리 계층 설계", "comarchi/advanced/chapter2.html"],
      ["03", "명령어 수준 병렬성", "comarchi/advanced/chapter3.html"],
      ["04", "데이터 수준 병렬성", "comarchi/advanced/chapter4.html"],
      ["05", "스레드 수준 병렬성", "comarchi/advanced/chapter5.html"],
      ["06", "창고 규모 컴퓨터", "comarchi/advanced/chapter6.html"]
    ]
  },
  {
    id: "compiler",
    title: "컴파일러 엔지니어링",
    category: "컴파일러/PL",
    description: "Engineering a Compiler를 한국어 해설판으로 따라가는 챕터형 교재입니다.",
    href: "engineecompile/korean/index.html",
    tags: ["컴파일러", "최적화", "코드생성"],
    chapters: [
      ["01", "컴파일 개관", "engineecompile/korean/chapter-1.html"],
      ["02", "스캐너", "engineecompile/korean/chapter-2.html"],
      ["03", "파서", "engineecompile/korean/chapter-3.html"],
      ["04", "문맥 의존 분석", "engineecompile/korean/chapter-4.html"],
      ["05", "중간 표현", "engineecompile/korean/chapter-5.html"],
      ["06", "프로시저 추상화", "engineecompile/korean/chapter-6.html"],
      ["07", "코드 모양", "engineecompile/korean/chapter-7.html"],
      ["08", "최적화 입문", "engineecompile/korean/chapter-8.html"],
      ["09", "데이터 흐름 분석", "engineecompile/korean/chapter-9.html"],
      ["10", "스칼라 최적화", "engineecompile/korean/chapter-10.html"],
      ["11", "명령어 선택", "engineecompile/korean/chapter-11.html"],
      ["12", "명령어 스케줄링", "engineecompile/korean/chapter-12.html"],
      ["13", "레지스터 할당", "engineecompile/korean/chapter-13.html"],
      ["A", "ILOC", "engineecompile/korean/appendix-a.html"],
      ["B", "자료 구조", "engineecompile/korean/appendix-b.html"]
    ]
  },
  {
    id: "automata",
    title: "계산이론 한글 해설",
    category: "컴파일러/PL",
    description: "오토마타, 계산 가능성, 복잡도 이론을 한 흐름으로 읽는 자료입니다.",
    href: "engineecompile/automata/automata.html",
    tags: ["계산이론", "오토마타", "복잡도"],
    chapters: []
  },
  {
    id: "pfpl",
    title: "PFPL 한글판",
    category: "컴파일러/PL",
    description: "프로그래밍 언어의 실용 기초를 한국어로 읽는 단권형 교재입니다.",
    href: "engineecompile/pfpl.html",
    tags: ["프로그래밍 언어", "타입", "의미론"],
    chapters: []
  },
  {
    id: "pmppbook",
    title: "대규모 병렬 프로세서 프로그래밍",
    category: "CUDA/병렬",
    description: "CUDA와 병렬 프로그래밍을 PMPP 흐름으로 정리한 한국어 학습판입니다.",
    href: "pmppbook/index.html",
    tags: ["CUDA", "PMPP", "GPU"],
    chapters: [
      ["01", "들어가며: 왜 병렬인가", "pmppbook/content/ch01.html"],
      ["02", "이질 컴퓨팅과 CUDA 첫걸음", "pmppbook/content/ch02.html"],
      ["03", "다차원 그리드와 데이터 매핑", "pmppbook/content/ch03.html"],
      ["04", "GPU 아키텍처와 워프 스케줄링", "pmppbook/content/ch04.html"],
      ["05", "메모리 계층과 데이터 지역성", "pmppbook/content/ch05.html"],
      ["06", "성능 고려사항", "pmppbook/content/ch06.html"],
      ["07", "컨볼루션과 상수 메모리", "pmppbook/content/ch07.html"],
      ["08", "스텐실", "pmppbook/content/ch08.html"],
      ["09", "히스토그램", "pmppbook/content/ch09.html"],
      ["10", "리덕션", "pmppbook/content/ch10.html"],
      ["11", "접두사 합", "pmppbook/content/ch11.html"],
      ["12", "병합", "pmppbook/content/ch12.html"],
      ["13", "정렬", "pmppbook/content/ch13.html"],
      ["14", "희소 행렬 연산", "pmppbook/content/ch14.html"],
      ["15", "그래프 탐색", "pmppbook/content/ch15.html"],
      ["16", "딥러닝과 CUDA", "pmppbook/content/ch16.html"],
      ["17", "케이스: 반복적 MRI 재구성", "pmppbook/content/ch17.html"],
      ["18", "케이스: 정전 포텐셜 맵", "pmppbook/content/ch18.html"],
      ["19", "병렬 프로그래밍과 컴퓨테이셔널 씽킹", "pmppbook/content/ch19.html"],
      ["20", "이질 클러스터: MPI + CUDA", "pmppbook/content/ch20.html"],
      ["21", "CUDA 동적 병렬성", "pmppbook/content/ch21.html"],
      ["22", "고급 실전과 미래", "pmppbook/content/ch22.html"],
      ["23", "마치며: 그래서, 다음은?", "pmppbook/content/ch23.html"]
    ]
  },
  {
    id: "cudaonebooks",
    title: "CUDA/Kernel/Compiler 18권 단권화",
    category: "CUDA/병렬",
    description: "GPU 커널, 컴파일러, 서빙까지 이어지는 CUDA 심화 단권화 모음입니다.",
    href: "cudaserious/cuda_onebooks/index.html",
    tags: ["CUDA", "커널", "컴파일러"],
    chapters: [
      ["V01", "PMPP Core", "cudaserious/cuda_onebooks/V01_pmpp_core.html"],
      ["V02", "GPU Architecture Quantitative", "cudaserious/cuda_onebooks/V02_gpu_arch.html"],
      ["V03", "PTX ISA Ampere", "cudaserious/cuda_onebooks/V03_ptx_ampere.html"],
      ["V04", "Hopper PTX & SASS", "cudaserious/cuda_onebooks/V04_ptx_hopper_sass.html"],
      ["V05", "병렬 Primitive", "cudaserious/cuda_onebooks/V05_parallel_primitives.html"],
      ["V06", "GEMM CUTLASS CuTe", "cudaserious/cuda_onebooks/V06_gemm_cutlass_cute.html"],
      ["V07", "Attention Kernel 계보", "cudaserious/cuda_onebooks/V07_attention.html"],
      ["V08", "LLM 커널", "cudaserious/cuda_onebooks/V08_llm_kernels.html"],
      ["V09", "Mixed Precision", "cudaserious/cuda_onebooks/V09_mixed_precision.html"],
      ["V10", "Quantization", "cudaserious/cuda_onebooks/V10_quantization.html"],
      ["V11", "Triton 컴파일러 내부", "cudaserious/cuda_onebooks/V11_triton_compiler.html"],
      ["V12", "MLIR & LLVM for GPU", "cudaserious/cuda_onebooks/V12_mlir_llvm.html"],
      ["V13", "TorchInductor", "cudaserious/cuda_onebooks/V13_torch_inductor.html"],
      ["V14", "XLA TVM Polyhedral", "cudaserious/cuda_onebooks/V14_xla_tvm.html"],
      ["V15", "분산 통신과 병렬화", "cudaserious/cuda_onebooks/V15_distributed_comm.html"],
      ["V16", "Inference Serving", "cudaserious/cuda_onebooks/V16_inference_serving.html"],
      ["V17", "Training System", "cudaserious/cuda_onebooks/V17_training_system.html"],
      ["V18", "Roofline & Profiling", "cudaserious/cuda_onebooks/V18_profiling_roofline.html"]
    ]
  }
];

const bookOrder = [
  "comarchi",
  "comarchi-advanced",
  "csapp",
  "osstep",
  "networking",
  "pmppbook",
  "cudaonebooks",
  "compiler",
  "automata",
  "pfpl",
  "discrete",
  "datastruct",
  "algorithms",
  "calculus2",
  "calculus3",
  "linearalge",
  "numericallinalg",
  "optimization"
];

const orderedBooks = bookOrder
  .map((id) => books.find((book) => book.id === id))
  .filter(Boolean)
  .concat(books.filter((book) => !bookOrder.includes(book.id)));

const state = {
  category: "전체"
};

const libraryEl = document.querySelector("[data-library]");
const filtersEl = document.querySelector("[data-filters]");
const resultCount = document.querySelector("[data-result-count]");
const emptyState = document.querySelector("[data-empty-state]");
const totalBooks = document.querySelector("[data-total-books]");
const totalEntries = document.querySelector("[data-total-entries]");
const totalCategories = document.querySelector("[data-total-categories]");

function chapterCount(book) {
  return book.chapters.length;
}

function totalEntryCount() {
  return orderedBooks.reduce((sum, book) => sum + 1 + chapterCount(book), 0);
}

function renderFilters() {
  filtersEl.innerHTML = categories.map((category) => {
    const pressed = category === state.category ? "true" : "false";
    return `<button class="filter-button" type="button" aria-pressed="${pressed}" data-category="${category}">${category}</button>`;
  }).join("");
}

function renderLibrary() {
  let visible = 0;

  libraryEl.innerHTML = orderedBooks.map((book) => {
    const matchesCategory = state.category === "전체" || book.category === state.category;
    const isVisible = matchesCategory;
    if (isVisible) visible += 1;

    const chapters = book.chapters.map(([number, title, href]) => `
      <a class="chapter-link" href="${href}">
        <span class="chapter-no">${number}</span>
        <span class="chapter-name">${title}</span>
      </a>
    `).join("");

    const chapterButton = book.chapters.length
      ? `<button class="chapter-toggle" type="button" aria-expanded="false" data-toggle="${book.id}">챕터 보기</button>`
      : "";

    return `
      <article class="book-card${isVisible ? "" : " hidden"}" data-book="${book.id}">
        <div class="book-head">
          <div>
            <p class="book-kicker">${book.tags[0] || book.category}</p>
            <h2 class="book-title">${book.title}</h2>
            <p class="book-desc">${book.description}</p>
          </div>
          <div class="book-meta">
            <span class="category-pill">${book.category}</span>
            <span class="count-pill">${chapterCount(book) ? `${chapterCount(book)}개 링크` : "단권"}</span>
          </div>
        </div>
        <div class="book-tags">
          ${book.tags.map((tag) => `<span>${tag}</span>`).join("")}
        </div>
        <div class="book-actions">
          <a class="primary-link" href="${book.href}">바로 열기</a>
          ${chapterButton}
        </div>
        ${book.chapters.length ? `<div class="chapter-list" id="chapters-${book.id}">${chapters}</div>` : ""}
      </article>
    `;
  }).join("");

  resultCount.textContent = `${visible}개 교재`;
  emptyState.classList.toggle("visible", visible === 0);
}

function updateStats() {
  totalBooks.textContent = orderedBooks.length;
  totalEntries.textContent = totalEntryCount();
  totalCategories.textContent = categories.length - 1;
}

filtersEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderFilters();
  renderLibrary();
});

libraryEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-toggle]");
  if (!button) return;

  const card = button.closest(".book-card");
  const expanded = card.classList.toggle("expanded");
  button.setAttribute("aria-expanded", String(expanded));
  button.textContent = expanded ? "챕터 닫기" : "챕터 보기";
});

updateStats();
renderFilters();
renderLibrary();
