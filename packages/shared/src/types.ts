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
  userChoice: number | null;
  diceResult: number | null;
  won: boolean | null;
  pointsEarned: number | null;
}

export interface CoinFlipEvent extends BaseGameEvent {
  gameId: 'coin-flip';
  functionName: 'flip-coin';
  userChoice: number | null;
  coinResult: number | null;
  won: boolean | null;
  pointsEarned: number | null;
}

export interface RPSGameEvent extends BaseGameEvent {
  gameId: 'rock-paper-scissors';
  functionName: 'play-game';
  userChoice: number | null;
  contractChoice: number | null;
  result: 'win' | 'loss' | 'draw' | null;
  pointsEarned: number | null;
}

export type GameEvent = DiceRollEvent | CoinFlipEvent | RPSGameEvent | BaseGameEvent;
