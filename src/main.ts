import { commitWorldEvent } from "./core/dialogue/pipeline.js";
import { runNpcAutonomyStep, selectNpcAction } from "./core/agency/autonomy.js";
import { hasActionableGoal, selectDialogue } from "./core/dialogue/select.js";
import { transmitEventKnowledge } from "./core/dialogue/awareness.js";
import {
  applyVoiceProfile,
  INN_DIALOGUE_ENTRIES,
  INN_VOICE_PROFILES
} from "./content/inn-dialogue.js";
import type {
  DialogueRequest,
  NpcState,
  SimulationSnapshot,
  WorldEvent
} from "./core/dialogue/types.js";

const npcSeed = [
  { id: "ellen", name: "엘렌 바우어", occupation: "여관 주인", resources: { money: 36, stew: 5, ale: 8 } },
  { id: "bram", name: "브램 콜", occupation: "마을 목수", resources: { money: 7, fatigue: 58 } },
  { id: "mira", name: "미라 펜", occupation: "그레이포드에서 온 여행자", resources: { money: 14, travel_cloak: 1, dry_bread: 2 } },
  { id: "dain", name: "데인 홀로", occupation: "브룩필드에서 온 행상인", resources: { money: 22, copper_wire: 2, needle: 1 } }
] as const;

const profiles = new Map(INN_VOICE_PROFILES.map((profile) => [profile.npcId, profile]));

function createNpc(seed: typeof npcSeed[number]): NpcState {
  const profile = profiles.get(seed.id);
  if (!profile) throw new Error(`Missing voice profile for ${seed.id}`);

  return applyVoiceProfile({
    id: seed.id,
    name: seed.name,
    occupation: seed.occupation,
    traits: {
      emotionalReactivity: 0.5,
      threatSensitivity: 0.5,
      compassion: 0.5,
      pragmatism: 0.5
    },
    voice: { styleTags: [], formality: 0.5, bluntness: 0.5, warmth: 0.5 },
    concerns: [],
    goals: [],
    goalRules: seed.id === "mira" ? [{
      id: "mira-lost-property-response",
      goalId: "recover_satchel",
      triggerTags: ["lost_property", "belongings"],
      goalTags: ["lost_property", "belongings", "travel"],
      priority: 1,
      minimumSeverity: 0.4,
      eligibleKnowledgeChannels: ["direct_experience"],
      text: "잃어버린 가방을 되찾아 여행을 계속한다."
    }] : seed.id === "ellen" ? [{
      id: "ellen-guest-care-response",
      goalId: "help_guest",
      triggerTags: ["lost_property", "belongings"],
      goalTags: ["guests", "lost_property", "belongings", "inn"],
      priority: 0.78,
      minimumSeverity: 0.4,
      eligibleKnowledgeChannels: ["direct_observation", "testimony"],
      text: "여관 손님이 잃어버린 짐을 찾도록 돕는다."
    }] : [],
    resources: { ...seed.resources },
    knowledge: [],
    emotions: [],
    memories: [],
    relationships: {},
    needs: seed.id === "mira"
      ? [{ id: "security", value: 0.62 }]
      : seed.id === "bram"
        ? [{ id: "fatigue", value: 0.85 }]
        : [],
    capabilities: seed.id === "mira"
      ? [{ id: "search", proficiency: 0.86 }]
      : seed.id === "bram"
        ? [{ id: "woodworking", proficiency: 0.9 }]
        : [],
    actionRules: seed.id === "mira" ? [{
      id: "mira-autonomous-satchel-search",
      kind: "self_resolve",
      goalId: "recover_satchel",
      requiredGoalStatuses: ["active"],
      requiredKnowledgeTags: ["lost_property", "satchel"],
      requiredKnowledgeChannels: ["direct_experience"],
      minimumKnowledgeConfidence: 0.7,
      requiredNeeds: [{ needId: "security", minValue: 0.4 }],
      requiredCapabilities: [{ capabilityId: "search", minProficiency: 0.7 }],
      baseUtility: 0.3,
      goalPriorityWeight: 0.4,
      needWeights: { security: 0.2 },
      durationTicks: 1,
      cooldownTicks: 1,
      result: {
        eventType: "satchel_recovered_autonomously",
        summary: "미라가 여관 구석과 짐 보관 장소를 다시 살펴 잃어버린 가방을 스스로 찾아냈다.",
        tags: ["satchel_recovered", "lost_property", "recovery", "relief"],
        severity: 0.65,
        outcome: "beneficial",
        goalStatus: "completed",
        resolvesGoalOriginEvents: true,
        witnessNpcIds: ["ellen"],
        additionalGoalDeltas: [{ npcId: "ellen", goalId: "help_guest", status: "completed" }],
        needDeltas: [{ npcId: "mira", needId: "security", delta: -0.62 }]
      }
    }] : seed.id === "bram" ? [{
      id: "bram-take-rest",
      kind: "maintain_need",
      requiredNeeds: [{ needId: "fatigue", minValue: 0.7 }],
      needWeights: { fatigue: 0.5 },
      baseUtility: 0.2,
      durationTicks: 1,
      result: {
        eventType: "npc_rest",
        summary: "브램이 여관 구석에서 잠시 쉬며 쌓인 피로를 풀었다.",
        tags: ["rest", "fatigue", "recovery"],
        severity: 0.2,
        outcome: "beneficial",
        needDeltas: [{ npcId: "bram", needId: "fatigue", delta: -0.5 }]
      }
    }] : []
  }, profile);
}

