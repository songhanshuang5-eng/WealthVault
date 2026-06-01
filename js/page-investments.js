// ── 投资回报率可视化图表 ──────────────────────────────────
function InvestmentROIChart({investments}){
  const [show,setShow]=useState(true);
  const [sortBy,setSortBy]=useState('roi'); // 'roi' | 'abs'

  // 构建统一数据集：固定收益用年化利率，非固定用实际盈亏%
  const chartData=useMemo(()=>{
    const items=[];
    investments.forEach(inv=>{
      const isFixed=(inv.category||'variable')==='fixed';
      if(isFixed){
        if(!inv.annualRate)return;
        const fr=calcFixedReturn(inv);
        const roiPct=Number(inv.annualRate); // 年化利率%
        const absGain=fr?fr.totalReturn:null;
        items.push({
          id:inv.id,name:inv.name,type:inv.type,category:'fixed',
          currency:inv.currency,
          roi:roiPct,
          absGain,
          roiLabel:'+'+roiPct.toFixed(2)+'%',
          metricNote:'年化',
        });
      } else {
        const pos=calcEffectivePosition(inv);
        const cost=pos.totalCost;
        if(inv.currentPrice==null||cost===0)return;
        const mv=Number(inv.currentPrice)*pos.effectiveQty;
        const pl=mv-cost+pos.realizedPL; // 未实现 + 已实现盈亏
        const roiPct=pl/cost*100;
        items.push({
          id:inv.id,name:inv.name,type:inv.type,category:'variable',
          currency:inv.currency,
          roi:roiPct,
          absGain:pl,
          roiLabel:(roiPct>=0?'+':'')+roiPct.toFixed(2)+'%',
          metricNote:'累计',
        });
      }
    });
    if(sortBy==='roi') items.sort((a,b)=>b.roi-a.roi);
    else items.sort((a,b)=>(b.absGain||0)-(a.absGain||0));
    return items;
  },[investments,sortBy]);

  if(chartData.length===0)return null;

  const maxAbs=Math.max(...chartData.map(d=>Math.abs(d.roi)),0.01);
  const maxPos=Math.max(...chartData.map(d=>Math.max(d.roi,0)),0.01);
  const maxNeg=Math.max(...chartData.map(d=>Math.max(-d.roi,0)),0.01);
  const hasNeg=chartData.some(d=>d.roi<0);
  // zeroPos：零线距左边缘的比例 = 负值最大值 / 总量
  // 正轴在右边（zeroPos → 100%），负轴在左边（0% → zeroPos）
  const zeroPos=hasNeg?maxNeg/(maxPos+maxNeg):0;

  const barColor=d=>{
    if(d.category==='fixed')return 'var(--gold)';
    return d.roi>=0?'#52C87A':'#E86060';
  };
  const textColor=d=>{
    if(d.category==='fixed')return 'var(--gold)';
    return d.roi>=0?'#52C87A':'#E86060';
  };

  return html`
    <div className="card mb20" style=${{padding:'16px 20px'}}>
      <div className="fb mb14" style=${{alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div className="fc g8">
          <span style=${{fontSize:16}}>📊</span>
          <span className="fw6 ts">回报率对比</span>
          <div className="fc g4" style=${{marginLeft:4}}>
            <button
              onClick=${()=>setSortBy('roi')}
              style=${{fontSize:11,padding:'2px 8px',borderRadius:4,border:'1px solid rgba(255,255,255,.15)',cursor:'pointer',
                background:sortBy==='roi'?'rgba(201,160,67,.2)':'transparent',
                color:sortBy==='roi'?'var(--gold)':'var(--muted)',transition:'all .2s'}}>
              按ROI%
            </button>
            <button
              onClick=${()=>setSortBy('abs')}
              style=${{fontSize:11,padding:'2px 8px',borderRadius:4,border:'1px solid rgba(255,255,255,.15)',cursor:'pointer',
                background:sortBy==='abs'?'rgba(201,160,67,.2)':'transparent',
                color:sortBy==='abs'?'var(--gold)':'var(--muted)',transition:'all .2s'}}>
              按绝对收益
            </button>
          </div>
        </div>
        <button className="btn btn-ghost btn-xs" onClick=${()=>setShow(p=>!p)}>${show?'收起 ▲':'展开 ▼'}</button>
      </div>

      ${show&&html`<${React.Fragment}>
        <div style=${{display:'flex',flexDirection:'column',gap:6}}>
          ${chartData.map((d,i)=>{
            const isPos=d.roi>=0;
            // 正向条从零线向右延伸，最大填满 (1-zeroPos)*100% 的宽度
            // 负向条从零线向左延伸，最大填满 zeroPos*100% 的宽度
            const barW=isPos
              ?(d.roi/maxPos)*(1-zeroPos)*100
              :(Math.abs(d.roi)/maxNeg)*zeroPos*100;
            const medalColors=['#FFD700','#C0C0C0','#CD7F32'];
            const rankStyle=i<3
              ?{color:medalColors[i],fontWeight:700}
              :{color:'var(--muted)',fontWeight:400};
            return html`
              <div key=${d.id} style=${{display:'grid',gridTemplateColumns:'24px 1fr 80px',alignItems:'center',gap:10}}>
                <div style=${{textAlign:'center',fontSize:12,...rankStyle}}>${i+1}</div>
                <div>
                  <div style=${{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style=${{
                      fontSize:10,padding:'1px 5px',borderRadius:3,flexShrink:0,
                      background:d.category==='fixed'?'rgba(201,160,67,.15)':'rgba(74,144,217,.15)',
                      color:d.category==='fixed'?'var(--gold)':'#4A90D9',
                    }}>${d.category==='fixed'?'固定':'浮动'}</span>
                    <span style=${{fontSize:13,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>${d.name}</span>
                    <span style=${{fontSize:10,color:'var(--muted)',flexShrink:0}}>${d.metricNote}</span>
                  </div>
                  <div style=${{position:'relative',height:18,borderRadius:3,overflow:'hidden',display:'flex',alignItems:'center'}}>
                    <div style=${{position:'absolute',left:0,right:0,height:'100%',background:'rgba(255,255,255,.03)',borderRadius:3}}></div>
                    ${hasNeg&&html`
                      <div style=${{
                        position:'absolute',left:(zeroPos*100)+'%',top:0,bottom:0,
                        width:1,background:'rgba(255,255,255,.2)',zIndex:2
                      }}></div>
                    `}
                    <div style=${{
                      position:'absolute',
                      ...(isPos
                        ?{left:(zeroPos*100)+'%',width:barW+'%',borderRadius:'0 3px 3px 0'}
                        :{right:((1-zeroPos)*100)+'%',width:barW+'%',borderRadius:'3px 0 0 3px'}),
                      height:'100%',
                      background:barColor(d),
                      opacity:.85,
                      transition:'width .5s cubic-bezier(.4,0,.2,1)',
                      zIndex:1,
                    }}></div>
                  </div>
                </div>
                <div style=${{
                  textAlign:'right',fontWeight:700,fontSize:13,
                  fontFamily:'monospace',color:textColor(d),flexShrink:0
                }}>${d.roiLabel}</div>
              </div>
            `;
          })}
        </div>

        <div className="fc g16 mt14" style=${{justifyContent:'flex-end',flexWrap:'wrap',gap:8}}>
          <div className="fc g5 txs" style=${{color:'var(--muted)'}}>
            <span style=${{width:10,height:10,borderRadius:2,background:'var(--gold)',display:'inline-block',flexShrink:0}}></span>固定收益（年化率）
          </div>
          <div className="fc g5 txs" style=${{color:'var(--muted)'}}>
            <span style=${{width:10,height:10,borderRadius:2,background:'#52C87A',display:'inline-block',flexShrink:0}}></span>浮动盈利
          </div>
          <div className="fc g5 txs" style=${{color:'var(--muted)'}}>
            <span style=${{width:10,height:10,borderRadius:2,background:'#E86060',display:'inline-block',flexShrink:0}}></span>浮动亏损
          </div>
        </div>
      </${React.Fragment}>`}
    </div>
  `;
}

