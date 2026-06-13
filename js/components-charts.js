// ══════════════════════════════════════════════════════════
// 图表组件
// ══════════════════════════════════════════════════════════

// ── 环形图 ────────────────────────────────────────────────
function DonutChart({segments,size,centerLabel,centerSub}){
  size=size||170;
  if(!segments||segments.length===0)return null;
  const total=segments.reduce((s,d)=>s+Math.abs(d.value),0);
  if(!total)return null;
  const cx=size/2,cy=size/2,or=size*0.43,ir=size*0.27;
  let start=-Math.PI/2;
  const paths=[];
  segments.forEach(seg=>{
    const frac=Math.abs(seg.value)/total;
    if(frac<0.005)return;
    const angle=frac*2*Math.PI;
    const end=start+angle;
    const large=angle>Math.PI?1:0;
    const x1=cx+or*Math.cos(start),y1=cy+or*Math.sin(start);
    const x2=cx+or*Math.cos(end),y2=cy+or*Math.sin(end);
    const ix1=cx+ir*Math.cos(end),iy1=cy+ir*Math.sin(end);
    const ix2=cx+ir*Math.cos(start),iy2=cy+ir*Math.sin(start);
    const d=`M${x1.toFixed(1)} ${y1.toFixed(1)} A${or} ${or} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L${ix1.toFixed(1)} ${iy1.toFixed(1)} A${ir} ${ir} 0 ${large} 0 ${ix2.toFixed(1)} ${iy2.toFixed(1)}Z`;
    paths.push({...seg,d,frac});
    start=end;
  });
  return html`
    <svg width=${size} height=${size} viewBox=${'0 0 '+size+' '+size}>
      ${paths.map((p,i)=>html`<path key=${i} d=${p.d} fill=${p.color} stroke="var(--bg2)" strokeWidth="1.5" opacity="0.92"/>`)}
      ${centerLabel&&html`<text x=${cx} y=${cy+(centerSub?-5:3)} textAnchor="middle" dominantBaseline="middle" fill="var(--gold)" fontSize="13" fontFamily="var(--fh)" fontWeight="600">${centerLabel}</text>`}
      ${centerSub&&html`<text x=${cx} y=${cy+12} textAnchor="middle" fill="var(--muted)" fontSize="9">${centerSub}</text>`}
    </svg>
  `;
}

// ── 净资产柱状图 ──────────────────────────────────────────
function BarChart({snapshots}){
  if(!snapshots||snapshots.length<2)return null;
  const sorted=[...snapshots].sort((a,b)=>a.ts-b.ts).slice(-12);
  const vals=sorted.map(s=>s.amount);
  const minV=Math.min(0,...vals),maxV=Math.max(...vals);
  const range=maxV-minV||1;
  const W=360,H=90,n=sorted.length;
  const bw=Math.max(10,Math.floor((W-(n+1)*4)/n));
  const zeroY=H*(1-(0-minV)/range);
  return html`
    <svg width="100%" viewBox=${'0 0 '+W+' '+(H+22)} preserveAspectRatio="none" style=${{display:'block'}}>
      <line x1="0" y1=${zeroY.toFixed(1)} x2=${W} y2=${zeroY.toFixed(1)} stroke="var(--border2)" strokeWidth="1"/>
      ${sorted.map((s,i)=>{
        const isNeg=s.amount<0;
        const h=Math.max(2,(Math.abs(s.amount)/range)*(H*0.9));
        const x=i*(bw+4)+4;
        const y=isNeg?zeroY:H*(1-(s.amount-minV)/range);
        return html`
          <g key=${s.id}>
            <rect x=${x} y=${y.toFixed(1)} width=${bw} height=${h.toFixed(1)} fill=${isNeg?'var(--err)':'var(--gold)'} rx="2" opacity="0.75"/>
            <text x=${(x+bw/2).toFixed(1)} y=${H+15} textAnchor="middle" fill="var(--muted)" fontSize="8">${s.date.slice(5)}</text>
          </g>
        `;
      })}
    </svg>
  `;
}
