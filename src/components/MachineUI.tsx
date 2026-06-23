import { ReactNode } from 'react';

interface MachineShellProps {
  children: ReactNode;
  statusLine?: string;
  controls?: ReactNode;
  emergency?: boolean;
  homeArt?: boolean;
  homeReset?: boolean;
}

export function MachineShell({ children, statusLine = 'Machine containment acceptable', controls, emergency = false }: MachineShellProps) {
  return (
    <section className={`machine-shell${emergency ? ' machine-shell--emergency' : ''}`} aria-label="OVERTHINK-O-MATIC 5000 machine cabinet">
      <MachineMarquee />
      <MachinePoweredStrip>{statusLine}</MachinePoweredStrip>
      <MachineDisplay>{children}</MachineDisplay>
      {controls && <MachineControlDeck>{controls}</MachineControlDeck>}
    </section>
  );
}

export function MachineMarquee() {
  return (
    <div className="machine-marquee" aria-label="Machine marquee">
      <p className="machine-marquee__kicker">Questionable Arcade Oracle</p>
      <h1 id="app-title">OVERTHINK-O-MATIC 5000</h1>
      <p className="machine-marquee__tagline">Let's Underthink This</p>
    </div>
  );
}

export function MachinePoweredStrip({ children }: { children: ReactNode }) {
  return <div className="machine-powered-strip" aria-label="Powered-by strip">{children}</div>;
}

export function MachineDisplay({ children }: { children: ReactNode; homeReset?: boolean }) {
  return (
    <main className="machine-display" role="region" aria-label="Machine display">
      {children}
    </main>
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

export function BarryWindow({ children }: { children: ReactNode; art?: boolean }) {
  return <section className="barry-window" aria-label="Barry operator window">{children}</section>;
}

export function MachineLcdFrame({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function MachineDecor() {
  return null;
}

export function MachinePrimaryCta({ children, type = 'button', disabled = false }: { children: ReactNode; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button className="machine-button machine-button--primary" type={type} disabled={disabled}>{children}</button>;
}

export function BarryStatus({ children }: { children: ReactNode }) {
  return <p className="barry-status">{children}</p>;
}

export function BarryCommentary({ children }: { children: ReactNode }) {
  return <section className="barry-commentary"><h3>Barry's Notes</h3>{children}</section>;
}

export function MachineControlDeck({ children }: { children: ReactNode; art?: boolean }) {
  return <nav className="machine-control-deck" aria-label="Machine controls">{children}</nav>;
}

interface ProtocolModuleCardProps {
  key?: unknown;
  name: string;
  description: string;
  emblem?: string;
  disabled?: boolean;
  special?: boolean;
  expanded?: boolean;
  onInfoToggle: () => void;
  onActivate: () => void;
}

export function ProtocolModuleCard({ name, description, emblem, disabled = false, special = false, expanded = false, onInfoToggle, onActivate }: ProtocolModuleCardProps) {
  const detailsId = `protocol-details-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <article className={`protocol-module-card${special ? ' protocol-module-card--special' : ''}${disabled ? ' protocol-module-card--disabled' : ''}`}>
      <div className="protocol-module-card__summary">
        {emblem && <span className="protocol-emblem" aria-hidden="true">{emblem}</span>}
        <h3>{name}</h3>
        <button className="machine-button machine-button--secondary protocol-info-button" type="button" onClick={onInfoToggle} aria-expanded={expanded} aria-controls={detailsId} aria-label={`${expanded ? 'Hide' : 'Show'} ${name} protocol details`}>i</button>
        <button className={special ? 'machine-button machine-button--primary protocol-run-button' : 'machine-button machine-button--protocol protocol-run-button'} type="button" onClick={onActivate} disabled={disabled} aria-label={`Run ${name} protocol`}>RUN</button>
      </div>
      {expanded && (
        <div id={detailsId} className="protocol-module-card__details">
          <p className="module-label">LOADABLE MACHINE MODULE</p>
          <p>{description}</p>
          <p className="protocol-eligibility">{disabled ? 'Module unavailable for these options.' : 'Module eligible and loaded.'}</p>
        </div>
      )}
    </article>
  );
}
