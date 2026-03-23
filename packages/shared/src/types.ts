export type GameCategory = 'luck' | 'logic' | 'casual' | 'competitive';

export interface GameMeta {
  id: string;
  title: string;
  description: string;
  category: GameCategory;
  contractKey: string;
  icon?: string;
  tags?: string[];
}

// ── SSE / Chainhook event types ───────────────────────────────────────────────

export interface BaseGameEvent {
  txId: string;
  sender: string;
  success: boolean;
  gameId: string;
  functionName: string;
}

export interface DiceRollEvent extends BaseGameEvent {
  gameId: 'dice-game';
  functionName: 'roll-dice';
  userChoice: number;
}

export type GameEvent = DiceRollEvent | BaseGameEvent;