let state: SimulationSnapshot = {
  tick: 0,
  npcs: npcSeed.map(createNpc),
  events: []
};
let selectedNpcId = "mira";
let lostEventId: string | null = null;
let resolvedEventId: string | null = null;
let timeline: Array<{ tick: number; text: string; kind: "world" | "information" }> = [];
let currentDialogue = "사람을 선택하고 말을 걸어 보세요. 같은 인사에도 각자의 말투가 드러납니다.";
let currentTrace = "대화의 근거와 감정 원인이 이곳에 표시됩니다.";
let currentSpeaker = "미라 펜";

const $ = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing UI element: #${id}`);
  return element;
};
const setText = (id: string, text: string) => { $(id).textContent = text; };

const channelNames: Record<string, string> = {
  direct_experience: "직접 경험",
  direct_observation: "직접 목격",
  testimony: "전해 들음",
  rumor: "소문",
  public_information: "공개 정보"
};

const goalStatusNames: Record<string, string> = {
  unresolved: "아직 해결되지 않음",
  active: "직접 해결을 시도 중",
  delegated: "타인에게 도움 요청",
  completed: "목표 달성",
  failed: "실패",
  abandoned: "포기"
};

const emotionNames: Record<string, string> = {
  fear: "공포",
  worry: "걱정",
  anger: "분노",
  grief: "슬픔",
  relief: "안도",
  joy: "기쁨",
  guilt: "죄책감",
  curiosity: "호기심",
  suspicion: "의심",
  hope: "희망",
  resentment: "원망"
};

function getNpc(id: string): NpcState {
  const npc = state.npcs.find((item) => item.id === id);
  if (!npc) throw new Error(`Unknown NPC: ${id}`);
  return npc;
}

function findLostEvent(): WorldEvent | undefined {
  return state.events.find((event) => event.id === lostEventId);
}

function addTimeline(tick: number, text: string, kind: "world" | "information") {
  timeline = [{ tick, text, kind }, ...timeline].slice(0, 12);
}

function commitEvent(event: WorldEvent): boolean {
  const result = commitWorldEvent(state, event);
  if (!result.ok) {
    setText("event-hint", `사건 적용 거부: ${result.error}`);
    return false;
  }
  state = result.state;
  addTimeline(event.tick, event.summary, "world");
  return true;
}

function renderPeople() {
  const list = $("people-list");
  list.innerHTML = "";
  for (const npc of state.npcs) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `person-card${npc.id === selectedNpcId ? " active" : ""}`;
    card.setAttribute("aria-pressed", String(npc.id === selectedNpcId));

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = npc.name.slice(0, 1);

    const main = document.createElement("span");
    main.className = "person-main";
    const name = document.createElement("strong");
    name.textContent = npc.name;
    const role = document.createElement("small");
    role.textContent = npc.occupation;
    main.append(name, role);

    const indicator = document.createElement("span");
    indicator.className = `person-indicator${npc.knowledge.length ? " known" : ""}`;
    indicator.title = npc.knowledge.length ? "알고 있는 사건이 있음" : "아직 기록된 사건 지식 없음";
    card.append(avatar, main, indicator);
    card.addEventListener("click", () => {
      selectedNpcId = npc.id;
      render();
    });
    list.append(card);
  }
  setText("people-count", String(state.npcs.length).padStart(2, "0"));
}

