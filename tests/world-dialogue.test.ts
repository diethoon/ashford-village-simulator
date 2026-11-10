import test from "node:test";
import assert from "node:assert/strict";
import { observeWorldEvent, transmitEventKnowledge } from "../src/core/dialogue/awareness.js";
import { decayEmotions } from "../src/core/dialogue/emotion.js";
import { selectDialogue } from "../src/core/dialogue/select.js";
import { commitWorldEvent } from "../src/core/dialogue/pipeline.js";
import type { DialogueEntry, NpcState, WorldEvent } from "../src/core/dialogue/types.js";

function makeNpc(overrides: Partial<NpcState> & Pick<NpcState, "id" | "name">): NpcState {
  const { id, name, ...rest } = overrides;
  return {
    id,
    name,
    occupation: "villager",
    traits: {
      emotionalReactivity: 0.9,
      threatSensitivity: 0.7,
      compassion: 0.5,
      pragmatism: 0.5
    },
    voice: {
      styleTags: ["measured"],
      formality: 0.5,
      bluntness: 0.5,
      warmth: 0.5
    },
    concerns: [],
    goals: [],
    resources: {},
    knowledge: [],
    emotions: [],
    memories: [],
    relationships: {},
    ...rest
  };
}

const marketFire: WorldEvent = {
  id: "event:market-fire:001",
  tick: 120,
  type: "market_fire",
  summary: "A fire spread through the market stalls.",
  tags: ["fire", "danger", "market", "livelihood", "stock"],
  locationId: "market",
  actorIds: [],
  affectedNpcIds: ["mira"],
  witnessNpcIds: ["rowan"],
  publicNoticeNpcIds: [],
  severity: 0.9,
  outcome: "harmful"
};

const dialogue: DialogueEntry[] = [
  {
    id: "mira-market-fire",
    speakerId: "mira",
    intent: "comment",
    topicTags: ["market", "fire"],
    requiredKnowledgeTags: ["fire", "market"],
    requiredEmotionLabels: ["fear"],
    requiredResources: [{ resourceId: "stock", max: 0 }],
    variants: [
      {
        id: "mira-guarded",
        requiredEmotionLabels: ["fear"],
        preferredStyleTags: ["guarded", "blunt"],
        text: "내 물건이 전부 탔어. 지금은 장사 얘기할 때가 아니야."
      },
      {
        id: "mira-calm",
        forbiddenEmotionLabels: ["fear"],
        preferredStyleTags: ["blunt"],
        text: "시장에 불이 났어. 피해부터 확인해야겠군."
      }
    ]
  },
  {
    id: "rowan-market-fire",
    speakerId: "rowan",
    intent: "comment",
    topicTags: ["market", "fire"],
    requiredKnowledgeTags: ["fire", "market"],
    variants: [
      {
        id: "rowan-measured",
        preferredStyleTags: ["measured"],
        text: "시장 쪽에서 불길이 번지는 걸 봤네. 안쪽 상황은 직접 확인하지 못했어."
      }
    ]
  },
  {
    id: "farmer-market-fire",
    speakerId: "tomas",
    intent: "comment",
    topicTags: ["market", "fire"],
    requiredKnowledgeTags: ["fire", "market"],
    variants: [
      {
        id: "tomas-informed",
        text: "시장이 불탔다고 들었네."
      }
    ]
  },
  {
    id: "mira-selling-stock",
    speakerId: "mira",
    intent: "offer",
    topicTags: ["goods"],
    requiredResources: [{ resourceId: "stock", min: 1 }],
    variants: [{ id: "mira-has-stock", text: "필요한 물건이 있으면 보여주지." }]
  }
];

test("only affected NPCs and eligible witnesses learn about a private local event", () => {
  const mira = makeNpc({ id: "mira", name: "미라", concerns: ["market", "livelihood"] });
  const rowan = makeNpc({ id: "rowan", name: "로언", concerns: ["safety"] });
  const tomas = makeNpc({ id: "tomas", name: "토마스", concerns: ["harvest"] });

  const informedMira = observeWorldEvent(mira, marketFire);
  const informedRowan = observeWorldEvent(rowan, marketFire);
  const uninformedTomas = observeWorldEvent(tomas, marketFire);

  assert.equal(informedMira.knowledge[0]?.channel, "direct_experience");
  assert.equal(informedRowan.knowledge[0]?.channel, "direct_observation");
  assert.equal(uninformedTomas.knowledge.length, 0);
  assert.equal(uninformedTomas.emotions.length, 0);
});

