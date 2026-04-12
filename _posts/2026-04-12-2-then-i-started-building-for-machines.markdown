---
layout: post
title:  "Then I Started Building for Machines"
date:   2026-04-12 00:00:00 +0900
categories: essay building
---

> At some point, the user I was building for stopped being a person and started being an agent. I didn't plan this. It just happened — project after project, the interface kept pointing away from screens and toward protocols.
>
> This is the story of that shift, and why I eventually walked away from it too.

---

## 11. Codex on a Phone

I spent four days on this. The idea: run Codex from your phone. Conversations are stored as `.jsonl`, which is easy enough to parse. Reading history on mobile wasn't the hard part. The hard part was everything else — real-time sync, sending commands remotely (which technically worked), and keeping a persistent server connection that didn't drop every time the phone went to sleep.

The app functioned. But it functioned the way a house of cards functions — impressive until someone breathes. I lacked the server infrastructure intuition to make it robust. Four days of building taught me that "it works on my desk" and "it works in production" are separated by an ocean I hadn't learned to cross.

## 12. Clizationer

This one started from a genuine frustration: web GUIs are not built for agents. A button that says "Submit" means something to a human looking at a screen. To an LLM, it's noise. I wanted to build a compiler that takes any website — or any API — and converts it into a CLI that agents could call directly.

The vision was ambitious. The execution was not. I hadn't thought through the core mechanics deeply enough — how to represent a website's interaction model as structured data, how to handle state, what "compiling the web" actually means at a technical level. The prototype ended up crawling HTML and extracting links. Which is to say, it ended up being a scraper with a fancy name.

I learned something useful, though: having the right problem doesn't mean you have the right solution. The instinct was correct — the gap between GUI and agent is real. But instinct without architecture is just a README with no code behind it.

## 13. Kiwoom Trade MCP Server

I wrapped Kiwoom Securities' trading API as an MCP server — Model Context Protocol, the standard for letting AI clients call external tools. Resources, tools, structured responses, the whole spec.

The surprising lesson: it wasn't hard. Once you understand the protocol, turning an API into an MCP server is mechanical work. The abstraction layer that lets an AI buy stocks through a standardized interface took less time to build than the HTS frontend that let a human do the same thing.

That asymmetry stuck with me. Making software agent-readable might actually be easier than making it human-readable. The hard part was never the protocol. It was knowing whether the agent should be doing the thing at all.

## 14. Conversation Collector

I built a pipeline to automatically extract ChatGPT conversations — the idea being that past context could be injected into future sessions. A long-term memory system, essentially.

It worked. I just didn't need it. The conversations I wanted to remember, I remembered. The ones I forgot, I forgot for a reason. Automated context retrieval sounds transformative in theory. In practice, most of what I said to ChatGPT last Tuesday is not worth retrieving.

## 15. Knowledge Map / Taste Map

This was more personal. I took my entire conversation history, embedded it, clustered it, and laid it out as a 2D graph — a map of my own interests, weighted by frequency and semantic proximity.

The graph worked. I could see the clusters: finance here, biology there, infrastructure in the corner, existential rambling scattered everywhere. It was a mirror made of vectors.

But once I looked at it, I didn't need to look again. The map confirmed what I already knew about myself. It didn't reveal anything I hadn't felt. The tool was technically sound and existentially redundant.

## 16. Mirofish

SpaceX IPO speculation was everywhere, so I built an agent-based simulation. Twenty agents — regulators, Elon, retail investors, meme consumers, institutional funds — debating across forty rounds whether SpaceX would go public, and when.

Most simulations converged on the same conclusion: IPO delayed. The agents, playing their roles faithfully, kept finding reasons to postpone. Regulators raised concerns. Elon resisted dilution. Retail investors got distracted. It was a surprisingly believable model of institutional inertia.

Whether it was *accurate* is a different question. But as a way to stress-test a thesis by forcing multiple perspectives to argue, it was more interesting than reading five analysts say the same thing.

## 17. arXiv Daily Pipeline

Every day, 1,900 papers hit arXiv. I built a pipeline that ingested all of them, ran a first-pass filter for relevance, summarized the abstracts of survivors, and published the results to a website.

I used it for about a week. It was genuinely convenient — a curated daily feed of papers I might care about, with summaries I could scan in minutes. But then I made a decision that killed the project from a completely different direction.

I decided to focus entirely on biology and pharmacology. And once I committed to that, I didn't want summaries anymore. I wanted to read the actual papers, slowly, one at a time. The pipeline was a tool for breadth. I was choosing depth.

---

## The Pattern, Again

Seven projects. Every one of them built for machines — agents, protocols, pipelines, automated reasoning. And every one of them either worked but didn't matter, or mattered but I couldn't finish it.

The lesson from Part 1 was: AI can't substitute for domain knowledge. This round added a corollary: **AI can't substitute for knowing what's worth doing.**

I could build an MCP server in a day. I could wire agents to simulate an IPO debate. I could map my own mind as a graph. None of it was hard. All of it was fast. And almost none of it lasted, because speed without direction is just expensive wandering.

The arXiv pipeline was the turning point. I built a system to process 1,900 papers a day, and then I realized I'd rather read one paper well than skim fifty. That's not a technical insight. It's a personal one.

**Part 3 is about where I landed.**

