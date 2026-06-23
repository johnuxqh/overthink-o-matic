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
  const spiralStatus = data.isBarryTakeover || data.isSuddenDeath ? 'BARRY HAS TAKEN CONTROL' : statusLabels[data.decisionStatus];

  return (
    <article className="receipt-card-blueprint" aria-label="Cursed arcade receipt">
      <div className="receipt-card-blueprint__title">
        <p>Cursed Arcade Receipt</p>
        <h2>OVERTHINK-O-MATIC 5000</h2>
      </div>

      <div className="receipt-card-blueprint__field">
        <h3 className="receipt-card-blueprint__label">Overthink</h3>
        <p className="receipt-card-blueprint__value">{data.decisionProblem}</p>
      </div>

      <div className="receipt-card-blueprint__field">
        <h3 className="receipt-card-blueprint__label">Options</h3>
        <ul className="receipt-card-blueprint__value">
          {data.options.map((option) => <li key={option}>{option}</li>)}
        </ul>
      </div>

      <div className="receipt-card-blueprint__field">
        <h3 className="receipt-card-blueprint__label">Protocol</h3>
        <p className="receipt-card-blueprint__value">{gameLabels[data.selectedGameId] ?? data.selectedGameId}</p>
      </div>

      <div className="receipt-card-blueprint__field">
        <h3 className="receipt-card-blueprint__label">Final Decision</h3>
        <p className="receipt-card-blueprint__value receipt-card-blueprint__value--decision">{data.finalAnswer}</p>
      </div>

      <div className="receipt-card-blueprint__field">
        <h3 className="receipt-card-blueprint__label">Overthink Spiral</h3>
        <p className="receipt-card-blueprint__value">{spiralStatus}</p>
      </div>

      <div className="receipt-card-blueprint__field">
        <h3 className="receipt-card-blueprint__label">Barry's Comment</h3>
        <p className="receipt-card-blueprint__value">{data.machineQuote}</p>
      </div>
    </article>
  );
}