function renderSelectedNpc() {
  const npc = getNpc(selectedNpcId);
  const profile = profiles.get(npc.id)!;
  setText("selected-name", npc.name);
  setText("selected-role", npc.occupation);

  const primaryEmotion = [...npc.emotions]
    .filter((emotion) => emotion.intensity >= 0.1)
    .sort((a, b) => b.intensity - a.intensity)[0];

  if (primaryEmotion) {
    const intensity = Math.round(primaryEmotion.intensity * 100);
    setText("emotion-state", `${emotionNames[primaryEmotion.label] ?? primaryEmotion.label} · ${intensity}%`);
    const causeEvent = state.events.find((event) => event.id === primaryEmotion.causeEventId);
    setText("emotion-cause", `원인: ${causeEvent?.summary ?? primaryEmotion.causeEventId}`);
    setText("mood-chip", emotionNames[primaryEmotion.label] ?? primaryEmotion.label);
  } else {
    setText("emotion-state", "특별한 감정 없음");
    setText("emotion-cause", "감정의 원인 사건 없음");
    setText("mood-chip", "평온");
  }

  setText("knowledge-count", `${npc.knowledge.length}건`);
  const latestKnowledge = [...npc.knowledge].sort((a, b) => b.learnedAtTick - a.learnedAtTick)[0];
  setText("knowledge-source", latestKnowledge
    ? `최근 획득: ${channelNames[latestKnowledge.channel] ?? latestKnowledge.channel}`
    : "전달받은 정보 없음");
  setText("voice-style", npc.voice.styleTags.slice(0, 3).join(" · "));
  setText("voice-identity", profile.characterCore);
  const currentGoal = [...npc.goals]
    .filter((goal) => !["completed", "failed", "abandoned"].includes(goal.status))
    .sort((a, b) => b.priority - a.priority)[0] ?? [...npc.goals]
      .sort((a, b) => b.priority - a.priority)[0];
  setText("goal-state", currentGoal
    ? goalStatusNames[currentGoal.status] ?? currentGoal.status
    : "진행 중인 목표 없음");
  setText("goal-detail", currentGoal?.text ?? currentGoal?.tags.join(" · ") ?? "현재 개인 목표 없음");

  const knowledgeList = $("knowledge-list");
  knowledgeList.innerHTML = "";
  if (npc.knowledge.length === 0) {
    const empty = document.createElement("span");
    empty.className = "empty-note";
    empty.textContent = "아직 기록된 사건이 없습니다.";
    knowledgeList.append(empty);
  } else {
    for (const record of [...npc.knowledge].sort((a, b) => b.learnedAtTick - a.learnedAtTick)) {
      const row = document.createElement("div");
      row.className = "knowledge-item";
      const summary = document.createElement("span");
      summary.textContent = record.summary;
      const source = document.createElement("small");
      source.textContent = `${channelNames[record.channel] ?? record.channel} · ${Math.round(record.confidence * 100)}%`;
      row.append(summary, source);
      knowledgeList.append(row);
    }
  }
}

function renderTimeline() {
  const list = $("event-list");
  list.innerHTML = "";
  if (timeline.length === 0) {
    const item = document.createElement("li");
    item.className = "empty-note";
    item.textContent = "아직 사건이 발생하지 않았습니다.";
    list.append(item);
  } else {
    for (const entry of timeline) {
      const item = document.createElement("li");
      const time = document.createElement("span");
      time.className = "event-time";
      time.textContent = `T+${String(entry.tick).padStart(3, "0")}`;
      const text = document.createElement("span");
      text.className = "event-text";
      text.textContent = entry.text;
      item.append(time, text);
      list.append(item);
    }
  }
  setText("event-count", String(timeline.length).padStart(2, "0"));
}

