import { DecisionStatus, GameId, ShareCardData } from '../domain/model';

const gameLabels: Record<GameId, string> = {
  [GameId.CoinToss]: 'Coin Toss',
  [GameId.BestOf5]: 'Best of 5',
  [GameId.WheelOfFate]: 'Wheel of Fate',
  [GameId.GutCheck]: 'Gut Check',
  [GameId.ChaosGoblin]: 'Chaos Engine',
  [GameId.BrutalHonesty]: 'Brutal Honesty',
  [GameId.RealityChecker]: 'Reality Checker',
  [GameId.EliminationChamber]: 'Elimination Chamber',
  [GameId.BattleRoyale]: 'Battle Royale',
};

const statusLabels: Record<DecisionStatus, string> = {
  [DecisionStatus.Draft]: 'Draft',
  [DecisionStatus.Locked]: 'Accepted',
  [DecisionStatus.Lockdown]: 'DECISION LOCKED',
  [DecisionStatus.Complete]: 'Accepted',
};

interface ShareResultCardProps {
  data: ShareCardData;
}

export function ShareResultCard({ data }: ShareResultCardProps) {
  return (
    <article className="share-result-card" aria-label="Share result card">
      <div>
        <p className="share-result-card__tagline">Cursed Arcade Receipt</p>
        <h2>OVERTHINK-O-MATIC 5000</h2>
      </div>
      <section>
        <h3>Overthink</h3>
        <p>{data.decisionProblem}</p>
      </section>
      <section>
        <h3>Options</h3>
        <ul>{data.options.map((option) => <li key={option}>{option}</li>)}</ul>
      </section>
      <section>
        <h3>Protocol</h3>
        <p>{gameLabels[data.selectedGameId] ?? data.selectedGameId}</p>
      </section>
      <section>
        <h3>Final Decision</h3>
        <p className="share-result-card__decision">{data.finalAnswer}</p>
      </section>
      <section>
        <h3>Overthink Spiral</h3>
        <p>{data.isBarryTakeover || data.isSuddenDeath ? 'BARRY HAS TAKEN CONTROL' : statusLabels[data.decisionStatus]}</p>
      </section>
      <section>
        <h3>Barry's Comment</h3>
        <p>{data.machineQuote}</p>
      </section>
    </article>
  );
}