test("one event creates personal emotional responses with different intensity", () => {
  const shopkeeper = makeNpc({
    id: "mira",
    name: "미라",
    concerns: ["market", "livelihood"],
    goals: [{ id: "keep-shop-open", tags: ["market", "livelihood", "stock"], priority: 1, status: "active" }],
    resources: { stock: 0 },
    voice: { styleTags: ["blunt", "folksy"], formality: 0.2, bluntness: 0.9, warmth: 0.3 }
  });
  const passerby = makeNpc({
    id: "rowan",
    name: "로언",
    concerns: ["safety"],
    voice: { styleTags: ["measured"], formality: 0.8, bluntness: 0.2, warmth: 0.5 }
  });

  const miraAfter = observeWorldEvent(shopkeeper, marketFire);
  const rowanAfter = observeWorldEvent(passerby, marketFire);

  assert.equal(miraAfter.emotions[0]?.label, "fear");
  assert.equal(rowanAfter.emotions[0]?.label, "curiosity");
  assert.notEqual(miraAfter.emotions[0]?.label, rowanAfter.emotions[0]?.label);
  assert.ok((miraAfter.emotions[0]?.intensity ?? 0) > (rowanAfter.emotions[0]?.intensity ?? 0));
  assert.equal(miraAfter.memories[0]?.eventId, marketFire.id);
});

test("dialogue reflects knowledge, personal loss, current emotion and stable voice", () => {
  const mira = makeNpc({
    id: "mira",
    name: "미라",
    concerns: ["market", "livelihood"],
    goals: [{ id: "keep-shop-open", tags: ["market", "livelihood", "stock"], priority: 1, status: "active" }],
    resources: { stock: 0 },
    voice: { styleTags: ["blunt", "folksy"], formality: 0.2, bluntness: 0.9, warmth: 0.3 }
  });
  const miraAfter = observeWorldEvent(mira, marketFire);
  const selected = selectDialogue(miraAfter, dialogue, {
    intent: "comment",
    topicTags: ["market", "fire"],
    tick: 121,
    listenerName: "여행자"
  });

  assert.equal(selected?.text, "내 물건이 전부 탔어. 지금은 장사 얘기할 때가 아니야.");
  assert.deepEqual(selected?.justifiedByEventIds, [marketFire.id]);
  assert.deepEqual(selected?.emotionCauseEventIds, [marketFire.id]);
});

test("an uninformed NPC cannot select lines about an event that exists in the world", () => {
  const tomas = makeNpc({ id: "tomas", name: "토마스" });
  const selected = selectDialogue(tomas, dialogue, {
    intent: "comment",
    topicTags: ["market", "fire"],
    tick: 121
  });
  assert.equal(selected, null);
});

test("new information travels only from a source that knows the event", () => {
  const mira = observeWorldEvent(
    makeNpc({ id: "mira", name: "미라", concerns: ["market"] }),
    marketFire
  );
  const tomas = makeNpc({ id: "tomas", name: "토마스" });
  const informed = transmitEventKnowledge(mira, tomas, marketFire, "rumor", 130, 0.6);
  const uninformedSource = makeNpc({ id: "stranger", name: "낯선 이" });
  const unchanged = transmitEventKnowledge(uninformedSource, tomas, marketFire, "testimony", 131, 1);

  assert.equal(informed.knowledge[0]?.channel, "rumor");
  assert.equal(informed.knowledge[0]?.sourceNpcId, "mira");
  assert.ok((informed.knowledge[0]?.confidence ?? 1) < 1);
  assert.equal(unchanged.knowledge.length, 0);
});

test("an owner cannot offer stock after their actual stock reaches zero", () => {
  const beforeFire = makeNpc({
    id: "mira",
    name: "미라",
    resources: { stock: 4 }
  });
  const afterFire = { ...beforeFire, resources: { stock: 0 } };

  const before = selectDialogue(beforeFire, dialogue, {
    intent: "offer",
    topicTags: ["goods"],
    tick: 119
  });
  const after = selectDialogue(afterFire, dialogue, {
    intent: "offer",
    topicTags: ["goods"],
    tick: 121
  });

  assert.equal(before?.text, "필요한 물건이 있으면 보여주지.");
  assert.equal(after, null);
});

