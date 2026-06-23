import { ReactNode } from 'react';

interface MachineShellProps {
  children: ReactNode;
  statusLine?: string;
  controls?: ReactNode;
  emergency?: boolean;
}

export function MachineShell({ children, statusLine = 'Machine containment acceptable', controls, emergency = false }: MachineShellProps) {
  return (
    <section className={`machine-shell${emergency ? ' machine-shell--emergency' : ''}`} aria-label="OVERTHINK-O-MATIC 5000 machine cabinet">
      <MachineMarquee statusLine={statusLine} />
      <div className="machine-operator-strip" aria-label="Machine operator status">
        <span>OPERATOR: BARRY</span>
        <span>{emergency ? 'CONTAINMENT ALERT' : 'CABINET ONLINE'}</span>
      </div>
      <MachineDisplay>{children}</MachineDisplay>
      {controls && <MachineControlDeck>{controls}</MachineControlDeck>}
    </section>
  );
}

export function MachineMarquee({ statusLine = "Let's Underthink This" }: { statusLine?: string }) {
  return (
    <div className="machine-marquee">
      <div className="cabinet-lights" aria-hidden="true"><span /><span /><span /><span /></div>
      <p className="machine-marquee__kicker">Questionable Arcade Oracle</p>
      <h1 id="app-title">OVERTHINK-O-MATIC 5000</h1>
      <div className="machine-marquee__subtitle">
        <p className="machine-marquee__tagline">Let's Underthink This</p>
        <p className="machine-marquee__status">{statusLine}</p>
      </div>
    </div>
  );
}

export function MachineDisplay({ children }: { children: ReactNode }) {
  return (
    <div className="machine-display-frame">
      <div className="machine-display-label" aria-hidden="true">PRIMARY DECISION DISPLAY</div>
      <div className="machine-display" role="region" aria-label="Machine display">{children}</div>
    </div>
  );
}

export function MachinePanel({ children, className = '', ariaLabel }: { children: ReactNode; className?: string; ariaLabel?: string }) {
  return <section className={`machine-panel ${className}`.trim()} aria-label={ariaLabel}>{children}</section>;
}

export function MachineReadout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`machine-readout ${className}`.trim()}>{children}</div>;
}

export function MachineWarning({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`machine-warning ${className}`.trim()} role="status">{children}</section>;
}

export function BarryWindow({ children }: { children: ReactNode }) {
  return <div className="barry-window" aria-label="Barry operator window">{children}</div>;
}

export function BarryStatus({ children }: { children: ReactNode }) {
  return <p className="barry-status">{children}</p>;
}

export function BarryCommentary({ children }: { children: ReactNode }) {
  return <div className="barry-commentary"><h3>Barry's Notes</h3>{children}</div>;
}

export function MachineControlDeck({ children }: { children: ReactNode }) {
  return <nav className="machine-control-deck" aria-label="Machine controls">{children}</nav>;
}

interface ProtocolModuleCardProps {
  key?: unknown;
  name: string;
  description: string;
  emblem?: string;
  disabled?: boolean;
  special?: boolean;
  onActivate: () => void;
}

export function ProtocolModuleCard({ name, description, emblem = '⚙', disabled = false, special = false, onActivate }: ProtocolModuleCardProps) {
  return (
    <article className={`protocol-module-card${special ? ' protocol-module-card--special' : ''}${disabled ? ' protocol-module-card--disabled' : ''}`}>
      <div className="protocol-emblem" aria-hidden="true">{emblem}</div>
      <div>
        <p className="module-label">LOADABLE MACHINE MODULE</p>
        <h3>{name} Protocol</h3>
        <p>{description}</p>
        <p className="protocol-eligibility">{disabled ? 'Module unavailable for these options.' : 'Module eligible and loaded.'}</p>
      </div>
      <button className={special ? 'machine-button machine-button--primary' : 'machine-button machine-button--protocol'} type="button" onClick={onActivate} disabled={disabled}>RUN {name}</button>
    </article>
  );
}
