import { ReactNode } from 'react';
import { machineAssets } from '../assets/machineAssets';

interface MachineShellProps {
  children: ReactNode;
  statusLine?: string;
  controls?: ReactNode;
  emergency?: boolean;
  homeArt?: boolean;
  homeReset?: boolean;
  footerStatusPanels?: FooterStatusPanel[];
}

export interface FooterStatusPanel {
  label?: string;
  text?: ReactNode;
}

const defaultFooterStatusPanels: FooterStatusPanel[] = [
  { label: 'STATUS', text: 'Containment status currently acceptable' },
  { label: 'RESERVED', text: '' },
  { label: 'CAUTION', text: 'Caution — decisions in progress' },
];

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

export function MachineShell({ children, statusLine = 'Machine containment acceptable', controls, emergency = false, homeArt = false, footerStatusPanels }: MachineShellProps) {
  if (homeArt) {
    return (
      <MachineLayout>
        <MachineHeader statusLine={statusLine} />
        <main className="machine-main" role="region" aria-label="Machine display">
          {children}
        </main>
        <MachineFooter controls={controls} statusPanels={footerStatusPanels} />
      </MachineLayout>
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

export function MachineLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MachineDecor />
      <section className="machine" style={machineAssetStyle} aria-label="OVERTHINK-O-MATIC 5000 machine cabinet">
        {children}
      </section>
    </>
  );
}

export function MachineHeader({ statusLine = 'POWERED BY BARRY THE HONEY BADGER' }: { statusLine?: ReactNode }) {
  return (
    <div className="machine-header" role="banner">
      <MachineMarquee compact />
      <PoweredStrip>{statusLine}</PoweredStrip>
    </div>
  );
}

export function MachineMarquee({ compact = false }: { compact?: boolean }) {
  return (
    <div className="machine-marquee" aria-label="Machine marquee">
      {!compact && <p className="machine-marquee__kicker">Questionable Arcade Oracle</p>}
      <h1 id="app-title">OVERTHINK-O-MATIC 5000 — Let's Underthink This</h1>
      <img className="machine-marquee__logo logo" src={machineAssets.logoHeading} alt="" aria-hidden="true" />
      {!compact && <p className="machine-marquee__tagline">Let's Underthink This</p>}
    </div>
  );
}

export function PoweredStrip({ children }: { children: ReactNode }) {
  return <div className="powered-strip machine-powered-strip" aria-label="Powered-by strip"><span>{children}</span></div>;
}

export const MachinePoweredStrip = PoweredStrip;

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
  return <section className="barry-frame barry-window" aria-label="Barry operator window"><div className="barry-left">{children}</div><div className="barry-right" aria-hidden="true" /></section>;
}

export function MachineLcd({ children }: { children: ReactNode }) {
  return <section className="lcd" aria-label="Main LCD decision display"><div className="lcd__top" aria-hidden="true" /><div className="lcd__middle">{children}</div><div className="lcd__bottom" aria-hidden="true" /></section>;
}

export const MachineLcdFrame = MachineLcd;

export function MachineDecor() {
  return <div className="machine-page-decor" aria-hidden="true" style={machineAssetStyle} />;
}

export function MachinePrimaryCta({ children, type = 'button', disabled = false, className = '' }: { children: ReactNode; type?: 'button' | 'submit'; disabled?: boolean; className?: string }) {
  return <button className={`primary-cta machine-button machine-button--primary ${className}`.trim()} type={type} disabled={disabled}>{children}</button>;
}

export function MachineFooter({ controls, statusPanels = defaultFooterStatusPanels }: { controls?: ReactNode; statusPanels?: FooterStatusPanel[] }) {
  return (
    <div className="machine-footer" role="contentinfo">
      <div className="footer-frame">
        <div className="footer-frame__side footer-frame__side--left" aria-hidden="true" />
        <div className="footer-frame__top" aria-hidden="true" />
        {controls && <MachineFooterNav>{controls}</MachineFooterNav>}
        <MachineFooterStatus panels={statusPanels} />
        <div className="footer-frame__bottom" aria-hidden="true" />
        <div className="footer-frame__side footer-frame__side--right" aria-hidden="true" />
      </div>
    </div>
  );
}

export function MachineFooterNav({ children }: { children: ReactNode }) {
  return <nav className="footer-nav machine-control-deck" aria-label="Machine controls">{children}</nav>;
}

export function MachineFooterStatus({ panels = defaultFooterStatusPanels }: { panels?: FooterStatusPanel[] }) {
  return <section className="footer-status" aria-label="Machine footer status">{panels.map((panel, index) => <div className="footer-status__panel" key={`${panel.label ?? 'panel'}-${index}`}>{panel.label && <span>{panel.label}</span>}{panel.text && <p>{panel.text}</p>}</div>)}</section>;
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
