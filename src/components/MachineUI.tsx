import { ReactNode } from 'react';
import { machineAssets } from '../assets/machineAssets';

interface MachineShellProps {
  children: ReactNode;
  statusLine?: string;
  controls?: ReactNode;
  emergency?: boolean;
  homeArt?: boolean;
}

export function MachineShell({ children, statusLine = 'Machine containment acceptable', controls, emergency = false, homeArt = false }: MachineShellProps) {
  const shellStyle = homeArt ? {
    '--machine-art-side-left-image': `url(${machineAssets.pageSideLeft})`,
    '--machine-art-side-right-image': `url(${machineAssets.pageSideRight})`,
  } as Record<string, string> : undefined;

  return (
    <section className={`machine-shell${emergency ? ' machine-shell--emergency' : ''}${homeArt ? ' machine-art-shell' : ''}`} style={shellStyle} aria-label="OVERTHINK-O-MATIC 5000 machine cabinet">
      {homeArt && <><span className="machine-art-side-left" aria-hidden="true" /><span className="machine-art-side-right" aria-hidden="true" /></>}
      <MachineMarquee statusLine={statusLine} art={homeArt} />
      <div className="machine-operator-strip" aria-label="Machine operator status">
        <span>OPERATOR: BARRY</span>
        <span>{emergency ? 'CONTAINMENT ALERT' : 'CABINET ONLINE'}</span>
      </div>
      <MachineDisplay>{children}</MachineDisplay>
      {controls && <MachineControlDeck art={homeArt}>{controls}</MachineControlDeck>}
    </section>
  );
}

export function MachineMarquee({ statusLine = "Let's Underthink This", art = false }: { statusLine?: string; art?: boolean }) {
  return (
    <div className={`machine-marquee${art ? ' machine-art-marquee' : ''}`.trim()}>
      <div className="cabinet-lights" aria-hidden="true"><span /><span /><span /><span /></div>
      <p className="machine-marquee__kicker">Questionable Arcade Oracle</p>
      <h1 id="app-title" className={art ? 'visually-hidden' : undefined}>OVERTHINK-O-MATIC 5000</h1>
      {art && <img className="machine-art-marquee__image" src={machineAssets.logoHeading} alt="" aria-hidden="true" />}
      <div className={`machine-marquee__subtitle${art ? ' machine-art-powered' : ''}`.trim()} style={art ? { '--machine-art-powered-image': `url(${machineAssets.poweredByFrame})` } as Record<string, string> : undefined}>
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

export function BarryWindow({ children, art = false }: { children: ReactNode; art?: boolean }) {
  return <div className={`barry-window${art ? ' machine-art-barry-window' : ''}`.trim()} style={art ? { '--machine-art-barry-window-image': `url(${machineAssets.barryWindowFrame})` } as Record<string, string> : undefined} aria-label="Barry operator window">{children}</div>;
}

export function MachineLcdFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="machine-art-lcd"
      style={{
        '--machine-art-lcd-top-image': `url(${machineAssets.inputLcdTop})`,
        '--machine-art-lcd-middle-image': `url(${machineAssets.inputLcdMiddle})`,
        '--machine-art-lcd-bottom-image': `url(${machineAssets.inputLcdBottom})`,
      } as Record<string, string>}
    >
      {children}
    </div>
  );
}

export function MachineDecor({ kind }: { kind: 'gauge' }) {
  return <img className={`machine-art-decor machine-art-decor--${kind}`} src={machineAssets.gauge} alt="" aria-hidden="true" />;
}

export function MachinePrimaryCta({ children, type = 'button', disabled = false }: { children: ReactNode; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button className="machine-button machine-button--primary machine-art-primary-cta" style={{ '--machine-art-primary-cta-image': `url(${machineAssets.primaryCtaPink})` } as Record<string, string>} type={type} disabled={disabled}>{children}</button>;
}

export function BarryStatus({ children }: { children: ReactNode }) {
  return <p className="barry-status">{children}</p>;
}

export function BarryCommentary({ children }: { children: ReactNode }) {
  return <div className="barry-commentary"><h3>Barry's Notes</h3>{children}</div>;
}

export function MachineControlDeck({ children, art = false }: { children: ReactNode; art?: boolean }) {
  return <nav className={`machine-control-deck${art ? ' machine-art-nav-frame' : ''}`.trim()} style={art ? { '--machine-art-nav-top-image': `url(${machineAssets.buttonPanelFrameTop})`, '--machine-art-nav-bottom-image': `url(${machineAssets.buttonPanelFrameBottom})`, '--machine-art-nav-left-image': `url(${machineAssets.buttonPanelFrameLeft})`, '--machine-art-nav-right-image': `url(${machineAssets.buttonPanelFrameRight})` } as Record<string, string> : undefined} aria-label="Machine controls">{children}</nav>;
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
