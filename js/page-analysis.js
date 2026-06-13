// ══════════════════════════════════════════════════════════
// 增值分析页
// ══════════════════════════════════════════════════════════

// 计算某时段内存款 holding 产生的利息
function holdingInterestForPeriod(h, pStart, pEnd){
  if(!h.interestRate||!h.depositType||h.depositType==='none')return 0;
  const rate=Number(h.interestRate)/100;
  const amount=Number(h.amount);
  const today=new Date();today.setHours(23,59,59,0);
  if(h.depositType==='demand'&&h.startDate){
    const s=new Date(Math.max(new Date(h.startDate),pStart));
    const e=new Date(Math.min(today,pEnd));
    const days=Math.max(0,Math.floor((e-s)/86400000));
    return amount*rate*days/365;
  }
  if(h.depositType==='fixed'&&h.startDate&&h.maturityDate){
    const hStart=new Date(h.startDate);
    const hEnd=new Date(h.maturityDate);
    const s=new Date(Math.max(hStart,pStart));
    const e=new Date(Math.min(hEnd,today,pEnd));
    const days=Math.max(0,Math.floor((e-s)/86400000));
    return amount*rate*days/365;
  }
  return 0;
}

// 计算某时段内固定收益投资应计利息
function fixedInvInterestForPeriod(inv, pStart, pEnd){
  if(!inv.annualRate||!inv.buyDate||!inv.maturityDate||inv.settled)return 0;
  const principal=Number(inv.buyPrice)*Number(inv.quantity||1);
  const rate=Number(inv.annualRate)/100;
  const today=new Date();today.setHours(23,59,59,0);
  const iStart=new Date(inv.buyDate);
  const iEnd=new Date(inv.maturityDate);
  const s=new Date(Math.max(iStart,pStart));
  const e=new Date(Math.min(iEnd,today,pEnd));
  const days=Math.max(0,Math.floor((e-s)/86400000));
  return principal*rate*days/365;
}

// 小型汇总行组件（货币 + 金额 + 子标签）
function SummaryRow({cur,amount,sub,positive}){
  const sym=CUR_SYM[cur]||'';
  const pos=positive!==false;
  return html`
    <div style=${{display:'grid',gridTemplateColumns:'52px 1fr auto',alignItems:'center',
      gap:'4px 12px',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
      <div style=${{color:'var(--gold)',fontWeight:700,fontSize:12}}>${cur}</div>
      ${sub?html`<div className="txs tm">${sub}</div>`:html`<div/>`}
      <div className=${'fn '+(pos?'pl-pos':'pl-neg')} style=${{textAlign:'right',whiteSpace:'nowrap'}}>
        ${pos?'+':''}${sym}${fmtNum(amount)}
      </div>
    </div>
  `;
}

