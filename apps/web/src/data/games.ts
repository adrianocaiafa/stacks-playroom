import type { GameMeta } from '@stacks-playroom/shared'

export const GAMES: GameMeta[] = [
  // ── Luck ─────────────────────────────────────────────────────────────────
  {
    id: 'dice-game',
    title: 'Dice Game',
    description: 'Roll the dice on-chain. Bet STX and see if fortune is on your side.',
    category: 'luck',
    contractKey: 'diceGame',
    icon: '🎲',
    tags: ['dice', 'bet', 'STX'],
  },
  {
    id: 'coin-flip',
    title: 'Coin Flip',
    description: 'Heads or tails? A 50/50 on-chain coin flip with STX rewards.',
    category: 'luck',
    contractKey: 'coinFlip',
    icon: '🪙',
    tags: ['flip', 'bet', 'STX'],
  },
  {
    id: 'raffle',
    title: 'Raffle',
    description: 'Buy tickets and enter the on-chain raffle. One winner takes the pot.',
    category: 'luck',
    contractKey: 'raffle',
    icon: '🎟️',
    tags: ['raffle', 'tickets', 'STX'],
  },
  {
    id: 'rock-paper-scissors',
    title: 'Rock Paper Scissors',
    description: 'The classic game, immortalized on-chain. Commit your move and win.',
    category: 'luck',
    contractKey: 'rockPaperScissors',
    icon: '✊',
    tags: ['rps', 'classic'],
  },

  // ── Logic / Math ─────────────────────────────────────────────────────────
  {
    id: 'mastermind',
    title: 'Mastermind',
    description: 'Crack the secret code before your attempts run out.',
    category: 'logic',
    contractKey: 'mastermind',
    icon: '🔐',
    tags: ['puzzle', 'code-breaking'],
  },
  {
    id: 'number-guess-zen',
    title: 'Number Guess — Zen',
    description: 'A relaxed number guessing game. No pressure, just intuition.',
    category: 'logic',
    contractKey: 'numberGuessZen',
    icon: '🔢',
    tags: ['guess', 'numbers', 'relaxed'],
  },
  {
    id: 'number-guess-pro',
    title: 'Number Guess — Pro',
    description: 'Advanced number guessing with limited attempts and leaderboard.',
    category: 'logic',
    contractKey: 'numberGuessPro',
    icon: '🔢',
    tags: ['guess', 'numbers', 'advanced'],
  },
  {
    id: 'hidden-formula',
    title: 'Hidden Formula',
    description: 'Discover the hidden mathematical formula through experimentation.',
    category: 'logic',
    contractKey: 'hiddenFormula',
    icon: '🧮',
    tags: ['math', 'formula', 'puzzle'],
  },
  {
    id: 'multi-target',
    title: 'Multi-Target',
    description: 'Hit multiple hidden targets with limited guesses. Math meets strategy.',
    category: 'logic',
    contractKey: 'multiTarget',
    icon: '🎯',
    tags: ['targets', 'strategy', 'math'],
  },

  // ── Casual / Social ───────────────────────────────────────────────────────
  {
    id: 'daily-check-in',
    title: 'Daily Check-In',
    description: 'Check in every day to build your streak and climb the leaderboard.',
    category: 'casual',
    contractKey: 'dailyCheckIn',
    icon: '📅',
    tags: ['daily', 'streak'],
  },
  {
    id: 'voting-system',
    title: 'Voting',
    description: 'Create and participate in on-chain polls. Your vote is on the blockchain.',
    category: 'casual',
    contractKey: 'votingSystem',
    icon: '🗳️',
    tags: ['poll', 'vote', 'social'],
  },
  {
    id: 'gas-meter',
    title: 'Gas Meter',
    description: 'Send micro-transactions to measure your on-chain activity.',
    category: 'casual',
    contractKey: 'gasMeter',
    icon: '⛽',
    tags: ['activity', 'micro-tx'],
  },
  {
    id: 'tip-jar',
    title: 'Tip Jar',
    description: 'Send and receive tips in STX. Simple on-chain generosity.',
    category: 'casual',
    contractKey: 'tipJar',
    icon: '🫙',
    tags: ['tips', 'STX', 'social'],
  },

  // ── Competitive ───────────────────────────────────────────────────────────
  {
    id: 'quest-system',
    title: 'Quest System',
    description: 'Complete on-chain quests, earn milestones and climb the leaderboard.',
    category: 'competitive',
    contractKey: 'questSystem',
    icon: '⚔️',
    tags: ['quests', 'milestones', 'leaderboard'],
  },
]

export const GAMES_BY_CATEGORY = {
  luck: GAMES.filter((g) => g.category === 'luck'),
  logic: GAMES.filter((g) => g.category === 'logic'),
  casual: GAMES.filter((g) => g.category === 'casual'),
  competitive: GAMES.filter((g) => g.category === 'competitive'),
}

export const CATEGORY_META = {
  luck: {
    label: 'Luck',
    icon: '🎲',
    description: 'Games of chance. Roll, flip, and bet on-chain.',
  },
  logic: {
    label: 'Logic & Math',
    icon: '🧠',
    description: 'Puzzle-solving and number games that test your mind.',
  },
  casual: {
    label: 'Casual',
    icon: '☕',
    description: 'Chill activities, streaks, tips and social games.',
  },
  competitive: {
    label: 'Competitive',
    icon: '🏆',
    description: 'Quests and challenges with global leaderboards.',
  },
} as const