test("acute emotion decays over time while causal memory remains", () => {
  const npc = observeWorldEvent(
    makeNpc({ id: "mira", name: "미라", concerns: ["market", "livelihood"] }),
    marketFire
  );
  const after = decayEmotions(npc, 220);

  assert.ok((after.emotions[0]?.intensity ?? 1) < (npc.emotions[0]?.intensity ?? 0));
  assert.equal(after.memories[0]?.eventId, marketFire.id);
});

test("NPC voice profile remains stable when event-linked emotions change", () => {
  const npc = makeNpc({
    id: "mira",
    name: "미라",
    voice: { styleTags: ["blunt", "folksy"], formality: 0.2, bluntness: 0.9, warmth: 0.3 }
  });
  const after = observeWorldEvent(npc, marketFire);

  assert.deepEqual(after.voice, npc.voice);
  assert.ok(after.emotions.some((emotion) => emotion.label === "fear"));
});


test("a committed world change updates resources, awareness, emotion and dialogue together", () => {
  const mira = makeNpc({
    id: "mira",
    name: "미라",
    concerns: ["market", "livelihood"],
    goals: [{ id: "keep-shop-open", tags: ["market", "livelihood", "stock"], priority: 1, status: "active" }],
    resources: { stock: 4 },
    voice: { styleTags: ["blunt", "folksy"], formality: 0.2, bluntness: 0.9, warmth: 0.3 }
  });
  const rowan = makeNpc({
    id: "rowan",
    name: "로언",
    concerns: ["safety"],
    voice: { styleTags: ["measured"], formality: 0.8, bluntness: 0.2, warmth: 0.5 }
  });
  const tomas = makeNpc({ id: "tomas", name: "토마스" });
  const initial = { tick: 119, npcs: [mira, rowan, tomas], events: [] };
  const fireEvent: WorldEvent = {
    ...marketFire,
    resourceDeltas: [{ npcId: "mira", resourceId: "stock", delta: -4 }]
  };

  const result = commitWorldEvent(initial, fireEvent);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const updatedMira = result.state.npcs.find((npc) => npc.id === "mira")!;
  const updatedRowan = result.state.npcs.find((npc) => npc.id === "rowan")!;
  const updatedTomas = result.state.npcs.find((npc) => npc.id === "tomas")!;

  assert.equal(updatedMira.resources.stock, 0);
  assert.equal(updatedMira.knowledge[0]?.channel, "direct_experience");
  assert.equal(updatedMira.emotions[0]?.label, "fear");
  assert.equal(updatedRowan.emotions[0]?.label, "curiosity");
  assert.equal(updatedTomas.knowledge.length, 0);
  assert.equal(result.state.events[0]?.id, fireEvent.id);

  const comment = selectDialogue(updatedMira, dialogue, {
    intent: "comment",
    topicTags: ["market", "fire"],
    tick: 121
  });
  const offer = selectDialogue(updatedMira, dialogue, {
    intent: "offer",
    topicTags: ["goods"],
    tick: 121
  });

  assert.equal(comment?.text, "내 물건이 전부 탔어. 지금은 장사 얘기할 때가 아니야.");
  assert.equal(offer, null);
});

test("invalid world consequences are rejected atomically without partial state changes", () => {
  const mira = makeNpc({ id: "mira", name: "미라", resources: { stock: 2 } });
  const initial = { tick: 119, npcs: [mira], events: [] };
  const invalidEvent: WorldEvent = {
    ...marketFire,
    affectedNpcIds: ["mira"],
    witnessNpcIds: [],
    resourceDeltas: [{ npcId: "mira", resourceId: "stock", delta: -3 }]
  };

  const result = commitWorldEvent(initial, invalidEvent);
  assert.equal(result.ok, false);
  assert.equal(result.state, initial);
  assert.equal(initial.npcs[0]?.resources.stock, 2);
  assert.equal(initial.events.length, 0);
  assert.equal(initial.npcs[0]?.knowledge.length, 0);
});
 