// ── 净资产折线图 ──────────────────────────────────────────
function NetWorthLineChart({snapshots}){
  if(!snapshots||snapshots.length<2)return html`
    <div className="txs tm" style=${{textAlign:'center',padding:'20px 0',opacity:.5}}>
      至少需要 2 次净资产快照才能显示走势（在总览页点击「记录今日」）
    </div>
  `;
  const sorted=[...snapshots].sort((a,b)=>a.ts-b.ts).slice(-24);
  const vals=sorted.map(s=>s.amount);
  const minV=Math.min(...vals),maxV=Math.max(...vals);
  const range=maxV-minV||1;
  const W=460,H=130,PL=58,PR=12,PT=12,PB=28;
  const cW=W-PL-PR,cH=H-PT-PB;
  const n=sorted.length;
  const xS=i=>PL+(i/(n-1))*cW;
  const yS=v=>PT+cH-(v-minV)/range*cH;
  const pathD=sorted.map((s,i)=>`${i===0?'M':'L'}${xS(i).toFixed(1)},${yS(s.amount).toFixed(1)}`).join(' ');
  // 填充区域
  const fillD=pathD+` L${xS(n-1).toFixed(1)},${(PT+cH).toFixed(1)} L${xS(0).toFixed(1)},${(PT+cH).toFixed(1)}Z`;
  const isUp=sorted[n-1].amount>=sorted[0].amount;
  const lineColor=isUp?'#52C87A':'#F08080';
  const sym=sorted[n-1].currency?CUR_SYM[sorted[n-1].currency]||'':'';
  const yTicks=[minV,(minV+maxV)/2,maxV];
  // x轴标签：首、中、尾
  const xIdxs=[0,...(n>2?[Math.floor((n-1)/2)]:[]),n-1].filter((v,i,a)=>a.indexOf(v)===i);

  return html`
    <div>
      <svg viewBox="0 0 ${W} ${H}" style=${{width:'100%',height:'auto',display:'block'}}>
        <defs>
          <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor=${lineColor} stopOpacity="0.25"/>
            <stop offset="100%" stopColor=${lineColor} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        ${yTicks.map(v=>html`
          <line x1=${PL} y1=${yS(v).toFixed(1)} x2=${W-PR} y2=${yS(v).toFixed(1)}
            stroke="rgba(128,128,128,.1)" strokeWidth="1"/>
          <text x=${PL-6} y=${(yS(v)+4).toFixed(1)} textAnchor="end" fontSize="9" fill="var(--muted)">
            ${fmtNum(v,0)}
          </text>
        `)}
        <path d=${fillD} fill="url(#nwGrad)"/>
        <path d=${pathD} fill="none" stroke=${lineColor} strokeWidth="2" strokeLinejoin="round"/>
        ${sorted.map((s,i)=>html`
          <circle key=${i} cx=${xS(i).toFixed(1)} cy=${yS(s.amount).toFixed(1)}
            r="3" fill=${lineColor} stroke="var(--bg2)" strokeWidth="1.5"/>
        `)}
        ${xIdxs.map(i=>html`
          <text key=${i} x=${xS(i).toFixed(1)} y=${H-4} textAnchor="middle"
            fontSize="9" fill="var(--muted)">${sorted[i].date.slice(5)}</text>
        `)}
      </svg>
      <div className="fc g16 mt4" style=${{justifyContent:'center'}}>
        <div className="txs tm">
          首：<span style=${{color:'var(--gold)'}}>${sym}${fmtNum(sorted[0].amount,0)}</span>
        </div>
        <div className="txs tm">
          末：<span style=${{color:'var(--gold)'}}>${sym}${fmtNum(sorted[n-1].amount,0)}</span>
        </div>
        <div class="txs" style=${{color:isUp?'var(--ok)':'var(--err)'}}>
          ${isUp?'▲':'▼'} ${sym}${fmtNum(Math.abs(sorted[n-1].amount-sorted[0].amount),0)}
          （${fmtNum(Math.abs((sorted[n-1].amount-sorted[0].amount)/Math.abs(sorted[0].amount||1)*100),1)}%）
        </div>
      </div>
    </div>
  `;
}

