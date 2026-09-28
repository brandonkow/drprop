import React from 'react';
import { interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { Caption, Frame } from '../components/Frame';
import { ModelScene } from '../components/ModelScene';
import { PulseLine } from '../components/PulseLine';
import { safeZone } from '../layout';
import { tokens } from '../tokens';
import type { ReelProps } from '../types';

export type ReelKind = 'BrandPulse' | 'CaseOfWeek' | 'BeforeYouSign' | 'FeeReveal' | 'MarketPulse' | 'LoungeMoment' | 'StoreReveal' | 'MemberCardReveal' | 'StoreLoop';
const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const fade = (frame: number, length: number) => Math.min(interpolate(frame, [0, 24], [0, 1], clamp), interpolate(frame, [length-24, length-1], [1, 0], clamp));
function dimensions() { const { width, height } = useVideoConfig(); const zone = safeZone(width, height); return { ...zone, wide: width > height, bodyHeight: zone.height - 150 }; }
function Split({ text, model }: { text: React.ReactNode; model: (width: number, height: number) => React.ReactNode }) {
  const { width, bodyHeight, wide } = dimensions();
  return <div style={{ height: '100%', display: 'flex', flexDirection: wide ? 'row' : 'column', gap: 24, alignItems: wide ? 'center' : 'stretch' }}><div style={{ width: wide ? '48%' : '100%', flexShrink: 0 }}>{text}</div><div style={{ flex: 1, minHeight: 0 }}>{model(Math.round(wide ? width * .48 : width), Math.round(wide ? bodyHeight : bodyHeight * .56))}</div></div>;
}
export function BrandPulse(props: ReelProps) {
  const frame = useCurrentFrame(); const { durationInFrames } = useVideoConfig();
  return <Frame {...props}><Split text={<div style={{ opacity: interpolate(frame, [12, 60], [0,1], clamp) }}><Caption size={86}>We don't sell.<br />We tell.</Caption><p data-safe-text style={{ fontSize: 27, lineHeight: 1.5, marginTop: 32 }}>Independent property diagnosis.</p><div style={{ height: 140 }}><PulseLine progress={interpolate(frame, [0, durationInFrames*.25, durationInFrames*.5, durationInFrames*.85], [0,1/3,2/3,1], clamp)} phase={frame/36*Math.PI*2} /></div></div>} model={(width,height) => <ModelScene kind="pulse" width={width} height={height} fallback={props.forceModelFallback} />} /></Frame>;
}
export function CaseOfWeek(props: ReelProps) {
  const frame = useCurrentFrame(); const { durationInFrames } = useVideoConfig(); const lines = [props.caseData.hook, ...props.caseData.lines];
  const length = durationInFrames / lines.length; const index = Math.min(lines.length-1, Math.floor(frame/length));
  return <Frame {...props} label="CASE OF THE WEEK" disclaimer><Split text={<div style={{ opacity: fade(frame % length, length) }}><p data-safe-text style={{ fontFamily: 'GeistMono', fontSize: 18, marginBottom: 32 }}>{props.caseData.status === 'fictional' ? 'FICTIONAL SCENARIO' : 'ANONYMIZED CASE'} / {String(index+1).padStart(2,'0')}</p><Caption size={66}>{lines[index]}</Caption><p data-safe-text style={{ fontSize: 24, lineHeight: 1.5, marginTop: 40 }}>Bring the questions.<br />Leave with next steps.</p></div>} model={(width,height) => <ModelScene kind={props.caseData.houseType} width={width} height={height} fallback={props.forceModelFallback} highlight={props.caseData.highlight} />} /></Frame>;
}
export function BeforeYouSign(props: ReelProps) {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const lines = ['Read the title.', 'List the recurring costs.', 'Check the physical condition.', 'Understand your commitments.', 'Write down what is unresolved.'];
  const index = Math.min(4, Math.floor(frame / (5*fps)));
  return <Frame {...props} label="BEFORE YOU SIGN" disclaimer><div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><div style={{ opacity: fade(frame % (5*fps), 5*fps) }}><div data-safe-text style={{ fontFamily: 'GeistMono', fontSize: 28, marginBottom: 56 }}>{String(index+1).padStart(2,'0')} / 05</div><Caption size={82}>{lines[index]}</Caption></div><div style={{ height: 160, marginTop: 56 }}><PulseLine progress={2/3} /></div></div></Frame>;
}
export function FeeReveal(props: ReelProps) {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const options = [['Up to RM 300,000','199'],['Over RM 300,000 to RM 600,000','399'],['Over RM 600,000 to RM 1 million','699'],['Over RM 1 million to RM 2 million','1,199'],['Over RM 2 million','1,999']];
  const index = Math.min(4, Math.floor(frame / (3*fps)));
  return <Frame {...props} label="THE CONSULTATION FEE" disclaimer><div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36 }}><Caption size={68}>Clarity, with a clear fee.</Caption><div style={{ opacity: fade(frame % (3*fps), 3*fps), borderTop: `1px solid ${tokens.stone}`, paddingTop: 32 }}><p data-safe-text style={{ fontSize: 28, lineHeight: 1.4 }}>{options[index][0]}</p><div data-safe-text style={{ fontFamily: 'GeistMono', fontSize: 94, marginTop: 24 }}>RM {options[index][1]}</div></div><p data-safe-text style={{ fontSize: 22, lineHeight: 1.5 }}>Proposed standard consultation fees.<br />30 minutes. A written diagnosis included.</p></div></Frame>;
}
export function MarketPulse(props: ReelProps) {
  const frame = useCurrentFrame(); const { durationInFrames } = useVideoConfig(); const { marketData: data } = props;
  const { width, bodyHeight, wide } = dimensions(); const chartWidth = wide ? width*.53 : width; const chartHeight = wide ? bodyHeight*.55 : bodyHeight*.42;
  const values = data.series.map(item => item.value); const max = Math.max(...values)*1.12;
  const points = data.series.map((item,index) => [40 + index*(chartWidth-80)/(data.series.length-1), chartHeight-50-item.value/max*(chartHeight-100)]);
  const index = Math.min(values.length-1, Math.floor(frame/durationInFrames*values.length));
  const text = <><p data-safe-text style={{ fontFamily: 'GeistMono', fontSize: 18, marginBottom: 24 }}>{data.status === 'demo' ? 'ILLUSTRATIVE DATA' : 'OBSERVED TRANSACTIONS'} / {data.asOf}</p><Caption size={wide ? 62 : 64}>{data.title}</Caption><p data-safe-text style={{ fontSize: 22, lineHeight: 1.45 }}>{data.geography} · {data.frequency}<br />{data.metric} ({data.unit})</p></>;
  const chart = <div><svg data-safe-text width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}><line x1={40} y1={chartHeight-50} x2={chartWidth-40} y2={chartHeight-50} stroke={tokens.stone} /><text x={40} y={chartHeight-30} fontSize={17} fill={tokens.ink}>0</text><polyline points={points.map(p=>p.join(',')).join(' ')} fill="none" stroke={tokens.ink} strokeWidth={2} />{points.map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r={i===index?6:3} fill={tokens.bronze}/><text x={x} y={chartHeight-6} textAnchor="middle" fontSize={18} fill={tokens.ink}>{data.series[i].label}</text></g>)}</svg><p data-safe-text style={{ fontFamily: 'GeistMono', fontSize: 28, margin: '16px 0' }}>{data.series[index].label} / {values[index].toLocaleString('en-MY', {maximumFractionDigits: 2})}</p></div>;
  return <Frame {...props} label="MARKET PULSE" disclaimer><div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24 }}><div style={{ display:'flex', flexDirection: wide ? 'row' : 'column', gap: 24, alignItems: wide ? 'center' : 'stretch' }}><div style={{ width: wide ? '44%' : '100%' }}>{text}</div>{chart}</div><div data-safe-text style={{ fontSize: 18, lineHeight: 1.4 }}>{data.source}<br />Data through {data.asOf} · checked {data.retrievedAt}<br />Transaction value is not a house-price index.</div></div></Frame>;
}
export function LoungeMoment(props: ReelProps) {
  return <Frame {...props} label="A LOUNGE MOMENT"><Split text={<><Caption size={76}>Coffee.<br />Conversation.<br />No sales pressure.</Caption><p data-safe-text style={{ fontSize: 22, marginTop: 40, lineHeight: 1.5 }}>Pre-opening spatial concept.<br />Store details to be confirmed.</p></>} model={(width,height)=><ModelScene kind="apothecary" width={width} height={height} fallback={props.forceModelFallback}/>} /></Frame>;
}
export function StoreReveal(props: ReelProps) {
  const { width, bodyHeight } = dimensions(); const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const label = frame < 6*fps ? 'A welcome at the table.' : frame < 13*fps ? 'Room to pause.' : 'Privacy to ask.';
  return <Frame {...props} label="THE CLINIC / SPATIAL STUDY"><div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><Caption size={62}>{label}</Caption><ModelScene kind="store" width={width} height={Math.floor(bodyHeight*.65)} fallback={props.forceModelFallback}/><p data-safe-text style={{ fontSize: 22, lineHeight: 1.45, margin: 0 }}>{props.storeStatus === 'concept' ? 'Unconfirmed 96 m² concept. Not an actual store.' : 'Spatial study based on an approved plan.'}<br />Travertine, walnut, linen and warm light.</p></div></Frame>;
}
export function MemberCardReveal(props: ReelProps) {
  return <Frame {...props} dark label="THE LOUNGE CARD"><Split text={<><Caption size={76}>A place<br />to return to.</Caption><p data-safe-text style={{ fontFamily: 'GeistMono', fontSize: 25, lineHeight: 1.8, marginTop: 48 }}>DEMO 0001<br />MEMBERSHIP PREVIEW</p><p data-safe-text style={{ fontSize: 22 }}>Terms and pricing to be confirmed.</p></>} model={(width,height)=><ModelScene kind="member" width={width} height={height} fallback={props.forceModelFallback}/>} /></Frame>;
}
export function Reel({ kind, ...props }: ReelProps & { kind: ReelKind }) {
  if (kind === 'StoreLoop') return <><Sequence durationInFrames={450}><BrandPulse {...props} /></Sequence><Sequence from={450} durationInFrames={750}><MarketPulse {...props} /></Sequence></>;
  const components = { BrandPulse, CaseOfWeek, BeforeYouSign, FeeReveal, MarketPulse, LoungeMoment, StoreReveal, MemberCardReveal };
  const Component = components[kind]; return <Component {...props} />;
}
