import { DecisionRecord, GameId, GameResult } from '../domain/model';

export interface GameDefinition {
  id: GameId;
  name: string;
  description: string;
  minimumOptions: number;
  maximumOptions?: number;
  eligibility: (decision: DecisionRecord) => boolean;
  run: (decision: DecisionRecord, now: Date) => GameResult;
}

type Option = DecisionRecord['options'][number];

function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `${prefix}_${random}`;
}

function usableOptions(decision: DecisionRecord): Option[] {
  return decision.options.filter((option) => option.text.trim().length > 0);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function baseResult(gameId: GameId, selectedOption: Option, now: Date, resultLabel: string, machineQuote: string, details: GameResult['details']): GameResult {
  return {
    id: createId('game_result'),
    gameId,
    selectedOptionId: selectedOption.id,
    selectedOption: selectedOption.text,
    resultLabel,
    machineQuote,
    details,
    createdAt: now.toISOString(),
  };
}

function hasOptionCount(decision: DecisionRecord, minimum: number, maximum?: number): boolean {
  const count = usableOptions(decision).length;
  return count >= minimum && (maximum === undefined || count <= maximum);
}

export const gameRegistry: GameDefinition[] = [
  {
    id: GameId.CoinToss,
    name: 'Coin Toss',
    description: 'A tiny binary oracle with pocket change energy.',
    minimumOptions: 2,
    maximumOptions: 2,
    eligibility: (decision) => hasOptionCount(decision, 2, 2),
    run: (decision, now) => {
      const options = usableOptions(decision);
      const side = Math.random() < 0.5 ? 'Heads' : 'Tails';
      const selectedOption = side === 'Heads' ? options[0] : options[1];
      return baseResult(GameId.CoinToss, selectedOption, now, side, `The coin landed ${side.toLowerCase()}. Very scientific.`, { coinSide: side });
    },
  },
  {
    id: GameId.BestOf5,
    name: 'Best of 5',
    description: 'Five tiny rounds because apparently one answer was too chill.',
    minimumOptions: 2,
    maximumOptions: 2,
    eligibility: (decision) => hasOptionCount(decision, 2, 2),
    run: (decision, now) => {
      const options = usableOptions(decision);
      const rounds = Array.from({ length: 5 }, (_, index) => {
        const winner = pick(options);
        return { round: index + 1, winnerOptionId: winner.id, winnerOptionText: winner.text };
      });
      const score = Object.fromEntries(options.map((option) => [option.id, rounds.filter((round) => round.winnerOptionId === option.id).length]));
      const selectedOption = options.reduce((leader, option) => (score[option.id] > score[leader.id] ? option : leader), options[0]);
      return baseResult(GameId.BestOf5, selectedOption, now, 'Majority winner', 'Five rounds later, the machine has developed a tiny opinion.', { rounds, score });
    },
  },
  {
    id: GameId.WheelOfFate,
    name: 'Wheel of Fate',
    description: 'A wheel. Some fate. Absolutely no warranty.',
    minimumOptions: 3,
    eligibility: (decision) => hasOptionCount(decision, 3),
    run: (decision, now) => {
      const options = usableOptions(decision);
      return baseResult(GameId.WheelOfFate, pick(options), now, 'Wheel stopped', 'The wheel has spoken, and it refuses to elaborate.', { wheelSegmentCount: options.length });
    },
  },
  {
    id: GameId.GutCheck,
    name: 'Gut Check',
    description: 'Pick one, then spy on your own reaction like a tiny detective.',
    minimumOptions: 2,
    eligibility: (decision) => hasOptionCount(decision, 2),
    run: (decision, now) => baseResult(GameId.GutCheck, pick(usableOptions(decision)), now, 'Gut says maybe', 'Notice your reaction. If you made a face, congratulations, data happened.', { prompt: 'Pause for two seconds and notice whether this feels relieving or annoying.' }),
  },
  {
    id: GameId.ChaosGoblin,
    name: 'Chaos Goblin',
    description: 'A silly gremlin chooses. Harmlessly. With crumbs.',
    minimumOptions: 2,
    eligibility: (decision) => hasOptionCount(decision, 2),
    run: (decision, now) => baseResult(GameId.ChaosGoblin, pick(usableOptions(decision)), now, 'Goblin pick', 'The chaos goblin bonked the table with a spoon and chose this. Somehow, that counts.', { goblinMood: 'crumbly but supportive' }),
  },
  {
    id: GameId.BrutalHonesty,
    name: 'Brutal Honesty',
    description: 'Direct, kind, and allergic to spiraling.',
    minimumOptions: 2,
    eligibility: (decision) => hasOptionCount(decision, 2),
    run: (decision, now) => baseResult(GameId.BrutalHonesty, pick(usableOptions(decision)), now, 'Kind truth', 'You probably already had enough information. This is a perfectly fine pick.', { tone: 'direct but kind' }),
  },
  {
    id: GameId.RealityChecker,
    name: 'Reality Checker',
    description: 'An imaginary sensible friend takes the wheel for one sentence.',
    minimumOptions: 2,
    eligibility: (decision) => hasOptionCount(decision, 2),
    run: (decision, now) => {
      const name = decision.realityCheckerName?.trim();
      const speaker = name ? `${name} says` : 'Your reality checker says';
      return baseResult(GameId.RealityChecker, pick(usableOptions(decision)), now, 'Reality checked', `${speaker}: just pick one.`, { realityCheckerName: name });
    },
  },
  {
    id: GameId.EliminationChamber,
    name: 'Elimination Chamber',
    description: 'Options leave politely until one remains.',
    minimumOptions: 3,
    eligibility: (decision) => hasOptionCount(decision, 3),
    run: (decision, now) => {
      const remaining = [...usableOptions(decision)];
      const eliminatedOptions: string[] = [];
      while (remaining.length > 1) {
        const eliminatedIndex = Math.floor(Math.random() * remaining.length);
        const [eliminated] = remaining.splice(eliminatedIndex, 1);
        eliminatedOptions.push(eliminated.text);
      }
      return baseResult(GameId.EliminationChamber, remaining[0], now, 'Last option standing', 'The others have been gently escorted from the premises.', { eliminatedOptions });
    },
  },
  {
    id: GameId.BattleRoyale,
    name: 'Battle Royale',
    description: 'A tiny bracket where nobody gets hurt and one option gets smug.',
    minimumOptions: 3,
    eligibility: (decision) => hasOptionCount(decision, 3),
    run: (decision, now) => {
      let contenders = [...usableOptions(decision)];
      const matchups: NonNullable<GameResult['details']['matchups']> = [];
      let round = 1;
      while (contenders.length > 1) {
        const nextRound: Option[] = [];
        for (let index = 0; index < contenders.length; index += 2) {
          const first = contenders[index];
          const second = contenders[index + 1];
          if (!second) {
            nextRound.push(first);
            matchups.push({ round, options: [first.text], winner: first.text });
            continue;
          }
          const winner = pick([first, second]);
          nextRound.push(winner);
          matchups.push({ round, options: [first.text, second.text], winner: winner.text });
        }
        contenders = nextRound;
        round += 1;
      }
      return baseResult(GameId.BattleRoyale, contenders[0], now, 'Champion', 'A champion emerges, lightly winded and very pleased with itself.', { matchups, champion: contenders[0].text });
    },
  },
];

export function getGameById(gameId: GameId): GameDefinition | undefined {
  return gameRegistry.find((game) => game.id === gameId);
}

export function getEligibleGames(decision: DecisionRecord): GameDefinition[] {
  return gameRegistry.filter((game) => game.eligibility(decision));
}