// ── 投资收益率排行 ────────────────────────────────────────
function InvRanking({investments}){
  const items=investments
    .filter(inv=>(inv.category||'variable')==='variable'&&!inv.cleared)
    .map(inv=>{
      const pos=calcEffectivePosition(inv);
      const mv=inv.currentPrice!=null?Number(inv.currentPrice)*pos.effectiveQty:null;
      const pl=mv!==null?mv-pos.totalCost:null;
      const plPct=pl!==null&&pos.totalCost>0?pl/pos.totalCost*100:null;
      const days=inv.buyDate?Math.max(1,Math.floor((new Date()-new Date(inv.buyDate))/86400000)):null;
      const ann=(plPct!=null&&days!=null&&days>=1&&(1+plPct/100)>0)
        ?(Math.pow(1+plPct/100,365/days)-1)*100:null;
      return{inv,pos,mv,pl,plPct,ann,days};
    })
    .filter(x=>x.plPct!==null)
    .sort((a,b)=>(b.ann??b.plPct)-(a.ann??a.plPct));

  if(items.length===0)return html`
    <div className="txs tm" style=${{textAlign:'center',padding:'16px 0',opacity:.5}}>
      暂无含现价的非固定收益持仓
    </div>
  `;

  return html`
    <div style=${{display:'flex',flexDirection:'column',gap:6}}>
      ${items.map((x,rank)=>{
        const{inv,pos,pl,plPct,ann,days}=x;
        const sym=CUR_SYM[inv.currency]||'';
        const pos2=pl>=0;
        return html`
          <div key=${inv.id} style=${{
            background:'var(--bg3)',borderRadius:8,padding:'10px 14px',
            display:'grid',gridTemplateColumns:'24px 1fr auto',gap:'0 12px',alignItems:'center'
          }}>
            <div style=${{
              fontSize:12,fontWeight:700,color:rank<3?'var(--gold)':'var(--muted)',
              textAlign:'center'
            }}>${rank+1}</div>
            <div>
              <div style=${{fontSize:13,fontWeight:500}}>${inv.name}</div>
              <div className="txs tm mt2">
                ${inv.ticker?html`<span style=${{marginRight:8}}>${inv.ticker}</span>`:''}
                持有 ${days} 天 · 成本 ${sym}${fmtNum(pos.totalCost,0)}
              </div>
            </div>
            <div style=${{textAlign:'right'}}>
              <div className=${'fn '+(pos2?'pl-pos':'pl-neg')} style=${{fontSize:14}}>
                ${pos2?'+':''}${fmtNum(plPct,2)}%
              </div>
              ${ann!==null?html`
                <div className=${'txs '+(pos2?'pl-pos':'pl-neg')}>
                  年化 ${pos2?'+':''}${fmtNum(ann,1)}%
                </div>
              `:''}
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

function AnalysisPage({data}){
  const today=new Date().toISOString().slice(0,10);
  const thisMonthStart=today.slice(0,7)+'-01';
  const thisYearStart=today.slice(0,4)+'-01-01';
  const [preset,setPreset]=useState('month');
  const [cStart,setCStart]=useState(thisMonthStart);
  const [cEnd,setCEnd]=useState(today);

  const {pStartStr,pEndStr}=useMemo(()=>{
    if(preset==='month') return{pStartStr:thisMonthStart,pEndStr:today};
    if(preset==='quarter'){
      const m=new Date(today).getMonth();
      const qs=new Date(new Date(today).getFullYear(),Math.floor(m/3)*3,1).toISOString().slice(0,10);
      return{pStartStr:qs,pEndStr:today};
    }
    if(preset==='year') return{pStartStr:thisYearStart,pEndStr:today};
    if(preset==='last12'){
      const s=new Date(today);s.setMonth(s.getMonth()-12);
      return{pStartStr:s.toISOString().slice(0,10),pEndStr:today};
    }
    return{pStartStr:cStart,pEndStr:cEnd};
  },[preset,cStart,cEnd,today]);

  const pStart=useMemo(()=>{const d=new Date(pStartStr);d.setHours(0,0,0,0);return d;},[pStartStr]);
  const pEnd=useMemo(()=>{const d=new Date(pEndStr);d.setHours(23,59,59,999);return d;},[pEndStr]);

  // ── 1. 存款利息（期间）──────────────────────────────────
  const depositMap=useMemo(()=>{
    const map={};
    data.accounts.forEach(acc=>{
      (acc.holdings||[]).forEach(h=>{
        const v=holdingInterestForPeriod(h,pStart,pEnd);
        if(v<=0)return;
        const cur=h.currency;
        if(!map[cur])map[cur]={amount:0,items:[]};
        map[cur].amount+=v;
        map[cur].items.push({name:acc.name,rate:h.interestRate,type:h.depositType});
      });
    });
    return map;
  },[data.accounts,pStart,pEnd]);

  // ── 2. 固定收益投资应计利息（期间）──────────────────────
  const fixedInvMap=useMemo(()=>{
    const map={};
    data.investments.filter(i=>(i.category||'variable')==='fixed').forEach(inv=>{
      const v=fixedInvInterestForPeriod(inv,pStart,pEnd);
      if(v<=0)return;
      const cur=inv.currency;
      if(!map[cur])map[cur]={amount:0,items:[]};
      map[cur].amount+=v;
      map[cur].items.push(inv.name);
    });
    return map;
  },[data.investments,pStart,pEnd]);

  // ── 3. 非固定收益（当前快照）─────────────────────────────
  const varMap=useMemo(()=>{
    const map={};
    data.investments.filter(i=>(i.category||'variable')==='variable'&&!i.cleared).forEach(inv=>{
      const pos=calcEffectivePosition(inv);
      const cur=inv.currency;
      if(!map[cur])map[cur]={unrealized:0,cost:0,market:0,realizedPL:0};
      map[cur].cost+=pos.totalCost;
      map[cur].realizedPL+=pos.realizedPL;
      if(inv.currentPrice!=null)map[cur].market+=Number(inv.currentPrice)*pos.effectiveQty;
      else map[cur].market+=pos.totalCost;
    });
    Object.values(map).forEach(s=>{s.unrealized=s.market-s.cost;});
    return map;
  },[data.investments]);

  // ── 4. 期间分红收入 ───────────────────────────────────────
  const divMap=useMemo(()=>{
    const map={};
    data.investments.filter(i=>(i.category||'variable')==='variable').forEach(inv=>{
      (inv.dividends||[]).forEach(d=>{
        if(!d.date)return;
        const dDate=new Date(d.date);dDate.setHours(0,0,0,0);
        if(dDate<pStart||dDate>pEnd)return;
        const cur=inv.currency;
        if(!map[cur])map[cur]={amount:0,count:0};
        map[cur].amount+=Number(d.amount);
        map[cur].count++;
      });
    });
    return map;
  },[data.investments,pStart,pEnd]);

  // ── 5. 期间支出 ───────────────────────────────────────────
  const expMap=useMemo(()=>{
    const map={};
    (data.expenses||[]).forEach(e=>{
      if(!e.date)return;
      const eDate=new Date(e.date);eDate.setHours(0,0,0,0);
      if(eDate<pStart||eDate>pEnd)return;
      const cur=e.currency;
      if(!map[cur])map[cur]={amount:0,count:0,byCat:{}};
      map[cur].amount+=Number(e.amount);
      map[cur].count++;
      map[cur].byCat[e.category]=(map[cur].byCat[e.category]||0)+Number(e.amount);
    });
    return map;
  },[data.expenses,pStart,pEnd]);

  // ── 确定性增值合计（存款+固定收益+分红）──────────────────
  const certainMap=useMemo(()=>{
    const map={};
    const add=(cur,v)=>{if(v>0){if(!map[cur])map[cur]=0;map[cur]+=v;}};
    Object.entries(depositMap).forEach(([cur,s])=>add(cur,s.amount));
    Object.entries(fixedInvMap).forEach(([cur,s])=>add(cur,s.amount));
    Object.entries(divMap).forEach(([cur,s])=>add(cur,s.amount));
    return map;
  },[depositMap,fixedInvMap,divMap]);

  // ── 净收益（确定性增值 - 支出）────────────────────────────
  const netMap=useMemo(()=>{
    const allCurs=new Set([...Object.keys(certainMap),...Object.keys(expMap)]);
    const map={};
    allCurs.forEach(cur=>{
      const income=certainMap[cur]||0;
      const expense=expMap[cur]?.amount||0;
      map[cur]={income,expense,net:income-expense};
    });
    return map;
  },[certainMap,expMap]);

  // ── 支出分类饼图数据 ──────────────────────────────────────
  const expPieData=useMemo(()=>{
    const byCat={};
    (data.expenses||[]).forEach(e=>{
      if(!e.date)return;
      const eDate=new Date(e.date);eDate.setHours(0,0,0,0);
      if(eDate<pStart||eDate>pEnd)return;
      byCat[e.category]=(byCat[e.category]||0)+Number(e.amount);
    });
    return Object.entries(byCat)
      .sort((a,b)=>b[1]-a[1])
      .map(([cat,value])=>({label:cat,value,color:EXPENSE_CAT_COLORS[cat]||'#888'}));
  },[data.expenses,pStart,pEnd]);

  const hasData=Object.keys(depositMap).length||Object.keys(fixedInvMap).length||
    Object.keys(varMap).length||Object.keys(divMap).length;

  const PRESETS=[
    {id:'month',label:'本月'},
    {id:'quarter',label:'本季'},
    {id:'year',label:'今年'},
    {id:'last12',label:'近12月'},
    {id:'custom',label:'自定义'},
  ];

  const snapshots=data.snapshots||[];

  return html`
    <div>
      <div className="fb mb20" style=${{flexWrap:'wrap',gap:10}}>
        <div><div className="pg-title">增值分析</div>
          <div className="pg-sub">净资产走势 · 收益分析 · 支出分类</div>
        </div>
      </div>

      <!-- 净资产走势 -->
      <div className="card mb14">
        <div className="fc g8 mb12">
          <span style=${{fontSize:15}}>📉</span>
          <span className="fw6 ts">净资产走势</span>
          <span className="txs tm">最近 ${Math.min(snapshots.length,24)} 次快照</span>
        </div>
        <${NetWorthLineChart} snapshots=${snapshots}/>
      </div>

      <!-- 时间范围 -->
      <div className="card mb14" style=${{padding:'14px 18px'}}>
        <div className="fc g6 mb10" style=${{flexWrap:'wrap'}}>
          ${PRESETS.map(p=>html`
            <button key=${p.id}
              className=${'btn btn-sm '+(preset===p.id?'btn-gold':'btn-ghost')}
              onClick=${()=>setPreset(p.id)}>${p.label}</button>
          `)}
        </div>
        ${preset==='custom'?html`
          <div className="modal-row" style=${{marginBottom:0}}>
            <div className="inp-group" style=${{margin:0}}><div className="inp-label">开始日期</div>
              <input className="inp" type="date" value=${cStart} onChange=${e=>setCStart(e.target.value)}/>
            </div>
            <div className="inp-group" style=${{margin:0}}><div className="inp-label">结束日期</div>
              <input className="inp" type="date" value=${cEnd} onChange=${e=>setCEnd(e.target.value)}/>
            </div>
          </div>
        `:html`
          <div className="txs tm">${pStartStr} 至 ${pEndStr}（${Math.max(0,Math.ceil((pEnd-pStart)/86400000))} 天）</div>
        `}
      </div>

      ${!hasData?html`
        <div className="empty"><div className="empty-ico">✨</div><div>暂无可分析数据</div></div>
      `:html`<${React.Fragment}>

        <!-- 净收益汇总 -->
        ${Object.keys(netMap).length>0?html`
          <div style=${{background:'rgba(201,160,67,.08)',border:'1px solid rgba(201,160,67,.2)',borderRadius:12,padding:'16px 20px',marginBottom:14}}>
            <div className="fc g8 mb12">
              <span style=${{fontSize:15}}>⚖️</span>
              <span className="fw6 ts">净收益</span>
              <span className="txs tm">确定性增值 − 期间支出</span>
            </div>
            ${Object.entries(netMap).map(([cur,s])=>{
              const sym=CUR_SYM[cur]||'';
              const pos=s.net>=0;
              return html`
                <div key=${cur} style=${{padding:'8px 0',borderBottom:'1px solid rgba(201,160,67,.1)'}}>
                  <div className="fb">
                    <span style=${{color:'var(--gold)',fontWeight:700,fontSize:13}}>${cur}</span>
                    <span className=${'fn '+(pos?'pl-pos':'pl-neg')} style=${{fontSize:18}}>
                      ${pos?'+':''}${sym}${fmtNum(s.net)}
                    </span>
                  </div>
                  <div className="fc g16 mt4 txs tm">
                    <span>收入 <span style=${{color:'var(--ok)'}}>+${sym}${fmtNum(s.income)}</span></span>
                    ${s.expense>0?html`<span>支出 <span style=${{color:'var(--err)'}}>−${sym}${fmtNum(s.expense)}</span></span>`:''}
                  </div>
                </div>
              `;
            })}
          </div>
        `:null}

        <!-- 存款利息 -->
        ${Object.keys(depositMap).length>0?html`
          <div className="card mb14">
            <div className="fc g8 mb12">
              <span style=${{fontSize:15}}>💰</span>
              <span className="fw6 ts">存款利息（期间应计）</span>
              <span className="txs tm">基于持有余额 × 利率 × 天数计算</span>
            </div>
            ${Object.entries(depositMap).map(([cur,s])=>html`
              <${SummaryRow} key=${cur} cur=${cur} amount=${s.amount}
                sub=${'共 '+s.items.length+' 笔 · 最高 '+Math.max(...s.items.map(i=>i.rate||0))+'%/年'}/>
            `)}
          </div>
        `:null}

        <!-- 固定收益投资 -->
        ${Object.keys(fixedInvMap).length>0?html`
          <div className="card mb14">
            <div className="fc g8 mb12">
              <span style=${{fontSize:15}}>📋</span>
              <span className="fw6 ts">固定收益投资（期间应计）</span>
            </div>
            ${Object.entries(fixedInvMap).map(([cur,s])=>html`
              <${SummaryRow} key=${cur} cur=${cur} amount=${s.amount}
                sub=${s.items.join('、')}/>
            `)}
          </div>
        `:null}

        <!-- 非固定收益 -->
        ${Object.keys(varMap).length>0?html`
          <div className="card mb14">
            <div className="fc g8 mb4">
              <span style=${{fontSize:15}}>📈</span>
              <span className="fw6 ts">非固定收益（当前浮动·非期间增量）</span>
            </div>
            <div className="txs tm mb10" style=${{paddingLeft:2,opacity:.7}}>
              以当前时点现价为基准，反映累计未实现盈亏
            </div>
            ${Object.entries(varMap).map(([cur,s])=>{
              const sym=CUR_SYM[cur]||'';
              const pos=s.unrealized>=0;
              return html`
                <div key=${cur} style=${{display:'grid',gridTemplateColumns:'52px 1fr 1fr',
                  gap:'4px 12px',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)',alignItems:'center'}}>
                  <div style=${{color:'var(--gold)',fontWeight:700,fontSize:12}}>${cur}</div>
                  <div className="txs tm">成本 ${sym}${fmtNum(s.cost,0)}</div>
                  <div className=${'fn '+(pos?'pl-pos':'pl-neg')} style=${{textAlign:'right'}}>
                    ${pos?'+':''}${sym}${fmtNum(s.unrealized)}
                    <div className=${'txs '+(pos?'pl-pos':'pl-neg')}>
                      ${s.cost>0?(pos?'+':'')+fmtNum(s.unrealized/s.cost*100,2)+'%':''}
                    </div>
                  </div>
                </div>
              `;
            })}
          </div>
        `:null}

        <!-- 期间分红 -->
        ${Object.keys(divMap).length>0?html`
          <div className="card mb14">
            <div className="fc g8 mb12">
              <span style=${{fontSize:15}}>💵</span>
              <span className="fw6 ts">期间分红收入</span>
            </div>
            ${Object.entries(divMap).map(([cur,s])=>html`
              <${SummaryRow} key=${cur} cur=${cur} amount=${s.amount}
                sub=${'共 '+s.count+' 笔'}/>
            `)}
          </div>
        `:null}

        <!-- 确定性增值合计 -->
        ${Object.keys(certainMap).length>0?html`
          <div className="card mb14" style=${{borderColor:'rgba(82,200,122,.2)'}}>
            <div className="fc g8 mb12">
              <span style=${{fontSize:15}}>✨</span>
              <span className="fw6 ts">确定性增值合计</span>
              <span className="txs tm">存款利息 + 固定收益应计 + 分红</span>
            </div>
            ${Object.entries(certainMap).map(([cur,amt])=>{
              const sym=CUR_SYM[cur]||'';
              return html`
                <div key=${cur} className="fb" style=${{padding:'4px 0',borderBottom:'1px solid rgba(82,200,122,.08)'}}>
                  <span style=${{color:'var(--gold)',fontWeight:700,fontSize:13}}>${cur}</span>
                  <span className="fn pl-pos" style=${{fontSize:16}}>+${sym}${fmtNum(amt)}</span>
                </div>
              `;
            })}
          </div>
        `:null}

      </${React.Fragment}>`}

      <!-- 支出分类饼图 -->
      ${expPieData.length>0?html`
        <div className="card mb14">
          <div className="fc g8 mb12">
            <span style=${{fontSize:15}}>💸</span>
            <span className="fw6 ts">支出分类</span>
            <span className="txs tm">${pStartStr} — ${pEndStr}</span>
          </div>
          <div style=${{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
            <${DonutChart} segments=${expPieData} size=${140}
              centerLabel=${CUR_SYM[Object.keys(expMap)[0]]||''}
              centerSub=${'支出'}/>
            <div style=${{flex:1,minWidth:160}}>
              ${expPieData.map(d=>html`
                <div key=${d.label} className="fb" style=${{padding:'4px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                  <div className="fc g6">
                    <div style=${{width:8,height:8,borderRadius:'50%',background:d.color,flexShrink:0}}/>
                    <span className="txs">${d.label}</span>
                  </div>
                  <div className="txs" style=${{color:d.color}}>
                    ${fmtNum(d.value/expPieData.reduce((s,x)=>s+x.value,0)*100,1)}%
                    <span className="tm" style=${{marginLeft:4}}>${fmtNum(d.value,0)}</span>
                  </div>
                </div>
              `)}
            </div>
          </div>
        </div>
      `:null}

      <!-- 投资收益率排行 -->
      <div className="card mb14">
        <div className="fc g8 mb12">
          <span style=${{fontSize:15}}>🏆</span>
          <span className="fw6 ts">投资收益率排行</span>
          <span className="txs tm">含现价的非固定收益持仓</span>
        </div>
        <${InvRanking} investments=${data.investments}/>
      </div>

      <!-- 期间支出明细（参考） -->
      ${Object.keys(expMap).length>0?html`
        <div className="card mb14">
          <div className="fc g8 mb12">
            <span style=${{fontSize:15}}>📊</span>
            <span className="fw6 ts">期间支出明细</span>
          </div>
          ${Object.entries(expMap).map(([cur,s])=>{
            const sym=CUR_SYM[cur]||'';
            const top3=Object.entries(s.byCat).sort((a,b)=>b[1]-a[1]).slice(0,3);
            return html`
              <div key=${cur} style=${{padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                <div className="fb">
                  <div className="fc g8">
                    <span style=${{color:'#E86060',fontWeight:700,fontSize:12}}>${cur}</span>
                    <span className="txs tm">${s.count} 笔</span>
                  </div>
                  <span className="fn pl-neg">-${sym}${fmtNum(s.amount)}</span>
                </div>
                <div className="fc g8 mt4" style=${{flexWrap:'wrap'}}>
                  ${top3.map(([cat,amt])=>html`
                    <span key=${cat} className="txs" style=${{color:EXPENSE_CAT_COLORS[cat]||'var(--muted)'}}>
                      ${cat} ${sym}${fmtNum(amt,0)}
                    </span>
                  `)}
                </div>
              </div>
            `;
          })}
        </div>
      `:null}

    </div>
  `;
}