function renderGoalBoard() {
  const list = $("goal-list");
  list.innerHTML = "";
  const statusOrder: Record<string, number> = {
    active: 0, delegated: 1, unresolved: 2, failed: 3, abandoned: 4, completed: 5
  };
  const goals = state.npcs.flatMap((npc) =>
    npc.goals.map((goal) => ({ npc, goal }))
  ).sort((a, b) =>
    (statusOrder[a.goal.status] ?? 9) - (statusOrder[b.goal.status] ?? 9) ||
    b.goal.priority - a.goal.priority ||
    a.npc.name.localeCompare(b.npc.name)
  );

  if (goals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "아직 개인 목표가 생성되지 않았습니다. 주민이 사건을 직접 겪거나 전해 들으면 각자의 기준에 따라 목표가 생깁니다.";
    list.append(empty);
  }

  for (const { npc, goal } of goals) {
    const card = document.createElement("article");
    card.className = `goal-card goal-${goal.status}`;
    const header = document.createElement("div");
    header.className = "goal-card-header";
    const owner = document.createElement("strong");
    owner.textContent = npc.name;
    const status = document.createElement("span");
    status.className = "goal-status";
    status.textContent = goalStatusNames[goal.status] ?? goal.status;
    header.append(owner, status);

    const title = document.createElement("p");
    title.className = "goal-card-title";
    title.textContent = goal.text ?? goal.tags.join(" · ");

    const priority = document.createElement("small");
    priority.className = "goal-priority";
    priority.textContent = `중요도 ${Math.round(goal.priority * 100)}`;

    const evidence = [...npc.knowledge]
      .filter((record) =>
        (goal.originEventIds ?? []).includes(record.eventId) ||
        goal.tags.some((tag) => record.tags.includes(tag))
      )
      .sort((a, b) => b.learnedAtTick - a.learnedAtTick)[0];

    const proof = document.createElement("div");
    proof.className = "goal-evidence";
    if (evidence) {
      const source = evidence.sourceNpcId
        ? ` · 전달자 ${state.npcs.find((item) => item.id === evidence.sourceNpcId)?.name ?? evidence.sourceNpcId}`
        : "";
      const label = document.createElement("small");
      label.textContent = `근거: ${channelNames[evidence.channel] ?? evidence.channel}${source} · 확신 ${Math.round(evidence.confidence * 100)}%`;
      const summary = document.createElement("p");
      summary.textContent = evidence.summary;
      const meter = document.createElement("div");
      meter.className = "confidence-track";
      meter.setAttribute("role", "img");
      meter.setAttribute("aria-label", `정보 확신도 ${Math.round(evidence.confidence * 100)}%`);
      const fill = document.createElement("span");
      fill.style.width = `${Math.round(Math.max(0, Math.min(1, evidence.confidence)) * 100)}%`;
      meter.append(fill);
      proof.append(label, summary, meter);
    } else {
      const label = document.createElement("small");
      label.textContent = "확인 가능한 개인 정보 근거가 없습니다.";
      proof.append(label);
    }

    const footer = document.createElement("div");
    footer.className = "goal-card-footer";
    footer.append(priority, proof);
    card.append(header, title, footer);
    list.append(card);
  }

  const activeCount = goals.filter(({ goal }) =>
    goal.status === "active" || goal.status === "delegated"
  ).length;
  setText("active-goal-count", String(activeCount).padStart(2, "0"));
  setText("known-resident-count", `${state.npcs.filter((npc) => npc.knowledge.length > 0).length}/${state.npcs.length}`);
}

let focusedNpcId: string | null = null;

