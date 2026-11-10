import type { DialogueEntry, NpcState } from "../core/dialogue/types.js";

export interface NpcVoiceProfile {
  npcId: string;
  characterCore: string;
  stableTraits: NpcState["traits"];
  concerns: string[];
  voice: NpcState["voice"];
  conversationalHabits: string[];
  speechBoundaries: string[];
}

export const INN_VOICE_PROFILES: NpcVoiceProfile[] = [
  {
    npcId: "ellen",
    characterCore: "애쉬포드 여관 주인. 손님의 사정을 잘 살피며, 따뜻하지만 장사와 안전 문제에서는 현실적이다.",
    stableTraits: {
      emotionalReactivity: 0.55,
      threatSensitivity: 0.55,
      compassion: 0.82,
      pragmatism: 0.9
    },
    concerns: ["inn", "guests", "stock", "reputation", "safety"],
    voice: {
      styleTags: ["practical", "observant", "warm", "dry-humor"],
      formality: 0.55,
      bluntness: 0.72,
      warmth: 0.68
    },
    conversationalHabits: [
      "감상보다 지금 필요한 일을 먼저 짚는다.",
      "상대의 상태를 관찰한 뒤 조심스럽게 사정을 묻는다.",
      "짧은 현실적 농담을 하지만 타인의 불행을 농담거리로 삼지 않는다."
    ],
    speechBoundaries: [
      "직접 보지 않은 일을 목격한 것처럼 말하지 않는다.",
      "재고와 숙박 자리를 실제 수량 이상으로 약속하지 않는다."
    ]
  },
  {
    npcId: "bram",
    characterCore: "마을 목수. 말수가 적고 실용적이며, 사람과 일을 재료와 손기술에 빗대어 생각한다.",
    stableTraits: {
      emotionalReactivity: 0.4,
      threatSensitivity: 0.45,
      compassion: 0.55,
      pragmatism: 0.88
    },
    concerns: ["craft", "work", "wood", "fatigue", "weather", "orders"],
    voice: {
      styleTags: ["plainspoken", "quiet", "craftsman", "dry"],
      formality: 0.28,
      bluntness: 0.68,
      warmth: 0.42
    },
    conversationalHabits: [
      "짧고 구체적으로 말한다.",
      "목재, 도구, 날씨, 노동의 비유를 드물게 사용한다.",
      "모르는 소문에는 쉽게 동조하지 않는다."
    ],
    speechBoundaries: [
      "감정을 장황하게 설명하지 않는다.",
      "현장을 보지 않은 건축물이나 작업 상태를 단정하지 않는다."
    ]
  },
  {
    npcId: "mira",
    characterCore: "그레이포드에서 온 여행자. 예의를 지키고 신중하지만, 소중한 짐과 여정의 안전에 민감하다.",
    stableTraits: {
      emotionalReactivity: 0.78,
      threatSensitivity: 0.82,
      compassion: 0.62,
      pragmatism: 0.58
    },
    concerns: ["travel", "belongings", "safety", "route", "time", "lost_property"],
    voice: {
      styleTags: ["polite", "earnest", "softspoken", "careful"],
      formality: 0.86,
      bluntness: 0.34,
      warmth: 0.58
    },
    conversationalHabits: [
      "처음에는 정중하게 말을 꺼내고, 불안할수록 질문을 되짚는다.",
      "확인하지 못한 일은 추측으로 표현한다.",
      "도움을 받으면 고마움을 분명하게 말한다."
    ],
    speechBoundaries: [
      "누가 가방을 훔쳤다고 증거 없이 단정하지 않는다.",
      "자신이 모르는 여관 사람의 속사정을 아는 척하지 않는다."
    ]
  },
  {
    npcId: "dain",
    characterCore: "브룩필드에서 온 행상인. 말수가 적고 물건의 상태와 가격, 거래 조건을 중요하게 여긴다.",
    stableTraits: {
      emotionalReactivity: 0.32,
      threatSensitivity: 0.52,
      compassion: 0.32,
      pragmatism: 0.96
    },
    concerns: ["trade", "money", "inventory", "route", "risk", "reputation"],
    voice: {
      styleTags: ["reserved", "precise", "transactional", "skeptical"],
      formality: 0.62,
      bluntness: 0.78,
      warmth: 0.22
    },
    conversationalHabits: [
      "거래 조건과 수량을 먼저 확인한다.",
      "불필요한 수식 없이 결론부터 말한다.",
      "상대가 제시한 가격의 근거를 묻는다."
    ],
    speechBoundaries: [
      "실제 보유하지 않은 물건을 판매하겠다고 하지 않는다.",
      "거래가 성립하기 전에는 대금 지급이나 소유권 이전을 확정적으로 말하지 않는다."
    ]
  }
];

