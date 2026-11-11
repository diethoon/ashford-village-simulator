import assert from "node:assert/strict";
import test from "node:test";
import { runNpcAutonomyStep, evaluateNpcActions, selectNpcAction } from "../src/core/agency/autonomy.js";
import { commitWorldEvent } from "../src/core/dialogue/pipeline.js";
import type { NpcActionRule, NpcState, SimulationSnapshot, WorldEvent } from "../src/core/dialogue/types.js";

function makeNpc(overrides: Partial<NpcState> & Pick<NpcState, "id" | "name">): NpcState {
  const { id, name, ...rest } = overrides;
  return {
    id,
    name,
    occupation: "villager",
    traits: { emotionalReactivity: 0.5, threatSensitivity: 0.5, compassion: 0.5, pragmatism: 0.5 },
    voice: { styleTags: ["measured"], formality: 0.5, bluntness: 0.5, warmth: 0.5 },
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

function searchRule(overrides: Partial<NpcActionRule> = {}): NpcActionRule {
  return {
    id: "search-for-satchel",
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
    durationTicks: 2,
    cooldownTicks: 1,
    result: {
      eventType: "satchel_recovered_autonomously",
      summary: "미라가 여관 구석과 짐 보관 장소를 다시 살펴 잃어버린 가방을 찾았다.",
      tags: ["satchel_recovered", "lost_property", "recovery"],
      severity: 0.65,
      outcome: "beneficial",
      goalStatus: "completed",
      resolvesGoalOriginEvents: true,
      witnessNpcIds: ["ellen"],
      additionalGoalDeltas: [{ npcId: "ellen", goalId: "help_guest", status: "completed" }],
      needDeltas: [{ npcId: "mira", needId: "security", delta: -0.6 }]
    },
    ...overrides
  };
}

function createActiveSnapshot(includeMira = true): SimulationSnapshot {
  const mira = makeNpc({
    id: "mira",
    name: "미라 펜",
    concerns: ["belongings"],
    goalRules: [{
      id: "mira-lost-property",
      goalId: "recover_satchel",
      triggerTags: ["lost_property"],
      goalTags: ["lost_property", "satchel"],
      text: "잃어버린 가방을 되찾는다.",
      priority: 1,
      minimumSeverity: 0.4,
      eligibleKnowledgeChannels: ["direct_experience"]
    }],
    goals: [],
    needs: [{ id: "security", value: 0.6 }],
    capabilities: [{ id: "search", proficiency: 0.85 }],
    actionRules: [searchRule()]
  });
  const ellen = makeNpc({
    id: "ellen",
    name: "엘렌 바우어",
    goalRules: [{
      id: "ellen-guest-care",
      goalId: "help_guest",
      triggerTags: ["lost_property"],
      goalTags: ["lost_property", "guests"],
      text: "손님이 잃어버린 짐을 찾도록 돕는다.",
      priority: 0.8,
      minimumSeverity: 0.4,
      eligibleKnowledgeChannels: ["direct_observation"]
    }],
    goals: []
  });
  const witness = includeMira ? ["ellen"] : [];
  const loss: WorldEvent = {
    id: "event:inn:satchel-lost:test",
    tick: 1,
    type: "lost_property",
    summary: "미라가 가방을 잃어버렸다.",
    tags: ["lost_property", "satchel", "inn"],
    actorIds: [],
    affectedNpcIds: includeMira ? ["mira"] : [],
    witnessNpcIds: witness,
    publicNoticeNpcIds: [],
    severity: 0.8,
    outcome: "harmful"
  };
  const committed = commitWorldEvent({
    tick: 0,
    npcs: includeMira ? [mira, ellen] : [ellen],
    events: []
  }, loss);
  assert.equal(committed.ok, true);
  if (!committed.ok) throw new Error(committed.error);
  return committed.state;
}

test("NPC autonomy selects only a personally justified action from an active goal", () => {
  const state = createActiveSnapshot();
  const decision = selectNpcAction(state);
  assert.ok(decision);
  assert.equal(decision?.npcId, "mira");
  assert.equal(decision?.goalId, "recover_satchel");
  assert.equal(decision?.evidence[0]?.eventId, "event:inn:satchel-lost:test");
  assert.equal(decision?.evidence[0]?.channel, "direct_experience");
  assert.ok(decision?.score && decision.score > 0.7);
});

test("an NPC cannot autonomously act on an event they have not learned about", () => {
  const state = createActiveSnapshot(false);
  assert.equal(evaluateNpcActions(state).length, 0);
});

test("ability, need and resource preconditions constrain candidate availability", () => {
  const state = createActiveSnapshot();
  const mira = state.npcs.find((npc) => npc.id === "mira")!;
  const withoutSkill: SimulationSnapshot = {
    ...state,
    npcs: state.npcs.map((npc) => npc.id === "mira"
      ? { ...npc, capabilities: [{ id: "search", proficiency: 0.2 }] }
      : npc)
  };
  const withoutNeed: SimulationSnapshot = {
    ...state,
    npcs: state.npcs.map((npc) => npc.id === "mira"
      ? { ...npc, needs: [{ id: "security", value: 0.1 }] }
      : npc)
  };
  const withoutResource: SimulationSnapshot = {
    ...state,
    npcs: state.npcs.map((npc) => npc.id === "mira"
      ? { ...npc, actionRules: [searchRule({ resourceCosts: { rope: 1 } })] }
      : npc)
  };
  assert.equal(selectNpcAction(withoutSkill), null);
  assert.equal(selectNpcAction(withoutNeed), null);
  assert.equal(selectNpcAction(withoutResource), null);
  assert.ok(mira);
});

test("a successful autonomous action commits the outcome, resolves its cause and updates both residents", () => {
  const state = createActiveSnapshot();
  const result = runNpcAutonomyStep(state);
  assert.equal(result.ok, true);
  if (!result.ok || !result.acted) return;

  assert.equal(result.event.actorIds[0], "mira");
  assert.deepEqual(result.event.resolvesEventIds, ["event:inn:satchel-lost:test"]);
  assert.equal(result.state.tick, 3);
  const mira = result.state.npcs.find((npc) => npc.id === "mira")!;
  const ellen = result.state.npcs.find((npc) => npc.id === "ellen")!;
  assert.equal(mira.goals.find((goal) => goal.id === "recover_satchel")?.status, "completed");
  assert.equal(ellen.goals.find((goal) => goal.id === "help_guest")?.status, "completed");
  assert.equal(mira.needs?.find((need) => need.id === "security")?.value, 0);
  assert.ok(mira.knowledge.some((record) => record.eventId === result.event.id));
  assert.ok(ellen.knowledge.some((record) => record.eventId === result.event.id && record.channel === "direct_observation"));
  assert.equal(selectNpcAction(result.state), null);
});

test("invalid autonomous outcomes fail atomically without partially completing goals", () => {
  const state = createActiveSnapshot();
  const broken: SimulationSnapshot = {
    ...state,
    npcs: state.npcs.map((npc) => npc.id === "mira"
      ? { ...npc, actionRules: [searchRule({
        result: {
          ...searchRule().result,
          additionalGoalDeltas: [{ npcId: "ellen", goalId: "missing-goal", status: "completed" }]
        }
      })] }
      : npc)
  };
  const result = runNpcAutonomyStep(broken);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.acted, false);
  assert.equal(result.state, broken);
  assert.equal(result.state.npcs.find((npc) => npc.id === "mira")?.goals[0]?.status, "active");
  assert.equal(result.state.events.length, 1);
});

test("need-maintenance actions can run without a quest and produce canonical need changes", () => {
  const restRule: NpcActionRule = {
    id: "take-rest",
    kind: "maintain_need",
    requiredNeeds: [{ needId: "fatigue", minValue: 0.7 }],
    needWeights: { fatigue: 0.5 },
    baseUtility: 0.2,
    durationTicks: 1,
    result: {
      eventType: "npc_rest",
      summary: "브램이 여관 구석에서 잠시 쉬며 피로를 풀었다.",
      tags: ["rest", "fatigue"],
      severity: 0.2,
      outcome: "beneficial",
      needDeltas: [{ npcId: "bram", needId: "fatigue", delta: -0.5 }]
    }
  };
  const bram = makeNpc({
    id: "bram",
    name: "브램 콜",
    needs: [{ id: "fatigue", value: 0.85 }],
    actionRules: [restRule]
  });
  const state: SimulationSnapshot = { tick: 4, npcs: [bram], events: [] };
  const result = runNpcAutonomyStep(state);
  assert.equal(result.ok, true);
  if (!result.ok || !result.acted) return;
  assert.equal(result.state.tick, 5);
  assert.equal(result.state.npcs[0]?.needs?.[0]?.value, 0.35);
  assert.equal(result.state.events[0]?.actionRuleId, "take-rest");
});

test("candidate ordering is stable when utility scores tie", () => {
  const state = createActiveSnapshot();
  const zed = makeNpc({
    id: "zed",
    name: "제드",
    goals: [{ id: "goal-z", tags: ["lost_property"], priority: 0.7, status: "active" }],
    needs: [{ id: "security", value: 0.6 }],
    capabilities: [{ id: "search", proficiency: 0.85 }],
    knowledge: state.npcs.find((npc) => npc.id === "mira")!.knowledge.map((record) => ({ ...record })),
    actionRules: [searchRule({ id: "zed-search", goalId: "goal-z", requiredGoalStatuses: ["active"] })]
  });
  const withTie: SimulationSnapshot = { ...state, npcs: [...state.npcs, zed] };
  const ordered = evaluateNpcActions(withTie);
  assert.deepEqual(ordered.map((item) => item.npcId), ["mira", "zed"]);
  assert.deepEqual(evaluateNpcActions(withTie).map((item) => item.ruleId), ordered.map((item) => item.ruleId));
});