// ── 投资持仓页（固定收益 + 非固定收益 分区）────────────────
function InvestmentsPage({data,saveInvestment,deleteInvestment,addInvestmentNote,deleteInvestmentNote,addTrade,deleteTrade,addDividend,deleteDividend,settleFixedInvestment}){
  const updatePrice=(inv,newPrice)=>saveInvestment({...inv,currentPrice:newPrice});
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [notesItem,setNotesItem]=useState(null);
  const [tradeItem,setTradeItem]=useState(null);
  const [dividendItem,setDividendItem]=useState(null);
  const [dismissed,setDismissed]=useState([]);

  const today=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return d;},[]);

  // 区分固定 / 非固定
  const fixedInvs=useMemo(()=>data.investments.filter(i=>(i.category||'variable')==='fixed'),[data.investments]);
  const varInvs=useMemo(()=>data.investments.filter(i=>(i.category||'variable')==='variable'),[data.investments]);

  // 临近到期提醒（≤3天且未被关闭）
  const maturingSoon=useMemo(()=>fixedInvs.filter(inv=>{
    if(!inv.maturityDate)return false;
    const dl=Math.ceil((new Date(inv.maturityDate)-today)/86400000);
    return dl>=0&&dl<=3&&!dismissed.includes(inv.id);
  }),[fixedInvs,today,dismissed]);

  // 非固定收益汇总（使用有效仓位 calcEffectivePosition）
  const varSummary=useMemo(()=>{
    let cost=0,market=0,hasCurrent=false,realizedPL=0;
    varInvs.forEach(inv=>{
      const pos=calcEffectivePosition(inv);
      cost+=pos.totalCost;
      realizedPL+=pos.realizedPL;
      if(inv.currentPrice!=null){hasCurrent=true;market+=Number(inv.currentPrice)*pos.effectiveQty;}
      else market+=pos.totalCost;
    });
    return{cost,market,pl:market-cost,plPct:cost?((market-cost)/cost*100):0,hasCurrent,realizedPL};
  },[varInvs]);

  // 固定收益汇总
  const fixedSummary=useMemo(()=>{
    let principal=0,accrued=0,totalReturn=0;
    fixedInvs.forEach(inv=>{
      const fr=calcFixedReturn(inv);
      if(!fr)return;
      principal+=fr.principal;
      accrued+=fr.accrued;
      totalReturn+=fr.totalReturn;
    });
    return{principal,accrued,totalReturn,accruedPct:principal?(accrued/principal*100):0,totalPct:principal?(totalReturn/principal*100):0};
  },[fixedInvs]);

  const dismiss=id=>setDismissed(p=>[...p,id]);

  return html`
    <div>
      <div className="fb mb20" style=${{flexWrap:'wrap',gap:10}}>
        <div><div className="pg-title">投资持仓</div><div className="pg-sub">固定收益及非固定收益理财产品</div></div>
        <button className="btn btn-gold shrink0" onClick=${()=>{setEditItem(null);setShowAdd(true);}}>+ 添加持仓</button>
      </div>

      ${maturingSoon.map(inv=>{
        const dl=Math.ceil((new Date(inv.maturityDate)-today)/86400000);
        return html`
          <div key=${inv.id} style=${{background:'rgba(240,128,128,.1)',border:'1px solid rgba(240,128,128,.3)',borderRadius:10,padding:'12px 16px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div className="fc g8">
              <span style=${{fontSize:18}}>⚠️</span>
              <div>
                <div className="ts" style=${{color:'var(--err)',fontWeight:600}}>${inv.name} 即将到期！</div>
                <div className="txs tm">${dl===0?'今天到期':dl===1?'明天到期':'还有 '+dl+' 天到期'} · 到期日 ${fmtDate(inv.maturityDate)}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-xs" onClick=${()=>dismiss(inv.id)}>知道了</button>
          </div>
        `;
      })}

      <${InvestmentROIChart} investments=${data.investments} />

      <div className="fb mb12 mt8" style=${{alignItems:'center',gap:8}}>
        <span className="fw6 ts">📋 固定收益</span>
        <span className="txs tm">${fixedInvs.length} 项</span>
      </div>
      ${fixedInvs.length===0
        ?html`<div className="ts tm" style=${{padding:'8px 0 16px',borderBottom:'1px solid rgba(36,45,63,.5)'}}>暂无固定收益持仓</div>`
        :html`<${React.Fragment}>
          <div className="card mb12" style=${{padding:'12px 18px'}}>
            <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
              <div><div className="txs tm mb4">合计本金</div><div className="fn ts">${fmtNum(fixedSummary.principal)}</div></div>
              <div>
                <div className="txs tm mb4">已计收益</div>
                <div className=${'fn ts pl-pos'}>+${fmtNum(fixedSummary.accrued)}</div>
                <div className="txs pl-pos">+${fmtNum(fixedSummary.accruedPct,2)}%</div>
              </div>
              <div>
                <div className="txs tm mb4">到期总收益</div>
                <div className=${'fn ts pl-pos'}>+${fmtNum(fixedSummary.totalReturn)}</div>
                <div className="txs pl-pos">+${fmtNum(fixedSummary.totalPct,2)}%</div>
              </div>
            </div>
          </div>
          <div className="card ovx mb20" style=${{padding:0}}>
            <table className="tbl">
              <thead><tr>
                <th>名称</th><th>类型</th><th>账户</th><th>货币</th>
                <th>本金</th><th>年化</th><th>购入日</th><th>到期日</th>
                <th>剩余天数</th><th>到期收益</th><th>已计盈亏</th><th>状态</th><th>备注</th><th>操作</th>
              </tr></thead>
              <tbody>
                ${fixedInvs.map(inv=>{
                  const acc=data.accounts.find(a=>a.id===inv.accountId);
                  const fr=calcFixedReturn(inv);
                  const dl=fr?fr.daysLeft:null;
                  const sym=CUR_SYM[inv.currency]||'';
                  const accruedPct=fr&&fr.principal?fr.accrued/fr.principal*100:null;
                  const totalPct=fr&&fr.principal?fr.totalReturn/fr.principal*100:null;
                  const shortNote=inv.note?(inv.note.length>18?inv.note.slice(0,18)+'…':inv.note):null;
                  const notesSorted=[...(inv.notes||[])].sort((a,b)=>a.ts-b.ts);
                  const isSettled=!!inv.settled;
                  return html`
                    <tr key=${inv.id} style=${{opacity:isSettled?0.55:1}}>
                      <td>
                        <span className="fw6">${inv.name}</span>
                        ${shortNote?html`<div className="txs tm">${shortNote}</div>`:null}
                        ${isSettled?html`<div className="txs" style=${{color:'var(--muted)'}}>已结算 ${inv.settledDate||''}</div>`:null}
                      </td>
                      <td><span className="tag t-blue">${inv.type}</span></td>
                      <td className="tm txs">${acc?acc.name:'—'}</td>
                      <td><span className="tag t-gold">${inv.currency}</span></td>
                      <td className="fn">${fr?sym+fmtNum(fr.principal):'—'}</td>
                      <td className="fn">${inv.annualRate?inv.annualRate+'%':'—'}</td>
                      <td className="ts">${fmtDate(inv.buyDate)}</td>
                      <td className="ts">${fmtDate(inv.maturityDate)}</td>
                      <td style=${{color:!isSettled&&dl!=null&&dl<=3?'var(--err)':!isSettled&&dl!=null&&dl<=7?'var(--gold)':'inherit'}}>
                        ${isSettled?html`<span className="tm">—</span>`:dl!=null?(fr.isMatured?html`<span style=${{color:'var(--err)'}}>已到期</span>`:dl+'天'):html`<span className="tm">—</span>`}
                      </td>
                      <td>${fr?html`<div className="fn pl-pos">+${sym}${fmtNum(fr.totalReturn)}</div><div className="txs pl-pos">+${fmtNum(totalPct,2)}%</div>`:html`<span className="tm">—</span>`}</td>
                      <td>${fr?html`<div className="fn pl-pos">+${sym}${isSettled?fmtNum(fr.totalReturn):fmtNum(fr.accrued)}</div><div className="txs pl-pos">+${fmtNum(isSettled?totalPct:accruedPct,2)}%</div>`:html`<span className="tm">—</span>`}</td>
                      <td>${isSettled
                        ?html`<span className="tag" style=${{background:'rgba(100,100,100,.15)',color:'var(--muted)'}}>已结算</span>`
                        :fr?(fr.isMatured
                          ?html`<span className="tag t-red">已到期</span>`
                          :dl<=3?html`<span className="tag t-red">临近到期</span>`:html`<span className="tag t-blue">持有中</span>`):'—'}
                      </td>
                      <td>
                        ${notesSorted.length>0
                          ?html`<div className="fc g6" style=${{flexWrap:'wrap'}}>
                              ${notesSorted.map((n,i)=>html`
                                <span key=${n.id} onClick=${()=>setNotesItem(inv)}
                                  style=${{cursor:'pointer',color:'var(--gold)',textDecoration:'underline',fontSize:13,fontWeight:600,lineHeight:1.8}}>
                                  ${i+1}
                                </span>
                              `)}
                            </div>`
                          :html`<button className="btn btn-ghost btn-xs tm" onClick=${()=>setNotesItem(inv)}>+</button>`}
                      </td>
                      <td><div className="fc g4">
                        ${!isSettled&&fr&&fr.isMatured?html`
                          <button className="btn btn-sm" style=${{background:'rgba(82,200,122,.12)',color:'var(--ok)',border:'1px solid rgba(82,200,122,.25)',fontSize:11,padding:'3px 8px',borderRadius:4,cursor:'pointer',whiteSpace:'nowrap'}}
                            onClick=${()=>settleFixedInvestment(inv.id)}>✅ 到期结算</button>
                        `:null}
                        ${!isSettled?html`<button className="btn btn-ghost btn-xs" onClick=${()=>{setEditItem(inv);setShowAdd(true);}}>编辑</button>`:null}
                        <button className="btn btn-danger btn-xs" onClick=${()=>deleteInvestment(inv.id)}>删除</button>
                      </div></td>
                    </tr>
                  `;
                })}
              </tbody>
            </table>
          </div>
        </${React.Fragment}>`}

      <div className="fb mb12 mt4" style=${{alignItems:'center',gap:8}}>
        <span className="fw6 ts">📈 非固定收益</span>
        <span className="txs tm">${varInvs.length} 项</span>
      </div>
      ${varInvs.length>0?html`
        <div className="card mb12" style=${{padding:'12px 18px'}}>
          <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
            <div><div className="txs tm mb4">合计成本</div><div className="fn ts">${fmtNum(varSummary.cost)}</div></div>
            <div>
              <div className="txs tm mb4">当前市值</div>
              <div className="fn ts">${varSummary.hasCurrent?fmtNum(varSummary.market):html`<span className="tm txs">待填现价</span>`}</div>
            </div>
            <div>
              <div className="txs tm mb4">未实现盈亏</div>
              ${varSummary.hasCurrent?html`<${React.Fragment}>
                <div className=${'fn ts '+(varSummary.pl>=0?'pl-pos':'pl-neg')}>
                  ${varSummary.pl>=0?'+':''}${fmtNum(varSummary.pl)}
                </div>
                <div className=${'txs '+(varSummary.pl>=0?'pl-pos':'pl-neg')}>
                  ${varSummary.plPct>=0?'+':''}${fmtNum(varSummary.plPct,2)}%
                </div>
              </${React.Fragment}>`:html`<span className="txs tm">—</span>`}
            </div>
            ${varSummary.realizedPL!==0?html`<div>
              <div className="txs tm mb4">已实现盈亏</div>
              <div className=${'fn ts '+(varSummary.realizedPL>=0?'pl-pos':'pl-neg')}>
                ${varSummary.realizedPL>=0?'+':''}${fmtNum(varSummary.realizedPL)}
              </div>
            </div>`:null}
          </div>
        </div>
      `:null}
      ${varInvs.length===0
        ?html`<div className="ts tm" style=${{padding:'8px 0'}}>暂无非固定收益持仓</div>`
        :html`<div className="card ovx" style=${{padding:0}}>
            <table className="tbl">
              <thead><tr>
                <th>名称</th><th>类型</th><th>代码</th><th>账户</th><th>买入日</th>
                <th>货币</th><th>均价</th><th>数量</th><th>成本</th><th>现价</th><th>市值</th>
                <th>未实现盈亏</th><th>已实现盈亏</th><th>累计分红</th><th>年化收益率</th><th>备注</th><th>操作</th>
              </tr></thead>
              <tbody>
                ${varInvs.map(inv=>{
                  const acc=data.accounts.find(a=>a.id===inv.accountId);
                  // 使用有效仓位（含补仓/减仓记录）
                  const pos=calcEffectivePosition(inv);
                  const hasCur=inv.currentPrice!=null;
                  const mv=hasCur?Number(inv.currentPrice)*pos.effectiveQty:null;
                  const pl=hasCur?mv-pos.totalCost:null;
                  const plPct=hasCur&&pos.totalCost?pl/pos.totalCost*100:null;
                  const hasTrades=(inv.trades||[]).length>0;
                  // 年化：使用最早买入日
                  const daysHeld=inv.buyDate?Math.max(1,Math.floor((today-new Date(inv.buyDate))/86400000)):null;
                  const annRate=(plPct!=null&&daysHeld!=null&&daysHeld>=1&&(1+plPct/100)>0)
                    ?(Math.pow(1+plPct/100,365/daysHeld)-1)*100:null;
                  const shortNote=inv.note?(inv.note.length>18?inv.note.slice(0,18)+'…':inv.note):null;
                  const notesSorted=[...(inv.notes||[])].sort((a,b)=>a.ts-b.ts);
                  const sym=CUR_SYM[inv.currency]||'';
                  const totalDiv=(inv.dividends||[]).reduce((s,d)=>s+Number(d.amount),0);
                  // 总收益 = 未实现 + 已实现 + 分红
                  const totalReturn=(pl||0)+pos.realizedPL+totalDiv;
                  const totalReturnPct=pos.totalCost>0?totalReturn/pos.totalCost*100:null;
                  const annRateTotal=(totalReturnPct!=null&&daysHeld!=null&&daysHeld>=1&&(1+totalReturnPct/100)>0)
                    ?(Math.pow(1+totalReturnPct/100,365/daysHeld)-1)*100:null;
                  return html`
                    <tr key=${inv.id}>
                      <td>
                        <span className="fw6">${inv.name}</span>
                        ${shortNote?html`<div className="txs tm">${shortNote}</div>`:null}
                        ${hasTrades?html`<div className="txs" style=${{color:'var(--gold)'}}>↕ ${(inv.trades||[]).length} 笔操作</div>`:null}
                      </td>
                      <td><span className="tag t-blue">${inv.type}</span></td>
                      <td className="tm">${inv.ticker||'—'}</td>
                      <td className="tm txs">${acc?acc.name:'—'}</td>
                      <td className="ts">${fmtDate(inv.buyDate)}</td>
                      <td><span className="tag t-gold">${inv.currency}</span></td>
                      <td className="fn">
                        ${fmtNum(pos.avgCost,4)}
                        ${hasTrades?html`<div className="txs tm">均价</div>`:null}
                      </td>
                      <td className="fn">
                        ${fmtNum(pos.effectiveQty,4)}
                        ${hasTrades?html`<div className="txs tm">有效量</div>`:null}
                      </td>
                      <td className="fn">${fmtNum(pos.totalCost)}</td>
                      <td><${InlinePriceEdit} value=${inv.currentPrice} currency=${inv.currency} onSave=${p=>updatePrice(inv,p)}/></td>
                      <td className="fn">${mv!==null?fmtNum(mv):html`<span className="tm">—</span>`}</td>
                      <td>${pl!==null
                        ?html`<div className=${'fn '+(pl>=0?'pl-pos':'pl-neg')}>${pl>=0?'+':''}${fmtNum(pl)}</div><div className=${'txs '+(plPct>=0?'pl-pos':'pl-neg')}>${plPct>=0?'+':''}${fmtNum(plPct,2)}%</div>`
                        :html`<span className="txs tm">待填现价</span>`}
                      </td>
                      <td>${pos.realizedPL!==0
                        ?html`<div className=${'fn '+(pos.realizedPL>=0?'pl-pos':'pl-neg')}>${pos.realizedPL>=0?'+':''}${fmtNum(pos.realizedPL)}</div>`
                        :html`<span className="txs tm">—</span>`}
                      </td>
                      <td>${totalDiv>0
                        ?html`<div className="fn pl-pos">+${fmtNum(totalDiv)}</div>
                              <div className="txs tm">${(inv.dividends||[]).length} 笔</div>`
                        :html`<button className="btn btn-ghost btn-xs tm" style=${{fontSize:11}} onClick=${()=>setDividendItem(inv)}>+记录</button>`}
                      </td>
                      <td>${annRateTotal!=null
                        ?html`<div className=${'fn '+(annRateTotal>=0?'pl-pos':'pl-neg')}>${annRateTotal>=0?'+':''}${fmtNum(annRateTotal,2)}%</div>
                             <div className="txs tm">${daysHeld} 天（含分红）</div>`
                        :html`<span className="txs tm">—</span>`}
                      </td>
                      <td>
                        ${notesSorted.length>0
                          ?html`<div className="fc g6" style=${{flexWrap:'wrap'}}>
                              ${notesSorted.map((n,i)=>html`
                                <span key=${n.id} onClick=${()=>setNotesItem(inv)}
                                  style=${{cursor:'pointer',color:'var(--gold)',textDecoration:'underline',fontSize:13,fontWeight:600,lineHeight:1.8}}>
                                  ${i+1}
                                </span>
                              `)}
                            </div>`
                          :html`<button className="btn btn-ghost btn-xs tm" onClick=${()=>setNotesItem(inv)}>+</button>`}
                      </td>
                      <td><div className="fc g4" style=${{flexWrap:'wrap'}}>
                        <button className="btn btn-sm" style=${{background:'rgba(82,200,122,.1)',color:'var(--ok)',border:'1px solid rgba(82,200,122,.2)',fontSize:11,padding:'3px 8px',borderRadius:4,cursor:'pointer',whiteSpace:'nowrap'}}
                          onClick=${()=>setTradeItem(inv)}>仓位</button>
                        <button className="btn btn-sm" style=${{background:'rgba(201,160,67,.1)',color:'var(--gold)',border:'1px solid rgba(201,160,67,.2)',fontSize:11,padding:'3px 8px',borderRadius:4,cursor:'pointer',whiteSpace:'nowrap'}}
                          onClick=${()=>setDividendItem(inv)}>💰分红</button>
                        <button className="btn btn-ghost btn-xs" onClick=${()=>{setEditItem(inv);setShowAdd(true);}}>编辑</button>
                        <button className="btn btn-danger btn-xs" onClick=${()=>deleteInvestment(inv.id)}>删除</button>
                      </div></td>
                    </tr>
                  `;
                })}
              </tbody>
            </table>
          </div>`}

      ${showAdd&&html`<${InvestmentModal} inv=${editItem} accounts=${data.accounts} onSave=${i=>{saveInvestment(i);setShowAdd(false);setEditItem(null);}} onClose=${()=>{setShowAdd(false);setEditItem(null);}}/>`}
      ${notesItem&&html`<${InvestmentNotesModal}
        inv=${data.investments.find(i=>i.id===notesItem.id)||notesItem}
        onAdd=${content=>{addInvestmentNote(notesItem.id,content);}}
        onDelete=${noteId=>deleteInvestmentNote(notesItem.id,noteId)}
        onClose=${()=>setNotesItem(null)}/>`}
      ${tradeItem&&html`<${TradeModal}
        inv=${data.investments.find(i=>i.id===tradeItem.id)||tradeItem}
        onAddTrade=${(trade)=>{addTrade(tradeItem.id,trade);}}
        onDeleteTrade=${(tradeId)=>deleteTrade(tradeItem.id,tradeId)}
        onClose=${()=>setTradeItem(null)}/>`}
      ${dividendItem&&html`<${DividendModal}
        inv=${data.investments.find(i=>i.id===dividendItem.id)||dividendItem}
        onAddDividend=${(div)=>{addDividend(dividendItem.id,div);}}
        onDeleteDividend=${(divId)=>deleteDividend(dividendItem.id,divId)}
        onClose=${()=>setDividendItem(null)}/>`}
    </div>
  `;
}
