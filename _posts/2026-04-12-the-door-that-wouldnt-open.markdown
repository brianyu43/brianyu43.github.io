---
layout: post
title:  "The Door That Wouldn't Open"
date:   2026-04-12 00:00:00 +0900
categories: essay
---

> I've wanted to do this for four years. Not vibe coding. Not building twenty repositories in a month. This — applying deep learning to drug discovery. The difference is that four years ago, I couldn't. This is about what changed.

---

## The Sentence

In 2023, Jensen Huang said something at GTC that I haven't been able to shake:

*"Biology is arguably the most important engineering in our time, and it's fundamentally an information science problem."*

I was a pharmacy student when I heard this. Not a computer science student who happened to be interested in biology — a pharmacy student who'd spent years memorizing drug mechanisms, pharmacokinetics, receptor binding profiles. I understood the biology. What I didn't understand was the math behind the sentence.

I tried. I opened deep learning papers. I watched lecture series. I downloaded PyTorch tutorials. Every time, I hit the same two walls: the mathematics I hadn't studied, and the code I couldn't write. Linear algebra wasn't intuition for me — it was notation I could parse but not think in. Python wasn't a tool — it was a foreign language where I could read signs but not hold conversations.

So I closed the tabs, went back to pharmacology, and told myself I'd come back later.

That was four years ago.

---

## Four Years of Closed Tabs

I want to be honest about what those four years felt like, because the narrative of "I was always destined to do this" would be a lie.

I wasn't building toward anything. I was a pharmacy student doing pharmacy things. The interest in computational drug discovery didn't go away — it sat in the background like a browser tab I'd pinned but never revisited. Every few months I'd see a paper about AlphaFold or a new molecular generation model, feel a pang of something between excitement and frustration, and close the tab again.

The frustration wasn't about intelligence. It was about access. I could read a paper's introduction and understand *why* the problem mattered — I knew what ADMET failure meant for a drug candidate, I knew why polypharmacy interactions were dangerous, I knew the clinical stakes. But the moment the paper shifted to "we parameterize the molecular graph as..." I was locked out.

It's a specific kind of helplessness: understanding the destination but not the road. Knowing that the bridge between pharmacology and machine learning existed, seeing other people cross it, and not being able to find the on-ramp.

---

## The Internship

Last year, during a lab rotation, something shifted.

The lab was working on cocrystal prediction — whether two molecules would form a cocrystal when combined. The approach was straightforward by ML standards: a CNN that takes SMILES strings as input, trained on a public dataset, and outputs a probability. There was an existing codebase. A GitHub repo. Real code solving a real chemistry problem.

I opened it in Cursor.

This is the part that's hard to explain to someone who hasn't experienced it. For four years, code had been a wall. I could look at it, but I couldn't *read* it — not in the way you read something and understand the author's intent. Cursor changed that. Not because it wrote the code for me, but because it could explain what each block was doing, in context, in response to my specific questions.

I spent a week with that repo. Not building anything new — just reading. Following the data pipeline from raw SMILES to tensor representation. Understanding why the convolutional layers were shaped the way they were. Asking "why this activation function?" and getting answers I could actually evaluate against my chemistry knowledge.

For the first time, the Methods section of a paper wasn't a wall. It was a map.

I didn't build anything from that experience. I didn't publish anything. I didn't add a line to my CV. But I walked out knowing that the door I'd been pushing against for four years wasn't locked anymore. The tools had changed. The barrier between "understanding the problem" and "understanding the solution" had gotten thin enough to break through.

---

## The Detour

Then I passed the pharmacist licensing exam, and something unhinged happened.

With the exam behind me and AI coding tools in my hands, I went on a building spree. Twenty repositories in thirty days. A Bitcoin arbitrage engine. An FPS zombie game. A Touhou-style bullet hell. A macroeconomic dashboard. An agent-based simulation of SpaceX's IPO. Everything I could think of, as fast as I could think of it.