function renderFocus() {
  const active = state.npcs.flatMap((npc) =>
    npc.goals
      .filter((goal) => (goal.status === "active" || goal.status === "delegated") && hasActionableGoal(npc))
      .map((goal) => ({ npc, goal }))
  ).sort((a, b) =>
    b.goal.priority - a.goal.priority || a.npc.name.localeCompare(b.npc.name)
  );
  const action = $("focus-action") as HTMLButtonElement;
  const lead = active[0];

  if (!lead) {
    focusedNpcId = null;
    setText("focus-person", "지금은 새롭게 도움을 청하는 주민이 없습니다.");
    setText("focus-goal", "마을은 현재 기록된 문제 없이 평온합니다.");
    setText("focus-reason", "새 사건이 발생하거나 주민이 정보를 얻으면 이곳에 가장 중요한 변화가 먼저 표시됩니다.");
    setText("focus-source", "개인 지식과 사건 기록을 확인합니다.");
    action.disabled = true;
    action.textContent = "현재 들을 요청 없음";
    return;
  }

  focusedNpcId = lead.npc.id;
  const evidence = [...lead.npc.knowledge]
    .filter((record) =>
      (lead.goal.originEventIds ?? []).includes(record.eventId) ||
      lead.goal.tags.some((tag) => record.tags.includes(tag))
    )
    .sort((a, b) => b.learnedAtTick - a.learnedAtTick)[0];
  setText("focus-person", `${lead.npc.name} · ${lead.npc.occupation}`);
  setText("focus-goal", lead.goal.text ?? lead.goal.tags.join(" · "));
  setText("focus-reason", evidence?.summary ?? "개인 목표에 연결된 사건 근거를 확인할 수 없습니다.");
  setText("focus-source", evidence
    ? `근거 경로: ${channelNames[evidence.channel] ?? evidence.channel} · 확신도 ${Math.round(evidence.confidence * 100)}% · 중요도 ${Math.round(lead.goal.priority * 100)}`
    : `중요도 ${Math.round(lead.goal.priority * 100)} · 근거 기록 없음`);
  action.disabled = false;
  action.textContent = `${lead.npc.name.split(" ")[0]}의 이야기 듣기`;
}

let autonomyStatus = "현재 조건에서 바로 실행할 수 있는 주민 행동이 없습니다.";

function renderAutonomy() {
  const button = $("autonomy-step") as HTMLButtonElement;
  const decision = selectNpcAction(state);
  if (!decision) {
    button.disabled = true;
    button.textContent = "실행 가능한 자율 행동 없음";
    setText("autonomy-hint", autonomyStatus);
    return;
  }

  button.disabled = false;
  button.textContent = `${decision.npcName}의 자율 행동 실행`;
  const kind = decision.kind === "self_resolve" ? "개인 목표를 스스로 해결" : "자신의 필요를 충족";
  const goal = decision.goalText ? ` · 목표: ${decision.goalText}` : "";
  const evidence = decision.evidence.length
    ? ` · 근거: ${decision.evidence.map((item) => `${channelNames[item.channel] ?? item.channel} ${Math.round(item.confidence * 100)}%`).join(", ")}`
    : "";
  const capabilities = decision.capabilities.length
    ? ` · 능력: ${decision.capabilities.map((item) => `${item.capabilityId} ${Math.round(item.proficiency * 100)}%`).join(", ")}`
    : "";
  const needs = decision.needContributions.length
    ? ` · 필요도: ${decision.needContributions.map((item) => `${item.needId} ${Math.round(item.value * 100)}%`).join(", ")}`
    : "";
  setText("autonomy-hint", `다음 행동 후보: ${decision.npcName} · ${kind}${goal}${evidence}${capabilities}${needs} · 선택 점수 ${Math.round(decision.score * 100)}`);
}

function runAutonomy() {
  const result = runNpcAutonomyStep(state);
  if (!result.ok) {
    autonomyStatus = `행동이 거부되었습니다. 세계 상태는 바뀌지 않았습니다: ${result.error}`;
    renderAutonomy();
    return;
  }
  if (!result.acted) {
    autonomyStatus = "현재 개인 목표·지식·능력·욕구 조건을 모두 충족하는 행동 후보가 없습니다.";
    renderAutonomy();
    return;
  }

  state = result.state;
  addTimeline(result.event.tick, result.event.summary, "world");
  if (lostEventId && result.event.resolvesEventIds?.includes(lostEventId)) {
    resolvedEventId = result.event.id;
  }
  autonomyStatus = `${result.decision.npcName}이(가) 스스로 행동했습니다. 선택 점수 ${Math.round(result.decision.score * 100)} · 판단 근거: ${result.decision.reason}`;
  currentDialogue = result.event.summary;
  currentTrace = `자율 행동 규칙: ${result.decision.ruleId} · 점수: ${result.decision.score.toFixed(4)} · 근거 사건: ${result.decision.evidence.map((item) => item.eventId).join(", ") || "개인 필요/상태"} · 결과: ${result.event.type}`;
  currentSpeaker = "NPC 자율 행동";
  render();
  setText("dialogue-speaker", currentSpeaker);
  setText("dialogue-text", currentDialogue);
  setText("dialogue-trace", currentTrace);
}

