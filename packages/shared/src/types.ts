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
