export const DEPLOYER_ADDRESS = 'SP1RSWVNQ7TW839J8V22E9JBHTW6ZQXSNR67HTZE9';

export const CONTRACTS = {
  // Luck
  diceGame: 'dice-game',
  coinFlip: 'coin-flip',
  raffle: 'raffle',
  rockPaperScissors: 'rock-paper-scissors',

  // Logic / Math
  mastermind: 'mastermind-v3',
  numberGuessZen: 'number-guess-zen',
  numberGuessPro: 'number-guess-pro',
  hiddenFormula: 'hidden-formula',
  multiTarget: 'multi-target',

  // Casual / Social
  dailyCheckIn: 'daily-check-in',
  votingSystem: 'voting-system',
  gasMeter: 'gas-meter',
  tipJar: 'tip-jar-v2',

  // Competitive
  questSystem: 'quest-system',
} as const;

export type ContractKey = keyof typeof CONTRACTS;

export function contractId(key: ContractKey): string {
  return `${DEPLOYER_ADDRESS}.${CONTRACTS[key]}`;
}
