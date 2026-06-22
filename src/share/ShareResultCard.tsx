import { DecisionStatus, GameId, ShareCardData } from '../domain/model';

const gameLabels: Record<GameId, string> = {
  [GameId.CoinToss]: 'Coin Toss',
  [GameId.BestOf5]: 'Best of 5',
  [GameId.WheelOfFate]: 'Wheel of Fate',
  [GameId.GutCheck]: 'Gut Check',
  [GameId.ChaosGoblin]: 'Chaos Goblin',
  [GameId.BrutalHonesty]: 'Brutal Honesty',
  [GameId.RealityChecker]: 'Reality Checker',
  [GameId.EliminationChamber]: 'Elimination Chamber',
  [GameId.BattleRoyale]: 'Battle Royale',
  [GameId.SuddenDeath]: 'Sudden Death',
};

const statusLabels: Record<DecisionStatus, string> = {
  [DecisionStatus.Draft]: 'Draft',
  [DecisionStatus.Locked]: 'Accepted',
  [DecisionStatus.Lockdown]: 'Decision Locked',
  [DecisionStatus.Complete]: 'Accepted',
};

interface ShareResultCardProps {
  data: ShareCardData;
}

export function ShareResultCard({ data }: ShareResultCardProps) {
  return (
    <article className="share-result-card" aria-label="Share result card">
      <div>
        <p className="share-result-card__tagline">Let&apos;s Underthink This</p>
        <h2>OVERTHINK-O-MATIC</h2>
      </div>
      <section>
        <h3>The Overthink:</h3>
        <p>{data.decisionProblem}</p>
      </section>
      <section>
        <h3>The Options:</h3>
        <ul>{data.options.map((option) => <li key={option}>{option}</li>)}</ul>
      </section>
      <section>
        <h3>The Machine Played:</h3>
        <p>{gameLabels[data.selectedGameId] ?? data.selectedGameId}</p>
      </section>
      <section>
        <h3>The Decision:</h3>
        <p>{data.finalAnswer}</p>
      </section>
      <section>
        <h3>Status:</h3>
        <p>{data.isSuddenDeath ? 'Sudden Death' : statusLabels[data.decisionStatus]}</p>
      </section>
      <section>
        <h3>Machine says:</h3>
        <p>{data.machineQuote}</p>
      </section>
    </article>
  );
}