test("a world betrayal changes a personal relationship and unlocks a justified response", () => {
  const mira = makeNpc({
    id: "mira",
    name: "미라",
    relationships: {
      dain: { trust: 0.8, affinity: 0.7, respect: 0.6, fear: 0 }
    },
    voice: { styleTags: ["blunt", "folksy"], formality: 0.2, bluntness: 0.9, warmth: 0.3 }
  });
  const dain = makeNpc({ id: "dain", name: "데인" });
  const betrayal: WorldEvent = {
    id: "event:betrayal:001",
    tick: 50,
    type: "betrayal",
    summary: "데인이 미라의 가방을 훔쳐 달아나려 했다.",
    tags: ["betrayal", "theft", "property", "trust"],
    actorIds: ["dain"],
    affectedNpcIds: ["mira"],
    witnessNpcIds: [],
    publicNoticeNpcIds: [],
    severity: 0.95,
    outcome: "harmful",
    relationshipDeltas: [{
      npcId: "mira",
      targetNpcId: "dain",
      trust: -0.55,
      affinity: -0.25,
      respect: -0.15
    }]
  };
  const relationshipDialogue: DialogueEntry[] = [{
    id: "mira-betrayal-response",
    speakerId: "mira",
    intent: "comment",
    topicTags: ["betrayal"],
    requiredKnowledgeEventIds: ["event:betrayal:001"],
    requiredEmotionLabels: ["anger"],
    requiredRelationship: { target: "listener", trust: { max: 0.3 } },
    variants: [{
      id: "mira-angry",
      requiredEmotionLabels: ["anger"],
      preferredStyleTags: ["blunt", "forceful"],
      text: "다신 네 말을 믿지 않아. 네가 한 짓을 기억하고 있어."
    }]
  }];
  const before = selectDialogue(mira, relationshipDialogue, {
    intent: "comment",
    topicTags: ["betrayal"],
    listenerId: "dain",
    listenerName: "데인",
    tick: 49
  });
  assert.equal(before, null);

  const committed = commitWorldEvent({
    tick: 49,
    npcs: [mira, dain],
    events: []
  }, betrayal);
  assert.equal(committed.ok, true);
  if (!committed.ok) return;

  const updatedMira = committed.state.npcs.find((npc) => npc.id === "mira")!;
  const after = selectDialogue(updatedMira, relationshipDialogue, {
    intent: "comment",
    topicTags: ["betrayal"],
    listenerId: "dain",
    listenerName: "데인",
    tick: 51
  });

  assert.equal(updatedMira.relationships.dain?.trust, 0.25);
  assert.equal(updatedMira.emotions[0]?.label, "anger");
  assert.equal(updatedMira.emotions[0]?.targetNpcId, "dain");
  assert.equal(after?.text, "다신 네 말을 믿지 않아. 네가 한 짓을 기억하고 있어.");
  assert.deepEqual(after?.justifiedByEventIds, [betrayal.id]);
});

test("an invalid relationship delta is rejected without partial world mutation", () => {
  const mira = makeNpc({
    id: "mira",
    name: "미라",
    relationships: {
      dain: { trust: 0.9, affinity: 0.5, respect: 0.5, fear: 0 }
    }
  });
  const dain = makeNpc({ id: "dain", name: "데인" });
  const invalid: WorldEvent = {
    id: "event:invalid-bond:001",
    tick: 51,
    type: "relationship_change",
    summary: "Invalid trust adjustment",
    tags: ["relationship"],
    actorIds: ["mira"],
    affectedNpcIds: ["mira"],
    witnessNpcIds: [],
    publicNoticeNpcIds: [],
    severity: 0.2,
    outcome: "neutral",
    relationshipDeltas: [{
      npcId: "mira",
      targetNpcId: "dain",
      trust: 0.2
    }]
  };
  const initial = { tick: 50, npcs: [mira, dain], events: [] };
  const result = commitWorldEvent(initial, invalid);
  assert.equal(result.ok, false);
  assert.equal(result.state, initial);
  assert.equal(initial.npcs[0]?.relationships.dain?.trust, 0.9);
  assert.equal(initial.npcs[0]?.knowledge.length, 0);
  assert.equal(initial.events.length, 0);
});
 