export function applyVoiceProfile(npc: NpcState, profile: NpcVoiceProfile): NpcState {
  if (npc.id !== profile.npcId) {
    throw new Error(`Voice profile ${profile.npcId} cannot be applied to NPC ${npc.id}.`);
  }

  return {
    ...npc,
    traits: { ...profile.stableTraits },
    concerns: [...new Set([...npc.concerns, ...profile.concerns])],
    voice: { ...profile.voice, styleTags: [...profile.voice.styleTags] }
  };
}

export const INN_DIALOGUE_ENTRIES: DialogueEntry[] = [
  {
    id: "ellen-greeting",
    speakerId: "ellen",
    intent: "greeting",
    topicTags: ["inn"],
    variants: [{
      id: "ellen-practical-welcome",
      preferredStyleTags: ["practical", "warm"],
      text: "어서 오게. 불가 쪽 자리는 비워 뒀어. 식사는 따뜻할 때 먹는 게 좋지."
    }]
  },
  {
    id: "bram-greeting",
    speakerId: "bram",
    intent: "greeting",
    topicTags: ["inn"],
    variants: [{
      id: "bram-quiet-welcome",
      preferredStyleTags: ["plainspoken", "quiet"],
      text: "왔나. 앉을 자리는 있네. 오늘은 손이 좀 뻐근해."
    }]
  },
  {
    id: "mira-greeting",
    speakerId: "mira",
    intent: "greeting",
    topicTags: ["inn"],
    variants: [{
      id: "mira-careful-welcome",
      preferredStyleTags: ["polite", "earnest"],
      text: "아, 안녕하세요. 잠깐 쉬어 가려던 참이었어요. 길이 생각보다 험했거든요."
    }]
  },
  {
    id: "dain-greeting",
    speakerId: "dain",
    intent: "greeting",
    topicTags: ["inn"],
    variants: [{
      id: "dain-transactional-welcome",
      preferredStyleTags: ["reserved", "precise"],
      text: "왔소? 물건을 볼 거라면 상태부터 확인하시오."
    }]
  },
  {
    id: "mira-satchel-loss",
    speakerId: "mira",
    intent: "answer",
    topicTags: ["lost_property", "belongings"],
    requiredKnowledgeEventIds: ["event:inn:satchel-lost:001"],
    requiredKnowledgeChannels: ["direct_experience"],
    requiredEmotionLabels: ["worry"],
    variants: [{
      id: "mira-worried-but-honest",
      requiredStyleTags: ["polite", "careful", "hesitant"],
      text: "제가 창가에 앉아 있다가 일어났는데, 가방이 보이지 않더라고요. 누가 가져갔는지는 못 봤어요."
    }]
  },
  {
    id: "ellen-satchel-observation",
    speakerId: "ellen",
    intent: "answer",
    topicTags: ["lost_property", "belongings"],
    requiredKnowledgeEventIds: ["event:inn:satchel-lost:001"],
    requiredKnowledgeChannels: ["direct_observation"],
    requiredEmotionLabels: ["worry"],
    variants: [{
      id: "ellen-witness-account",
      preferredStyleTags: ["observant", "practical"],
      text: "미라가 자리에서 일어나더니 빈 허리끈을 만지작거리더군. 가방이 사라진 걸 알아챈 모양이야. 누가 가져가는 건 못 봤네."
    }]
  },
  {
    id: "bram-satchel-rumor",
    speakerId: "bram",
    intent: "answer",
    topicTags: ["lost_property", "belongings"],
    requiredKnowledgeEventIds: ["event:inn:satchel-lost:001"],
    requiredKnowledgeChannels: ["rumor"],
    variants: [{
      id: "bram-rumor-not-witnessed",
      preferredStyleTags: ["plainspoken", "quiet"],
      text: "엘렌에게 들었네만, 내가 직접 본 일은 아니야. 누가 가져갔는지는 모르지."
    }]
  },
  {
    id: "bram-workday",
    speakerId: "bram",
    intent: "comment",
    topicTags: ["work", "craft"],
    variants: [{
      id: "bram-craft-observation",
      preferredStyleTags: ["craftsman", "plainspoken"],
      text: "대패날은 무뎌지면 손에 힘을 더 줘야 해. 사람도 그렇지. 쉬지 않으면 실수가 나."
    }]
  },
  {
    id: "dain-trade-terms",
    speakerId: "dain",
    intent: "answer",
    topicTags: ["trade", "goods"],
    variants: [{
      id: "dain-careful-terms",
      preferredStyleTags: ["precise", "skeptical"],
      text: "흥정은 할 수 있소. 다만 값은 물건 상태와 수량을 확인한 다음에 말하겠소."
    }]
  }
];