I've written about this elsewhere — what worked, what didn't, and why most of it died. The short version: AI can accelerate your hands, but it can't substitute for domain knowledge. The projects that worked were the ones where I already knew what "right" looked like. The ones that failed were the ones where I was generating confident garbage at high speed without realizing it.

But the building spree did something I didn't expect. It burned through the novelty of "I can build anything" fast enough that I had to confront a harder question: "What should I build?"

And the answer, once the noise cleared, was obvious. It had been obvious for four years.

---

## Going Back to the Beginning

I stopped building random things and started studying.

Not coding — studying. The drug discovery pipeline, end to end. Not the version you learn in pharmacy school, where you memorize approved drugs and their mechanisms. The version that matters for computational approaches: how targets are selected through omics data, how hits are identified through virtual screening, how leads are optimized through structure-activity relationships, and how candidates fail — overwhelmingly — at the ADMET and toxicity stage.

This was the education I'd been missing. Pharmacy school taught me what happens after a drug exists. It didn't teach me where the computational bottlenecks are in making one. I didn't know that ADMET failure accounts for the majority of late-stage drug candidate attrition. I didn't know that multi-drug interactions beyond pairwise combinations are essentially uncharted territory in existing databases. I didn't know that the gap between a molecular property prediction model and an actionable clinical tool is wider than most ML papers acknowledge.

I know now. And knowing the problem space properly — not just the biology, not just the code, but where they meet and where they fail to meet — is what makes the difference between building something useful and generating another artifact.

---

## What Deep Learning Actually Is, Now That I Can See It

Here's what I understand now that I didn't understand four years ago.

Deep learning applied to drug discovery isn't a single technique. It's a constellation of approaches mapped onto different stages of the pipeline. Graph neural networks for molecular property prediction. Generative models for *de novo* molecule design. Sequence models for protein structure and function. Diffusion models for structure-based drug design. Each one addresses a specific bottleneck, with specific data requirements, specific failure modes, and specific gaps between benchmark performance and clinical utility.

Four years ago, this looked like one monolithic field I couldn't enter. Now it looks like a landscape with distinct regions, some well-explored, some barely touched. And I can see — because of the pharmacology, not in spite of it — which regions matter most and which are overcrowded.

The polypharmacy interaction space, for instance. Pairwise drug-drug interactions are relatively well-studied. But the moment you move to three or more concurrent drugs — which is the reality for most elderly patients, most chronic disease patients, most of the people I'll see across a pharmacy counter — the data becomes sparse, the models become uncertain, and the clinical tools become essentially nonexistent.

That's not a gap I identified by reading ML papers. It's a gap I know exists because I studied pharmacology for six years.

---

## Where I Am Now

I'm a pharmacist. I graduated a month ago. I haven't stood behind a counter yet.

I'm also someone who has spent the last several months going deeper into machine learning for drug discovery than I ever thought I'd be able to. Not because I suddenly became a better mathematician or a better programmer — but because the tools changed, and the barrier that kept me out for four years dissolved fast enough that I could finally cross.

I want to contribute to what I think is the most important intersection in science right now: computation and biology. Not at the surface level — not "I used ChatGPT to summarize a paper" — but at the level where you understand both the biological question and the mathematical machinery well enough to know when the model is wrong and why.

Jensen Huang was right. Biology is becoming a computational science. The question is who gets to participate in that transformation. For a long time, the answer was: people with CS degrees and access to GPU clusters. I think that's changing. I think domain experts — pharmacists, biologists, clinicians — who can now learn the computational tools are going to see things that pure ML researchers miss. Because they know what the numbers are supposed to mean.

I have a long way to go. The mathematics I skipped four years ago still needs to be learned — properly, not vibed. The engineering intuition that separates a prototype from a production system still needs to be built. The gap between "I can read a GNN paper" and "I can design a novel architecture" is real, and I'm closer to the first end than the second.

But the door is open now. And I'm not closing the tab this time.