test("the four inn residents answer the same greeting in distinct authored voices", async () => {
  const { applyVoiceProfile, INN_DIALOGUE_ENTRIES, INN_VOICE_PROFILES } =
    await import("../src/content/inn-dialogue.js");
  const ids = ["ellen", "bram", "mira", "dain"];
  const lines = ids.map((id) => {
    const profile = INN_VOICE_PROFILES.find((item) => item.npcId === id)!;
    const npc = applyVoiceProfile(makeNpc({ id, name: id }), profile);
    const line = selectDialogue(npc, INN_DIALOGUE_ENTRIES, {
      intent: "greeting",
      topicTags: ["inn"],
      tick: 1
    });
    assert.ok(line);
    return line!.text;
  });

  assert.equal(new Set(lines).size, 4);
  assert.match(lines[0]!, /불가 쪽 자리/);
  assert.match(lines[1]!, /손이 좀 뻐근/);
  assert.match(lines[2]!, /안녕하세요/);
  assert.match(lines[3]!, /물건을 볼 거라면/);
});

test("the inn's lost-satchel event changes only informed residents' personal dialogue", async () => {
  const { applyVoiceProfile, INN_DIALOGUE_ENTRIES, INN_VOICE_PROFILES } =
    await import("../src/content/inn-dialogue.js");
  const profile = (id: string) => INN_VOICE_PROFILES.find((item) => item.npcId === id)!;
  const mira = applyVoiceProfile(makeNpc({
    id: "mira",
    name: "미라",
    goals: [{
      id: "recover_satchel",
      tags: ["lost_property", "belongings", "travel"],
      priority: 1,
      status: "active"
    }]
  }), profile("mira"));
  const ellen = applyVoiceProfile(makeNpc({ id: "ellen", name: "엘렌" }), profile("ellen"));
  const bram = applyVoiceProfile(makeNpc({ id: "bram", name: "브램" }), profile("bram"));
  const event: WorldEvent = {
    id: "event:inn:satchel-lost:001",
    tick: 11,
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
  const committed = commitWorldEvent({
    tick: 10,
    npcs: [mira, ellen, bram],
    events: []
  }, event);
  assert.equal(committed.ok, true);
  if (!committed.ok) return;

  const updatedMira = committed.state.npcs.find((npc) => npc.id === "mira")!;
  const updatedEllen = committed.state.npcs.find((npc) => npc.id === "ellen")!;
  const updatedBram = committed.state.npcs.find((npc) => npc.id === "bram")!;
  const request = {
    intent: "answer" as const,
    topicTags: ["lost_property", "belongings"],
    tick: 12
  };
  const miraLine = selectDialogue(updatedMira, INN_DIALOGUE_ENTRIES, request);
  const ellenLine = selectDialogue(updatedEllen, INN_DIALOGUE_ENTRIES, request);
  const bramLine = selectDialogue(updatedBram, INN_DIALOGUE_ENTRIES, request);

  assert.equal(updatedMira.knowledge[0]?.channel, "direct_experience");
  assert.equal(updatedEllen.knowledge[0]?.channel, "direct_observation");
  assert.equal(updatedBram.knowledge.length, 0);
  assert.equal(updatedMira.emotions[0]?.label, "worry");
  assert.equal(updatedEllen.emotions[0]?.label, "worry");
  assert.match(miraLine?.text ?? "", /누가 가져갔는지는 못 봤어요/);
  assert.match(ellenLine?.text ?? "", /누가 가져가는 건 못 봤네/);
  assert.notEqual(miraLine?.text, ellenLine?.text);
  assert.equal(bramLine, null);
});


test("resolving a world problem clears its event-linked worry and changes later dialogue", async () => {
  const { applyVoiceProfile, INN_DIALOGUE_ENTRIES, INN_VOICE_PROFILES } =
    await import("../src/content/inn-dialogue.js");
  const getProfile = (id: string) => INN_VOICE_PROFILES.find((item) => item.npcId === id)!;
  const mira = applyVoiceProfile(makeNpc({ id: "mira", name: "미라" }), getProfile("mira"));
  const ellen = applyVoiceProfile(makeNpc({ id: "ellen", name: "엘렌" }), getProfile("ellen"));
  const lost: WorldEvent = {
    id: "event:inn:satchel-lost:001",
    tick: 11,
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
  const first = commitWorldEvent({ tick: 10, npcs: [mira, ellen], events: [] }, lost);
  assert.equal(first.ok, true);
  if (!first.ok) return;

  const beforeResolve = first.state.npcs.find((npc) => npc.id === "mira")!;
  const worriedLine = selectDialogue(beforeResolve, INN_DIALOGUE_ENTRIES, {
    intent: "answer",
    topicTags: ["lost_property", "belongings"],
    tick: 12
  });
  assert.ok(worriedLine);

  const recovered: WorldEvent = {
    id: "event:inn:satchel-returned:001",
    tick: 20,
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
    resolvesEventIds: [lost.id],
    goalDeltas: [{ npcId: "mira", goalId: "recover_satchel", status: "completed" }]
  };
  const second = commitWorldEvent(first.state, recovered);
  assert.equal(second.ok, true);
  if (!second.ok) return;

  const afterResolve = second.state.npcs.find((npc) => npc.id === "mira")!;
  const laterLine = selectDialogue(afterResolve, INN_DIALOGUE_ENTRIES, {
    intent: "answer",
    topicTags: ["lost_property", "belongings"],
    tick: 21
  });

  assert.equal(afterResolve.emotions.some((emotion) => emotion.causeEventId === lost.id), false);
  assert.ok(afterResolve.emotions.some((emotion) => emotion.label === "joy" && emotion.causeEventId === recovered.id));
  assert.ok(afterResolve.memories.some((memory) => memory.eventId === lost.id));
  assert.equal(laterLine, null);
});


test("a resolution event cannot clear a cause that is absent from world history", () => {
  const mira = makeNpc({ id: "mira", name: "미라" });
  const invalidResolution: WorldEvent = {
    id: "event:invalid-resolution:001",
    tick: 2,
    type: "problem_resolved",
    summary: "An unrecorded problem is supposedly resolved.",
    tags: ["recovery"],
    actorIds: ["mira"],
    affectedNpcIds: ["mira"],
    witnessNpcIds: [],
    publicNoticeNpcIds: [],
    severity: 0.4,
    outcome: "beneficial",
    resolvesEventIds: ["event:never-happened"]
  };
  const initial = { tick: 1, npcs: [mira], events: [] };
  const result = commitWorldEvent(initial, invalidResolution);
  assert.equal(result.ok, false);
  assert.equal(result.state, initial);
  assert.equal(initial.events.length, 0);
});


test("rumor dialogue states its source and never masquerades as firsthand observation", async () => {
  const { applyVoiceProfile, INN_DIALOGUE_ENTRIES, INN_VOICE_PROFILES } =
    await import("../src/content/inn-dialogue.js");
  const profile = (id: string) => INN_VOICE_PROFILES.find((item) => item.npcId === id)!;
  const mira = applyVoiceProfile(makeNpc({
    id: "mira",
    name: "미라",
    goals: [{
      id: "recover_satchel",
      tags: ["lost_property", "belongings", "travel"],
      priority: 1,
      status: "active"
    }]
  }), profile("mira"));
  const ellen = applyVoiceProfile(makeNpc({ id: "ellen", name: "엘렌" }), profile("ellen"));
  const bram = applyVoiceProfile(makeNpc({ id: "bram", name: "브램" }), profile("bram"));
  const lost: WorldEvent = {
    id: "event:inn:satchel-lost:001",
    tick: 11,
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
  const committed = commitWorldEvent({ tick: 10, npcs: [mira, ellen, bram], events: [] }, lost);
  assert.equal(committed.ok, true);
  if (!committed.ok) return;

  const knownEllen = committed.state.npcs.find((npc) => npc.id === "ellen")!;
  const unknownBram = committed.state.npcs.find((npc) => npc.id === "bram")!;
  const request = {
    intent: "answer" as const,
    topicTags: ["lost_property", "belongings"],
    tick: 12
  };
  assert.equal(selectDialogue(unknownBram, INN_DIALOGUE_ENTRIES, request), null);

  const rumorBram = transmitEventKnowledge(knownEllen, unknownBram, lost, "rumor", 12, 0.7);
  const rumorLine = selectDialogue(rumorBram, INN_DIALOGUE_ENTRIES, request);
  assert.equal(rumorBram.knowledge[0]?.channel, "rumor");
  assert.equal(rumorBram.knowledge[0]?.confidence, 0.7);
  assert.match(rumorLine?.text ?? "", /엘렌에게 들었네만/);
  assert.match(rumorLine?.text ?? "", /직접 본 일은 아니야/);

  const testimonyBram = transmitEventKnowledge(knownEllen, unknownBram, lost, "testimony", 12, 0.7);
  const rumorOnlyLine = selectDialogue(testimonyBram, INN_DIALOGUE_ENTRIES, request);
  assert.equal(rumorOnlyLine, null);
});


test("world events update personal goals and goal state controls what an NPC says", () => {
  const mira = makeNpc({
    id: "mira",
    name: "미라",
    concerns: ["lost_property", "belongings"],
    goals: [{
      id: "recover_satchel",
      tags: ["lost_property", "belongings"],
      priority: 1,
      status: "unresolved"
    }]
  });
  const lost: WorldEvent = {
    id: "event:goal:satchel-lost:001",
    tick: 11,
    type: "lost_property",
    summary: "미라가 가방을 잃어버렸다.",
    tags: ["lost_property", "belongings", "danger"],
    actorIds: [],
    affectedNpcIds: ["mira"],
    witnessNpcIds: [],
    publicNoticeNpcIds: [],
    severity: 0.72,
    outcome: "harmful",
    goalDeltas: [{ npcId: "mira", goalId: "recover_satchel", status: "active" }]
  };
  const askForHelp: DialogueEntry[] = [{
    id: "mira-asks-help",
    speakerId: "mira",
    intent: "request",
    topicTags: ["lost_property"],
    requiredKnowledgeEventIds: [lost.id],
    requiredGoals: [{ goalId: "recover_satchel", statuses: ["active"] }],
    variants: [{ id: "mira-asks-help-line", text: "제 가방을 찾는 걸 도와주실 수 있을까요?" }]
  }];

  const before = selectDialogue(mira, askForHelp, {
    intent: "request",
    topicTags: ["lost_property"],
    tick: 10
  });
  assert.equal(before, null);

  const first = commitWorldEvent({ tick: 10, npcs: [mira], events: [] }, lost);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const activeMira = first.state.npcs[0]!;
  assert.equal(activeMira.goals[0]?.status, "active");
  const request = selectDialogue(activeMira, askForHelp, {
    intent: "request",
    topicTags: ["lost_property"],
    tick: 12
  });
  assert.equal(request?.text, "제 가방을 찾는 걸 도와주실 수 있을까요?");

  const recovered: WorldEvent = {
    id: "event:goal:satchel-returned:001",
    tick: 20,
    type: "item_recovered",
    summary: "미라가 가방을 되찾았다.",
    tags: ["belongings", "recovery"],
    actorIds: ["mira"],
    affectedNpcIds: ["mira"],
    witnessNpcIds: [],
    publicNoticeNpcIds: [],
    severity: 0.7,
    outcome: "beneficial",
    resolvesEventIds: [lost.id],
    goalDeltas: [{ npcId: "mira", goalId: "recover_satchel", status: "completed" }]
  };
  const second = commitWorldEvent(first.state, recovered);
  assert.equal(second.ok, true);
  if (!second.ok) return;
  const recoveredMira = second.state.npcs[0]!;
  assert.equal(recoveredMira.goals[0]?.status, "completed");
  assert.equal(selectDialogue(recoveredMira, askForHelp, {
    intent: "request",
    topicTags: ["lost_property"],
    tick: 21
  }), null);
});

test("goal updates reject unknown goals and illegal terminal transitions atomically", () => {
  const mira = makeNpc({
    id: "mira",
    name: "미라",
    goals: [{
      id: "recover_satchel",
      tags: ["lost_property"],
      priority: 1,
      status: "completed"
    }]
  });
  const invalid: WorldEvent = {
    id: "event:goal:invalid:001",
    tick: 2,
    type: "goal_change",
    summary: "An impossible goal transition.",
    tags: ["goal"],
    actorIds: [],
    affectedNpcIds: ["mira"],
    witnessNpcIds: [],
    publicNoticeNpcIds: [],
    severity: 0.1,
    outcome: "neutral",
    goalDeltas: [{ npcId: "mira", goalId: "recover_satchel", status: "active" }]
  };
  const initial = { tick: 1, npcs: [mira], events: [] };
  const result = commitWorldEvent(initial, invalid);
  assert.equal(result.ok, false);
  assert.equal(result.state, initial);
  assert.equal(initial.npcs[0]?.goals[0]?.status, "completed");
  assert.equal(initial.events.length, 0);
});
