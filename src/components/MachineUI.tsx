import { ReactNode } from 'react';
import { machineAssets } from '../assets/machineAssets';

interface MachineShellProps {
  children: ReactNode;
  statusLine?: string;
  controls?: ReactNode;
  emergency?: boolean;
  homeArt?: boolean;
  homeReset?: boolean;
}

const machineAssetStyle = {
  '--machine-page-left': `url(${machineAssets.pageSideLeft})`,
  '--machine-page-right': `url(${machineAssets.pageSideRight})`,
  '--machine-powered-frame': `url(${machineAssets.poweredByFrame})`,
  '--machine-barry-window-frame': `url(${machineAssets.barryWindowFrame})`,
  '--machine-lcd-top': `url(${machineAssets.inputLcdTop})`,
  '--machine-lcd-middle': `url(${machineAssets.inputLcdMiddle})`,
  '--machine-lcd-bottom': `url(${machineAssets.inputLcdBottom})`,
  '--machine-primary-cta': `url(${machineAssets.primaryCtaPink})`,
  '--machine-panel-top': `url(${machineAssets.buttonPanelFrameTop})`,
  '--machine-panel-bottom': `url(${machineAssets.buttonPanelFrameBottom})`,
  '--machine-panel-left': `url(${machineAssets.buttonPanelFrameLeft})`,
  '--machine-panel-right': `url(${machineAssets.buttonPanelFrameRight})`,
};

export function MachineShell({ children, statusLine = 'Machine containment acceptable', controls, emergency = false, homeArt = false }: MachineShellProps) {
  if (homeArt) {
    return (
      <>
        <MachineDecor />
        <section className="machine-home" style={machineAssetStyle} aria-label="OVERTHINK-O-MATIC 5000 machine cabinet">
          <div className="machine-home__header" role="banner">
            <MachineMarquee compact />
            <MachinePoweredStrip>{statusLine}</MachinePoweredStrip>
          </div>
          <main className="machine-home__main" role="region" aria-label="Machine home display">
            {children}
          </main>
          {controls && <div className="machine-home__footer" role="contentinfo"><MachineControlDeck className="machine-home__controls">{controls}</MachineControlDeck></div>}
        </section>
      </>
    );
  }

  return (
    <>
      <MachineDecor />
      <section className={`machine-shell${emergency ? ' machine-shell--emergency' : ''}`} style={machineAssetStyle} aria-label="OVERTHINK-O-MATIC 5000 machine cabinet">
        <MachineMarquee />
        <MachinePoweredStrip>{statusLine}</MachinePoweredStrip>
        <MachineDisplay>{children}</MachineDisplay>
        {controls && <MachineControlDeck>{controls}</MachineControlDeck>}
      </section>
    </>
  );
}

export function MachineMarquee({ compact = false }: { compact?: boolean }) {
  return (
    <div className="machine-marquee" aria-label="Machine marquee">
      {!compact && <p className="machine-marquee__kicker">Questionable Arcade Oracle</p>}
      <h1 id="app-title">OVERTHINK-O-MATIC 5000 — Let's Underthink This</h1>
      <img className="machine-marquee__logo" src={machineAssets.logoHeading} alt="" aria-hidden="true" />
      {!compact && <p className="machine-marquee__tagline">Let's Underthink This</p>}
    </div>
  );
}

export function MachinePoweredStrip({ children }: { children: ReactNode }) {
  return <div className="machine-powered-strip" aria-label="Powered-by strip"><span>{children}</span></div>;
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
  return <div className="machine-page-decor" aria-hidden="true" style={machineAssetStyle} />;
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

export function MachineControlDeck({ children, className = '' }: { children: ReactNode; art?: boolean; className?: string }) {
  return <nav className={`machine-control-deck ${className}`.trim()} aria-label="Machine controls">{children}</nav>;
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