function render() {
  setText("world-clock", `TICK ${String(state.tick).padStart(3, "0")}`);
  renderPeople();
  renderSelectedNpc();
  renderTimeline();
  renderGoalBoard();
  renderFocus();
  renderAutonomy();

  const lost = Boolean(lostEventId);
  const resolved = Boolean(resolvedEventId);
  const bramKnows = getNpc("bram").knowledge.some((record) => record.eventId === lostEventId);
  ($("event-lost") as HTMLButtonElement).disabled = lost;
  ($("event-rumor") as HTMLButtonElement).disabled = !lost || bramKnows || resolved;
  ($("event-recovered") as HTMLButtonElement).disabled = !lost || resolved;

  const selected = getNpc(selectedNpcId);
  ($("talk-request") as HTMLButtonElement).disabled = !hasActionableGoal(selected);

  if (resolved) {
    setText("event-hint", "가방은 미라에게 돌아갔습니다. 미라의 걱정은 해소됐고, 분실 사건의 기억은 남아 있습니다.");
  } else if (bramKnows) {
    setText("event-hint", "브램은 엘렌에게 소문을 들었습니다. 직접 목격한 것처럼 말하지는 않습니다.");
  } else if (lost) {
    setText("event-hint", "미라와 엘렌만 사건을 압니다. 브램과 데인은 아직 이 일을 모릅니다.");
  } else {
    setText("event-hint", "사건을 발생시키면 직접 경험자와 목격자에게만 정보가 전달됩니다.");
  }
}

function speak(intent: DialogueRequest["intent"], topicTags: string[]) {
  const npc = getNpc(selectedNpcId);
  const request: DialogueRequest = {
    intent,
    topicTags,
    listenerName: "여행자",
    tick: state.tick
  };
  const selected = selectDialogue(npc, INN_DIALOGUE_ENTRIES, request);
  if (selected) {
    currentDialogue = selected.text;
    const sources = selected.justifiedByEventIds.length
      ? `근거 사건: ${selected.justifiedByEventIds.join(", ")}`
      : "사건 지식에 의존하지 않는 고유 대사";
    const emotions = selected.emotionCauseEventIds.length
      ? `감정 원인: ${selected.emotionCauseEventIds.join(", ")}`
      : "감정 원인 없음";
    currentTrace = `${sources} · ${emotions} · 보이스: ${npc.voice.styleTags.join(", ")}`;
    currentSpeaker = npc.name;
  } else if (topicTags.includes("lost_property")) {
    const record = npc.knowledge.find((item) => item.eventId === lostEventId);
    const completedGoal = npc.goals.some((goal) =>
      goal.id === "recover_satchel" && goal.status === "completed"
    );
    currentDialogue = completedGoal
      ? "가방은 이미 되찾았어요. 이제 찾는 일을 부탁할 필요는 없지만, 걱정해 줘서 고마워요."
      : record
        ? "그 일에 관해서는 아직 적절히 답할 말이 없네."
        : "그런 일이 있었나? 나는 그 사건에 관해 들은 게 없네.";
    currentTrace = completedGoal
      ? "목표 recover_satchel = completed · 현재 도움 요청 대사 비활성"
      : record
        ? `사건은 알고 있지만 현재 조건에 맞는 발화가 없음 · 정보 경로: ${channelNames[record.channel]}`
        : "개인 지식에 사건 기록 없음 · 대화 엔진이 미인지 사건에 관한 발화를 차단함";
    currentSpeaker = npc.name;
  } else {
    currentDialogue = "지금은 더 할 말이 없네.";
    currentTrace = "현재 조건과 일치하는 사전 작성 대사가 없음";
    currentSpeaker = npc.name;
  }

  setText("dialogue-speaker", currentSpeaker);
  setText("dialogue-text", currentDialogue);
  setText("dialogue-trace", currentTrace);
}

