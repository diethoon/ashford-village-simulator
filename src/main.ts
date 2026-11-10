import { commitWorldEvent } from "./core/dialogue/pipeline.js";
import { selectDialogue } from "./core/dialogue/select.js";
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
    goals: seed.id === "mira" ? [{
      id: "recover_satchel",
      tags: ["lost_property", "belongings", "travel"],
      priority: 1,
      status: "unresolved",
      text: "잃어버린 가방을 되찾아 여행을 계속한다."
    }] : seed.id === "ellen" ? [{
      id: "help_guest",
      tags: ["guests", "lost_property", "belongings", "inn"],
      priority: 0.72,
      status: "unresolved",
      text: "여관 손님이 잃어버린 짐을 찾도록 돕는다."
    }] : [],
    resources: { ...seed.resources },
    knowledge: [],
    emotions: [],
    memories: [],
    relationships: {}
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
    setText("emotion-cause", `원인: ${primaryEmotion.causeEventId}`);
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

function render() {
  setText("world-clock", `TICK ${String(state.tick).padStart(3, "0")}`);
  renderPeople();
  renderSelectedNpc();
  renderTimeline();

  const lost = Boolean(lostEventId);
  const resolved = Boolean(resolvedEventId);
  const bramKnows = getNpc("bram").knowledge.some((record) => record.eventId === lostEventId);
  ($("event-lost") as HTMLButtonElement).disabled = lost;
  ($("event-rumor") as HTMLButtonElement).disabled = !lost || bramKnows || resolved;
  ($("event-recovered") as HTMLButtonElement).disabled = !lost || resolved;

  const selected = getNpc(selectedNpcId);
  const canRequestHelp = selected.goals.some((goal) =>
    ["active", "delegated"].includes(goal.status) &&
    selected.knowledge.some((record) =>
      goal.tags.some((tag) => record.tags.includes(tag)) &&
      ["direct_experience", "direct_observation", "testimony", "rumor", "public_information"].includes(record.channel)
    )
  );
  ($("talk-request") as HTMLButtonElement).disabled = !canRequestHelp;

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
    outcome: "harmful",
    goalDeltas: [
      { npcId: "mira", goalId: "recover_satchel", status: "active" },
      { npcId: "ellen", goalId: "help_guest", status: "active" }
    ]
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
$("talk-greet").addEventListener("click", () => speak("greeting", ["inn"]));
$("talk-event").addEventListener("click", () => speak("answer", ["lost_property", "belongings"]));
$("talk-request").addEventListener("click", () => speak("request", ["lost_property", "belongings"]));

render();
