// ── 总览页 ────────────────────────────────────────────────
function Overview({data,totals,grandTotal,grandAsset,grandLiab,unlinkedInvTotal,baseCur,setBaseCur,rates,setRates,portfolioCurrencies,addSnapshot,deleteSnapshot}){
  const needRates=portfolioCurrencies.filter(c=>c!==baseCur);
  const missingRates=needRates.filter(c=>!rates[c]);
  const hasHoldings=portfolioCurrencies.length>0;

  // 🆕 自动获取汇率
  const [fetching,setFetching]=useState(false);
  const [fetchErr,setFetchErr]=useState('');
  const autoFetch=async()=>{
    if(needRates.length===0)return;
    setFetching(true);setFetchErr('');
    try{
      const res=await fetch('https://open.er-api.com/v6/latest/'+baseCur);
      const json=await res.json();
      if(json.result==='success'){
        const nr={};
        needRates.forEach(cur=>{
          if(json.rates&&json.rates[cur])nr[cur]=Math.round(1/json.rates[cur]*100000)/100000;
        });
        setRates(r=>({...r,...nr}));
        if(!Object.keys(nr).length)setFetchErr('未获取到目标货币汇率');
      }else{setFetchErr('获取失败，请手动输入');}
    }catch(e){setFetchErr('网络错误，请手动输入');}
    setFetching(false);
  };

  // 🆕 资产分布图 — 按账户 / 按货币
  const [chartMode,setChartMode]=useState('account');
  const getRate=cur=>cur===baseCur?1:(rates[cur]||null);
  const accountSegments=useMemo(()=>{
    const result=[];
    // 各账户总资产（用账户主题色）
    totals.forEach(a=>{if((a.assetTotal||0)>0)result.push({value:a.assetTotal,color:a.color||'#C9A043',label:a.name,isLiab:false});});
    // 各账户负债汇总（红色）——按账户分开，更直观
    totals.forEach(a=>{if((a.liabTotal||0)>0)result.push({value:a.liabTotal,color:'#8B2020',label:'负债·'+a.name,isLiab:true});});
    return result;
  },[totals]);
  const currencySegments=useMemo(()=>{
    const assetMap={};
    // 银行存款（仅正余额）
    data.accounts.forEach(acc=>(acc.holdings||[]).forEach(h=>{
      const r=getRate(h.currency);
      if(r&&Number(h.amount)>0)assetMap[h.currency]=(assetMap[h.currency]||0)+Number(h.amount)*r;
    }));
    // 投资持仓（按货币）
    data.investments.forEach(inv=>{
      const r=getRate(inv.currency);
      if(!r)return;
      const cat=inv.category||'variable';
      let val;
      if(cat==='fixed'){const fr=calcFixedReturn(inv);val=fr?fr.principal+fr.accrued:Number(inv.buyPrice)*Number(inv.quantity||1);}
      else{const p=inv.currentPrice!=null?Number(inv.currentPrice):Number(inv.buyPrice);val=p*Number(inv.quantity||0);}
      assetMap[inv.currency]=(assetMap[inv.currency]||0)+val*r;
    });
    const result=Object.entries(assetMap).filter(([,v])=>v>0).map(([cur,val])=>({value:val,color:CUR_COLORS[cur]||'#888',label:cur,isLiab:false}));
    // 负债（按货币，红色系）
    const liabMap={};
    data.accounts.forEach(acc=>(acc.liabilities||[]).forEach(l=>{
      const r=getRate(l.currency);
      const rem=calcRemainingPrincipal(l);
      if(r&&rem>0)liabMap[l.currency]=(liabMap[l.currency]||0)+rem*r;
    }));
    Object.entries(liabMap).forEach(([cur,val])=>{if(val>0)result.push({value:val,color:'#8B2020',label:'负债·'+cur,isLiab:true});});
    return result;
  },[data.accounts,data.investments,rates,baseCur]);
  const segments=chartMode==='account'?accountSegments:currencySegments;
  // 资产段合计（用于环形图中心显示净资产）
  const assetSegTotal=segments.filter(s=>!s.isLiab).reduce((s,x)=>s+x.value,0);
  const liabSegTotal=segments.filter(s=>s.isLiab).reduce((s,x)=>s+x.value,0);
  const segTotal=assetSegTotal+liabSegTotal;

  // 🆕 净资产快照
  const snapshots=data.snapshots||[];
  const canSnap=grandTotal!==null;
  const todaySnapped=snapshots.some(s=>s.date===new Date().toISOString().slice(0,10)&&s.currency===baseCur);

  return html`
    <div>
      <div className="mb20"><div className="pg-title">资产总览</div><div className="pg-sub">多账户、多货币资产与负债汇总</div></div>

      ${data.accounts.length===0
        ?html`<div className="empty"><div className="empty-ico">🏦</div><div>暂无账户，请前往"账户"添加</div></div>`
        :html`<${React.Fragment}>
          <div className="card mb16">
            <div className="fb mb16" style=${{flexWrap:'wrap',gap:10}}>
              <div className="fw6">📐 汇率设置 & 净资产计算</div>
              <div className="fc g8">
                <span className="ts tm">计算币种：</span>
                <select className="inp" style=${{width:'auto'}} value=${baseCur} onChange=${e=>setBaseCur(e.target.value)}>
                  ${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}
                </select>
              </div>
            </div>
            ${!hasHoldings&&html`<div className="ts tm">账户中暂无货币持有记录</div>`}
            ${needRates.length>0&&html`<${React.Fragment}>
              <div className="fb mb8" style=${{flexWrap:'wrap',gap:8}}>
                <span className="txs tm">输入汇率：1 单位各货币 = ? ${baseCur}</span>
                <button className="btn btn-ghost btn-xs fc g4" onClick=${autoFetch} disabled=${fetching}>
                  ${fetching?'获取中...':'⚡ 自动获取'}
                </button>
              </div>
              ${fetchErr&&html`<div className="txs" style=${{color:'var(--err)',marginBottom:8}}>${fetchErr}</div>`}
              <div className="rates-grid mb4">
                ${needRates.map(cur=>html`
                  <div key=${cur} className="rate-item">
                    <span className="rate-cur">${cur}</span>
                    <input className="rate-inp" type="number" min="0" step="any" placeholder="汇率"
                      value=${rates[cur]||''}
                      onChange=${e=>setRates(r=>({...r,[cur]:e.target.value?Number(e.target.value):undefined}))}/>
                    <span className="rate-unit">=${baseCur}</span>
                  </div>
                `)}
              </div>
              ${missingRates.length>0&&html`<div className="alert alert-warn mt12">⚠ 还需填写 ${missingRates.join(', ')} 的汇率</div>`}
            </${React.Fragment}>`}
            ${needRates.length===0&&hasHoldings&&html`<div className="ts tm">所有持仓均为 ${baseCur}，无需设置汇率</div>`}
            ${grandTotal!==null&&html`<${React.Fragment}>
              <div className="divider"/>
              <div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                <div style=${{background:'rgba(82,214,138,.05)',border:'1px solid rgba(82,214,138,.15)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
                  <div className="txs tm mb4" style=${{textTransform:'uppercase',letterSpacing:'.08em'}}>总资产</div>
                  <div className="fh fn" style=${{fontSize:22,color:'var(--ok)'}}>${CUR_SYM[baseCur]}${fmtNum(grandAsset)}</div>
                  ${data.investments.length>0&&html`<div className="txs tm" style=${{marginTop:4}}>含投资 ${CUR_SYM[baseCur]}${fmtNum(totals.reduce((s,a)=>s+(a.invAsset||0),0)+(unlinkedInvTotal||0),0)}</div>`}
                </div>
                <div style=${{background:'rgba(240,128,128,.05)',border:'1px solid rgba(240,128,128,.15)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
                  <div className="txs tm mb4" style=${{textTransform:'uppercase',letterSpacing:'.08em'}}>总负债</div>
                  <div className="fh fn" style=${{fontSize:22,color:'var(--err)'}}>${grandLiab>0?'-':''}${CUR_SYM[baseCur]}${fmtNum(grandLiab)}</div>
                </div>
              </div>
              <div className="total-banner">
                <div className="total-label">净资产</div>
                <div className="total-amt" style=${{color:grandTotal>=0?'var(--gold)':'var(--err)'}}>${grandTotal<0?'-':''}${CUR_SYM[baseCur]}${fmtNum(Math.abs(grandTotal))}</div>
                <div className="total-cur">${baseCur} · ${CUR_NAMES[baseCur]}</div>
              </div>
            </${React.Fragment}>`}
          </div>

          <div className="g2 mb16">${totals.map(acc=>html`<${AccSummaryCard} key=${acc.id} acc=${acc} baseCur=${baseCur}/>`)}</div>

          ${grandTotal!==null&&segments.length>0&&html`
            <div className="card mb16">
              <div className="fb mb14" style=${{flexWrap:'wrap',gap:8}}>
                <span className="fw6">🥧 资产负债分布</span>
                <div className="fc g6">
                  <button className=${'btn btn-xs '+(chartMode==='account'?'btn-gold':'btn-ghost')} onClick=${()=>setChartMode('account')}>按账户</button>
                  <button className=${'btn btn-xs '+(chartMode==='currency'?'btn-gold':'btn-ghost')} onClick=${()=>setChartMode('currency')}>按货币</button>
                </div>
              </div>
              <div className="chart-wrap">
                <${DonutChart} segments=${segments} size=${170}
                  centerLabel=${CUR_SYM[baseCur]+fmtNum(grandTotal,0)}
                  centerSub=${'净资产'}/>
                <div className="chart-legend">
                  ${[...segments].sort((a,b)=>(a.isLiab===b.isLiab?b.value-a.value:a.isLiab?1:-1)).map((s,i)=>html`
                    <div key=${i} className="legend-item">
                      <div className="fc g6">
                        <div className="legend-dot" style=${{background:s.color}}/>
                        <span className=${'tm '+(s.isLiab?'':'')+(s.isLiab?'pl-neg':'')} style=${{color:s.isLiab?'var(--err)':undefined}}>${s.label}</span>
                      </div>
                      <div className="tr fn">
                        <div className="txs" style=${{color:s.isLiab?'var(--err)':undefined}}>${s.isLiab?'-':''}${CUR_SYM[baseCur]}${fmtNum(s.value,0)}</div>
                        <div className="txs tm">${fmtNum(s.value/segTotal*100,1)}%</div>
                      </div>
                    </div>
                  `)}
                  ${liabSegTotal>0&&html`
                    <div style=${{borderTop:'1px solid var(--border)',marginTop:4,paddingTop:4}}>
                      <div className="legend-item">
                        <span className="txs tm">资产负债率</span>
                        <span className="txs" style=${{color:'var(--err)'}}>${fmtNum(liabSegTotal/assetSegTotal*100,1)}%</span>
                      </div>
                    </div>
                  `}
                </div>
              </div>
            </div>
          `}

          <div className="card mb16">
            <div className="fb mb12" style=${{flexWrap:'wrap',gap:8}}>
              <span className="fw6">📅 净资产历史</span>
              <div className="fc g6">
                ${canSnap&&!todaySnapped&&html`<button className="btn btn-gold btn-sm" onClick=${()=>addSnapshot(grandTotal,baseCur)}>📌 记录今日</button>`}
                ${canSnap&&todaySnapped&&html`<span className="txs" style=${{color:'var(--ok)'}}>✓ 今日已记录</span>`}
                ${!canSnap&&html`<span className="txs tm">填写汇率后可记录</span>`}
              </div>
            </div>
            ${snapshots.length===0&&html`<div className="ts tm">暂无快照记录，点击"记录今日"开始追踪净资产趋势</div>`}
            ${snapshots.length>=2&&html`<${BarChart} snapshots=${snapshots}/>`}
            ${snapshots.length>0&&html`
              <div className="snap-list">
                ${[...snapshots].sort((a,b)=>b.ts-a.ts).map(s=>html`
                  <div key=${s.id} className="fb" style=${{padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                    <div className="fc g8">
                      <span className="txs tm">${s.date}</span>
                      <span className=${'fh fn '+(s.amount>=0?'tg':'pl-neg')} style=${{fontSize:16}}>${CUR_SYM[s.currency]||''}${fmtNum(s.amount)}</span>
                      <span className="tag t-gray">${s.currency}</span>
                    </div>
                    <button className="btn btn-danger btn-xs shrink0" onClick=${()=>deleteSnapshot(s.id)}>删除</button>
                  </div>
                `)}
              </div>
            `}
          </div>

          ${data.investments.length>0&&html`
            <div className="card">
              <div className="fb mb12"><span className="fw6">📈 投资持仓</span><span className="ts tm">${data.investments.length} 项</span></div>
              ${data.investments.map(inv=>{
                const cat=inv.category||'variable';
                let mv,cost,pl=null,plPct=null;
                if(cat==='fixed'){
                  const fr=calcFixedReturn(inv);
                  mv=fr?fr.principal+fr.accrued:Number(inv.buyPrice)*Number(inv.quantity||1);
                  cost=fr?fr.principal:mv;
                  if(fr&&fr.accrued){pl=fr.accrued;plPct=fr.principal?fr.accrued/fr.principal*100:null;}
                }else{
                  cost=Number(inv.buyPrice)*Number(inv.quantity||0);
                  mv=inv.currentPrice!=null?Number(inv.currentPrice)*Number(inv.quantity||0):cost;
                  if(inv.currentPrice!=null){pl=mv-cost;plPct=cost?pl/cost*100:null;}
                }
                return html`
                  <div key=${inv.id} className="fb" style=${{padding:'6px 0',borderBottom:'1px solid rgba(36,45,63,.4)'}}>
                    <div>
                      <div className="fc g6"><span className="fw6 ts">${inv.name}</span><span className="tag t-blue">${inv.type}</span></div>
                      ${pl!==null?html`<div className=${'txs mt2 '+(pl>=0?'pl-pos':'pl-neg')}>${pl>=0?'+':''}${CUR_SYM[inv.currency]}${fmtNum(pl)} (${plPct>=0?'+':''}${fmtNum(plPct,2)}%)</div>`:null}
                    </div>
                    <div className="tr">
                      <div className="fn ts tg">${CUR_SYM[inv.currency]}${fmtNum(mv)} <span className="tm txs">${inv.currency}</span></div>
                      ${pl!==null?html`<div className="txs tm">成本 ${CUR_SYM[inv.currency]}${fmtNum(cost)}</div>`:null}
                    </div>
                  </div>
                `;
              })}
            </div>
          `}
        </${React.Fragment}>`}
    </div>
  `;
}

// ── 总览用账户卡 ──────────────────────────────────────────
function AccSummaryCard({acc,baseCur}){
  const hasLiab=(acc.liabilities||[]).length>0;
  return html`
    <div className="acc" style=${{borderLeft:'3px solid '+(acc.color||'#C9A043')}}>
      <div className="acc-hdr" style=${{cursor:'default'}}>
        <div className="fc g12">
          <div className="acc-dot" style=${{background:acc.color||'#C9A043'}}/>
          <div><div className="acc-name">${acc.name}</div><div className="acc-bank-txt">${acc.bank}${acc.number?' · 尾号'+acc.number:''}</div></div>
        </div>
        <div className="tr">
          ${acc.total!==null&&html`<div className="fh fn" style=${{fontSize:17,color:acc.total>=0?'var(--gold)':'var(--err)'}}>${CUR_SYM[baseCur]}${fmtNum(acc.total)}</div>`}
          ${acc.total!==null&&html`<div className="txs tm">${hasLiab?'净资产 · ':''}${baseCur}</div>`}
        </div>
      </div>
      ${(acc.holdings||[]).length>0&&html`
        <div className="acc-body">
          ${hasLiab&&html`<div className="txs tm mb4" style=${{paddingTop:4}}>存款</div>`}
          ${(()=>{
            // 同银行同币种合并显示
            const merged={};
            (acc.holdings||[]).forEach(h=>{
              const cur=h.currency;
              merged[cur]=(merged[cur]||0)+Number(h.amount||0);
            });
            return Object.entries(merged).map(([cur,amt])=>html`
              <div key=${cur} className="hold-row">
                <div><div className="hold-cur">${cur}</div><div className="hold-name">${CUR_NAMES[cur]}</div></div>
                <div className="hold-amt">${CUR_SYM[cur]}${fmtNum(amt)}</div>
              </div>
            `);
          })()}
          ${hasLiab&&html`<${React.Fragment}>
            <div className="txs mb4" style=${{color:'var(--err)',paddingTop:8}}>负债</div>
            ${(acc.liabilities||[]).map(l=>html`
              <div key=${l.id} className="hold-row">
                <div><div style=${{fontSize:11,fontWeight:700,color:'var(--err)',letterSpacing:'.07em'}}>${l.currency}</div><div className="hold-name">${l.name}</div></div>
                <div style=${{fontSize:14,fontWeight:500,color:'var(--err)'}}>-${CUR_SYM[l.currency]}${fmtNum(calcRemainingPrincipal(l))}</div>
              </div>
            `)}
          </${React.Fragment}>`}
        </div>
      `}
    </div>
  `;
}
