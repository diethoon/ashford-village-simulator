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
    goals: [{ id: "keep-shop-open", tags: ["market", "livelihood", "stock"], priority: 1 }],
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
    goals: [{ id: "keep-shop-open", tags: ["market", "livelihood", "stock"], priority: 1 }],
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
  const after = decayEmotions(npc, 300);

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
    goals: [{ id: "keep-shop-open", tags: ["market", "livelihood", "stock"], priority: 1 }],
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