function triggerLostEvent() {
  const event: WorldEvent = {
    id: "event:inn:satchel-lost:001",
    tick: state.tick + 10,
    type: "lost_property",
    summary: "미라가 창가에서 일어난 뒤 가방이 사라진 것을 알아챘다.",
    tags: ["lost_property", "belongings", "inn", "satchel"],
    locationId: "inn",
    actorIds: [],
    affectedNpcIds: ["mira"],
    witnessNpcIds: ["ellen"],
    publicNoticeNpcIds: [],
    severity: 0.72,
    outcome: "harmful"
  };
  if (commitEvent(event)) {
    lostEventId = event.id;
    currentDialogue = "미라가 허리춤을 몇 번이고 확인한다. 엘렌은 그 모습을 지켜봤다.";
    currentTrace = "미라: 직접 경험 · 엘렌: 직접 목격 · 브램/데인: 지식 없음";
    currentSpeaker = "세계 사건";
    render();
    setText("dialogue-speaker", currentSpeaker);
    setText("dialogue-text", currentDialogue);
    setText("dialogue-trace", currentTrace);
  }
}

function transmitRumor() {
  const event = findLostEvent();
  if (!event) return;
  const source = getNpc("ellen");
  const recipient = getNpc("bram");
  const informed = transmitEventKnowledge(source, recipient, event, "rumor", state.tick + 1, 0.7);
  state = {
    ...state,
    tick: state.tick + 1,
    npcs: state.npcs.map((npc) => npc.id === "bram" ? informed : npc)
  };
  addTimeline(state.tick, "엘렌이 미라의 가방 분실 사실을 브램에게 소문으로 전했다.", "information");
  currentDialogue = "엘렌: “아까 미라가 가방을 잃어버린 걸 알아챘어. 창가에서 말이야.”";
  currentTrace = "정보 전달: 엘렌 → 브램 · 경로: 소문 · 확신도: 70%";
  currentSpeaker = "정보 전달";
  render();
  setText("dialogue-speaker", currentSpeaker);
  setText("dialogue-text", currentDialogue);
  setText("dialogue-trace", currentTrace);
}

function recoverSatchel() {
  if (!lostEventId) return;
  const event: WorldEvent = {
    id: "event:inn:satchel-returned:001",
    tick: state.tick + 10,
    type: "item_recovered",
    summary: "미라가 잃어버린 가방을 돌려받았다.",
    tags: ["belongings", "recovery", "satchel", "relief"],
    locationId: "inn",
    actorIds: ["mira"],
    affectedNpcIds: ["mira"],
    witnessNpcIds: ["ellen"],
    publicNoticeNpcIds: [],
    severity: 0.65,
    outcome: "beneficial",
    resolvesEventIds: [lostEventId],
    goalDeltas: [
      { npcId: "mira", goalId: "recover_satchel", status: "completed" },
      { npcId: "ellen", goalId: "help_guest", status: "completed" }
    ]
  };
  if (commitEvent(event)) {
    resolvedEventId = event.id;
    currentDialogue = "미라가 가방을 받아 들고 길게 숨을 내쉰다. 걱정은 가라앉았지만 잃어버렸던 일은 기억한다.";
    currentTrace = `해결 사건: ${event.id} · 해소 원인: ${lostEventId} · 기억은 유지됨`;
    currentSpeaker = "세계 사건";
    render();
    setText("dialogue-speaker", currentSpeaker);
    setText("dialogue-text", currentDialogue);
    setText("dialogue-trace", currentTrace);
  }
}

$("event-lost").addEventListener("click", triggerLostEvent);
$("event-rumor").addEventListener("click", transmitRumor);
$("event-recovered").addEventListener("click", recoverSatchel);
$("autonomy-step").addEventListener("click", runAutonomy);
$("talk-greet").addEventListener("click", () => speak("greeting", ["inn"]));
$("talk-event").addEventListener("click", () => speak("answer", ["lost_property", "belongings"]));
$("talk-request").addEventListener("click", () => speak("request", ["lost_property", "belongings"]));
$("focus-action").addEventListener("click", () => {
  if (!focusedNpcId) return;
  selectedNpcId = focusedNpcId;
  render();
  speak("request", ["lost_property", "belongings"]);
});

render();
