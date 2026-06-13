// ── 回报率对比图 ──────────────────────────────────────────
function InvestmentROIChart({investments}){
  const [show,setShow]=useState(true);
  const [sortBy,setSortBy]=useState('roi');
  const chartData=useMemo(()=>{
    const items=[];
    investments.forEach(inv=>{
      const isFixed=(inv.category||'variable')==='fixed';
      if(isFixed){
        if(!inv.annualRate)return;
        const fr=calcFixedReturn(inv);
        items.push({id:inv.id,name:inv.name,category:'fixed',currency:inv.currency,
          roi:Number(inv.annualRate),absGain:fr?fr.totalReturn:null,
          roiLabel:'+'+Number(inv.annualRate).toFixed(2)+'%',metricNote:'年化'});
      } else {
        const pos=calcEffectivePosition(inv);
        const cost=pos.totalCost;
        if(inv.currentPrice==null||cost===0)return;
        const mv=Number(inv.currentPrice)*pos.effectiveQty;
        const pl=mv-cost+pos.realizedPL;
        const roiPct=pl/cost*100;
        items.push({id:inv.id,name:inv.name,category:'variable',currency:inv.currency,
          roi:roiPct,absGain:pl,
          roiLabel:(roiPct>=0?'+':'')+roiPct.toFixed(2)+'%',metricNote:'累计'});
      }
    });
    if(sortBy==='roi')items.sort((a,b)=>b.roi-a.roi);
    else items.sort((a,b)=>(b.absGain||0)-(a.absGain||0));
    return items;
  },[investments,sortBy]);
  if(chartData.length===0)return null;
  const maxPos=Math.max(...chartData.map(d=>Math.max(d.roi,0)),0.01);
  const maxNeg=Math.max(...chartData.map(d=>Math.max(-d.roi,0)),0.01);
  const hasNeg=chartData.some(d=>d.roi<0);
  const zeroPos=hasNeg?maxNeg/(maxPos+maxNeg):0;
  const barColor=d=>d.category==='fixed'?'var(--gold)':d.roi>=0?'#52C87A':'#E86060';
  return html`
    <div className="card mb20" style=${{padding:'16px 20px'}}>
      <div className="fb mb14" style=${{alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div className="fc g8">
          <span style=${{fontSize:16}}>📊</span>
          <span className="fw6 ts">回报率对比</span>
          <div className="fc g4" style=${{marginLeft:4}}>
            ${['roi','abs'].map(s=>html`
              <button key=${s} onClick=${()=>setSortBy(s)} style=${{fontSize:11,padding:'2px 8px',borderRadius:4,
                border:'1px solid rgba(255,255,255,.15)',cursor:'pointer',
                background:sortBy===s?'rgba(201,160,67,.2)':'transparent',
                color:sortBy===s?'var(--gold)':'var(--muted)',transition:'all .2s'}}>
                ${s==='roi'?'按ROI%':'按绝对收益'}
              </button>
            `)}
          </div>
        </div>
        <button className="btn btn-ghost btn-xs" onClick=${()=>setShow(p=>!p)}>${show?'收起 ▲':'展开 ▼'}</button>
      </div>
      ${show&&html`
        <div style=${{display:'flex',flexDirection:'column',gap:6}}>
          ${chartData.map((d,i)=>{
            const isPos=d.roi>=0;
            const barW=isPos?(d.roi/maxPos)*(1-zeroPos)*100:(Math.abs(d.roi)/maxNeg)*zeroPos*100;
            const medal=['#FFD700','#C0C0C0','#CD7F32'];
            return html`
              <div key=${d.id} style=${{display:'grid',gridTemplateColumns:'24px 1fr 80px',alignItems:'center',gap:10}}>
                <div style=${{textAlign:'center',fontSize:12,color:i<3?medal[i]:'var(--muted)',fontWeight:i<3?700:400}}>${i+1}</div>
                <div>
                  <div className="fc g6 mb4">
                    <span style=${{fontSize:10,padding:'1px 5px',borderRadius:3,flexShrink:0,
                      background:d.category==='fixed'?'rgba(201,160,67,.15)':'rgba(74,144,217,.15)',
                      color:d.category==='fixed'?'var(--gold)':'#4A90D9'}}>
                      ${d.category==='fixed'?'固定':'浮动'}
                    </span>
                    <span style=${{fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>${d.name}</span>
                    <span style=${{fontSize:10,color:'var(--muted)',flexShrink:0}}>${d.metricNote}</span>
                  </div>
                  <div style=${{position:'relative',height:18,borderRadius:3,overflow:'hidden'}}>
                    <div style=${{position:'absolute',inset:0,background:'rgba(255,255,255,.03)',borderRadius:3}}/>
                    ${hasNeg&&html`<div style=${{position:'absolute',left:(zeroPos*100)+'%',top:0,bottom:0,width:1,background:'rgba(255,255,255,.2)',zIndex:2}}/>`}
                    <div style=${{
                      position:'absolute',
                      ...(isPos?{left:(zeroPos*100)+'%',borderRadius:'0 3px 3px 0'}:{right:((1-zeroPos)*100)+'%',borderRadius:'3px 0 0 3px'}),
                      width:barW+'%',height:'100%',background:barColor(d),opacity:.85,transition:'width .5s',zIndex:1
                    }}/>
                  </div>
                </div>
                <div style=${{textAlign:'right',fontWeight:700,fontSize:13,fontFamily:'monospace',
                  color:barColor(d),flexShrink:0}}>${d.roiLabel}</div>
              </div>
            `;
          })}
        </div>
        <div className="fc g16 mt14" style=${{justifyContent:'flex-end',flexWrap:'wrap',gap:8}}>
          ${[['var(--gold)','固定收益（年化率）'],['#52C87A','浮动盈利'],['#E86060','浮动亏损']].map(([c,l])=>html`
            <div key=${l} className="fc g5 txs" style=${{color:'var(--muted)'}}>
              <span style=${{width:10,height:10,borderRadius:2,background:c,display:'inline-block',flexShrink:0}}/>
              ${l}
            </div>
          `)}
        </div>
      `}
    </div>
  `;
}

// ── 固定收益卡片 ──────────────────────────────────────────
function FixedInvCard({inv,accName,onEdit,onDelete,onSettle,onNotes}){
  const fr=calcFixedReturn(inv);
  const sym=CUR_SYM[inv.currency]||'';
  const isSettled=!!inv.settled;
  const dl=fr?fr.daysLeft:null;
  const isMatured=fr&&fr.isMatured;
  const urgent=!isSettled&&dl!=null&&dl<=3;
  const noteCount=(inv.notes||[]).length;

  const statusTag=()=>{
    if(isSettled)return html`<span className="tag" style=${{background:'rgba(100,100,100,.15)',color:'var(--muted)'}}>已结算</span>`;
    if(isMatured)return html`<span className="tag t-red">已到期</span>`;
    if(urgent)return html`<span className="tag t-red">临近到期</span>`;
    return html`<span className="tag t-blue">持有中</span>`;
  };

  return html`
    <div className="card" style=${{opacity:isSettled?0.6:1,display:'flex',flexDirection:'column',gap:0,padding:0,overflow:'hidden'}}>
      <!-- 头部 -->
      <div style=${{padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
        <div className="fb mb6">
          <div className="fc g8" style=${{flexWrap:'wrap',gap:6}}>
            <span className="tag t-blue" style=${{fontSize:10}}>${inv.type}</span>
            ${statusTag()}
          </div>
          <span style=${{fontFamily:'var(--fh)',fontSize:20,color:'var(--gold)',fontWeight:600}}>
            ${sym}${fr?fmtNum(fr.principal):'—'}
          </span>
        </div>
        <div className="fw6 ts mb2">${inv.name}</div>
        <div className="txs tm">${accName?accName+' · ':''}${inv.currency}${inv.note?' · '+inv.note:''}</div>
      </div>

      <!-- 数据行 -->
      <div style=${{padding:'12px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 20px',borderBottom:'1px solid var(--border)'}}>
        <div>
          <div className="txs tm mb2">年化利率</div>
          <div className="fn" style=${{color:'var(--gold)',fontSize:16}}>${inv.annualRate?inv.annualRate+'%':'—'}</div>
        </div>
        <div>
          <div className="txs tm mb2">${isSettled?'已计收益':'到期总收益'}</div>
          <div className="fn pl-pos" style=${{fontSize:16}}>+${sym}${fr?fmtNum(isSettled?fr.totalReturn:fr.totalReturn):'—'}</div>
        </div>
        <div>
          <div className="txs tm mb2">购入日</div>
          <div className="ts">${fmtDate(inv.buyDate)}</div>
        </div>
        <div>
          <div className="txs tm mb2">到期日</div>
          <div className="ts" style=${{color:urgent?'var(--err)':undefined}}>${fmtDate(inv.maturityDate)}</div>
        </div>
        ${!isSettled&&dl!=null?html`
          <div style=${{gridColumn:'1/-1'}}>
            <div className="txs tm mb2">剩余时间</div>
            <div className="ts" style=${{color:isMatured?'var(--err)':urgent?'var(--gold)':'var(--ok)'}}>
              ${isMatured?'已到期':dl===0?'今日到期':'还有 '+dl+' 天'}
            </div>
          </div>
        `:null}
        ${fr&&!isSettled?html`
          <div>
            <div className="txs tm mb2">已计利息</div>
            <div className="fn pl-pos">+${sym}${fmtNum(fr.accrued)}</div>
          </div>
        `:null}
      </div>

      <!-- 操作栏 -->
      <div className="fc g6" style=${{padding:'10px 16px',flexWrap:'wrap'}}>
        ${!isSettled&&isMatured?html`
          <button className="btn btn-sm" style=${{background:'rgba(82,200,122,.12)',color:'var(--ok)',border:'1px solid rgba(82,200,122,.25)'}}
            onClick=${onSettle}>✅ 结算</button>
        `:null}
        <button className="btn btn-ghost btn-xs" onClick=${onNotes}>
          📝${noteCount>0?html`<span style=${{color:'var(--gold)',marginLeft:3}}>${noteCount}</span>`:'备注'}
        </button>
        ${!isSettled?html`<button className="btn btn-ghost btn-xs" onClick=${onEdit}>编辑</button>`:null}
        <button className="btn btn-danger btn-xs" onClick=${onDelete}>删除</button>
      </div>
    </div>
  `;
}

// ── 非固定收益卡片 ────────────────────────────────────────
function VarInvCard({inv,accName,onEdit,onDelete,onTrade,onDividend,onNotes,onPriceUpdate,onClear}){
  const pos=calcEffectivePosition(inv);
  const sym=CUR_SYM[inv.currency]||'';
  const hasCur=inv.currentPrice!=null;
  const mv=hasCur?Number(inv.currentPrice)*pos.effectiveQty:null;
  const pl=hasCur?mv-pos.totalCost:null;
  const plPct=hasCur&&pos.totalCost?pl/pos.totalCost*100:null;
  const totalDiv=(inv.dividends||[]).reduce((s,d)=>s+Number(d.amount),0);
  const today=new Date();today.setHours(0,0,0,0);
  const daysHeld=inv.buyDate?Math.max(1,Math.floor((today-new Date(inv.buyDate))/86400000)):null;
  const totalReturn=(pl||0)+pos.realizedPL+totalDiv;
  const totalReturnPct=pos.totalCost>0?totalReturn/pos.totalCost*100:null;
  const annRate=(totalReturnPct!=null&&daysHeld&&(1+totalReturnPct/100)>0)
    ?(Math.pow(1+totalReturnPct/100,365/daysHeld)-1)*100:null;
  const hasTrades=(inv.trades||[]).length>0;
  const noteCount=(inv.notes||[]).length;

  return html`
    <div className="card" style=${{display:'flex',flexDirection:'column',gap:0,padding:0,overflow:'hidden'}}>
      <!-- 头部 -->
      <div style=${{padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
        <div className="fb mb6">
          <div className="fc g6" style=${{flexWrap:'wrap'}}>
            <span className="tag t-blue" style=${{fontSize:10}}>${inv.type}</span>
            ${inv.ticker?html`<span className="tag" style=${{background:'rgba(255,255,255,.06)',color:'var(--muted)',fontSize:10}}>${inv.ticker}</span>`:null}
          </div>
          <div className="tr">
            ${mv!==null
              ?html`<div className="fh fn" style=${{fontSize:18,color:'var(--gold)'}}>${sym}${fmtNum(mv)}</div>`
              :html`<div className="txs tm">待填现价</div>`
            }
          </div>
        </div>
        <div className="fw6 ts mb2">${inv.name}</div>
        <div className="txs tm">${accName?accName+' · ':''}${inv.currency} · 持有 ${daysHeld||'—'} 天</div>
      </div>

      <!-- 盈亏 -->
      ${pl!==null?html`
        <div style=${{padding:'10px 16px',background:pl>=0?'rgba(82,214,138,.05)':'rgba(240,128,128,.05)',borderBottom:'1px solid var(--border)'}}>
          <div className="fc g12" style=${{flexWrap:'wrap'}}>
            <div>
              <div className="txs tm mb1">未实现盈亏</div>
              <div className=${'fn '+(pl>=0?'pl-pos':'pl-neg')} style=${{fontSize:13}}>
                ${pl>=0?'+':''}${sym}${fmtNum(pl)}
                <span className="txs" style=${{marginLeft:4}}>(${plPct>=0?'+':''}${fmtNum(plPct,2)}%)</span>
              </div>
            </div>
            ${annRate!==null?html`
              <div>
                <div className="txs tm mb1">年化收益率</div>
                <div className=${'fn '+(annRate>=0?'pl-pos':'pl-neg')} style=${{fontSize:13}}>
                  ${annRate>=0?'+':''}${fmtNum(annRate,2)}%
                </div>
              </div>
            `:null}
          </div>
        </div>
      `:null}

      <!-- 持仓详情 -->
      <div style=${{padding:'12px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 20px',borderBottom:'1px solid var(--border)'}}>
        <div>
          <div className="txs tm mb1">持仓成本</div>
          <div className="fn" style=${{fontSize:15}}>${sym}${fmtNum(pos.totalCost)}</div>
        </div>
        <div>
          <div className="txs tm mb1">均价 / 持仓量</div>
          <div className="fn" style=${{fontSize:15}}>${fmtNum(pos.avgCost,4)} / ${fmtNum(pos.effectiveQty,4)}</div>
          ${hasTrades?html`<div className="txs tm">含 ${(inv.trades||[]).length} 笔操作</div>`:null}
        </div>
        <div>
          <div className="txs tm mb1">现价</div>
          <${InlinePriceEdit} value=${inv.currentPrice} currency=${inv.currency} onSave=${onPriceUpdate}/>
        </div>
        ${pos.realizedPL!==0?html`
          <div>
            <div className="txs tm mb1">已实现盈亏</div>
            <div className=${'fn '+(pos.realizedPL>=0?'pl-pos':'pl-neg')}>
              ${pos.realizedPL>=0?'+':''}${sym}${fmtNum(pos.realizedPL)}
            </div>
          </div>
        `:null}
        ${totalDiv>0?html`
          <div>
            <div className="txs tm mb1">累计分红</div>
            <div className="fn pl-pos">+${sym}${fmtNum(totalDiv)} <span className="txs tm">${(inv.dividends||[]).length}笔</span></div>
          </div>
        `:null}
      </div>

      <!-- 操作栏 -->
      <div className="fc g6" style=${{padding:'10px 16px',flexWrap:'wrap'}}>
        <button className="btn btn-sm" style=${{background:'rgba(82,200,122,.1)',color:'var(--ok)',border:'1px solid rgba(82,200,122,.2)' }}
          onClick=${onTrade}>📈 仓位</button>
        <button className="btn btn-sm" style=${{background:'rgba(201,160,67,.1)',color:'var(--gold)',border:'1px solid rgba(201,160,67,.2)' }}
          onClick=${onDividend}>💰 分红</button>
        <button className="btn btn-ghost btn-xs" onClick=${onNotes}>
          📝${noteCount>0?html`<span style=${{color:'var(--gold)',marginLeft:3}}>${noteCount}</span>`:'备注'}
        </button>
        <button className="btn btn-ghost btn-xs" onClick=${onEdit}>编辑</button>
        ${pos.effectiveQty>0?html`
          <button className="btn btn-xs" style=${{background:'rgba(240,128,128,.1)',color:'var(--err)',border:'1px solid rgba(240,128,128,.2)'}}
            onClick=${onClear}>🏳 清仓</button>
        `:null}
        <button className="btn btn-danger btn-xs" onClick=${onDelete}>删除</button>
      </div>
    </div>
  `;
}

// ── 清仓确认 Modal ────────────────────────────────────────
function ClearPositionModal({inv,onConfirm,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const pos=calcEffectivePosition(inv);
  const sym=CUR_SYM[inv.currency]||'';
  const [sellPrice,setSellPrice]=useState(inv.currentPrice!=null?String(inv.currentPrice):'');
  const [sellDate,setSellDate]=useState(today);
  const [note,setNote]=useState('');

  const priceN=parseFloat(sellPrice);
  const valid=!isNaN(priceN)&&priceN>0&&sellDate;
  const totalReceived=valid?priceN*pos.effectiveQty:null;
  const tradePL=valid?pos.effectiveQty*(priceN-pos.avgCost):null;
  const totalDiv=(inv.dividends||[]).reduce((s,d)=>s+Number(d.amount),0);
  const totalPL=tradePL!=null?tradePL+pos.realizedPL+totalDiv:null;
  const totalPLPct=totalPL!=null&&pos.totalCost>0?totalPL/pos.totalCost*100:null;

  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:480}}>
        <div className="modal-title">🏳 确认清仓 · ${inv.name}</div>

        <!-- 当前持仓摘要 -->
        <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px',marginBottom:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 16px'}}>
          <div><div className="txs tm mb1">持仓量</div><div className="fn ts">${fmtNum(pos.effectiveQty,4)}</div></div>
          <div><div className="txs tm mb1">加权均价</div><div className="fn ts">${sym}${fmtNum(pos.avgCost,4)}</div></div>
          <div><div className="txs tm mb1">持仓成本</div><div className="fn ts">${sym}${fmtNum(pos.totalCost)}</div></div>
          ${pos.realizedPL!==0?html`<div><div className="txs tm mb1">已实现盈亏</div>
            <div className=${'fn '+(pos.realizedPL>=0?'pl-pos':'pl-neg')}>${pos.realizedPL>=0?'+':''}${sym}${fmtNum(pos.realizedPL)}</div></div>`:null}
        </div>

        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">清仓日期 *</div>
            <input className="inp" type="date" value=${sellDate} onChange=${e=>setSellDate(e.target.value)}/>
          </div>
          <div className="inp-group"><div className="inp-label">清仓价格 *</div>
            <input className="inp" type="number" step="any" min="0" autoFocus
              placeholder=${'每股/份 '+sym} value=${sellPrice}
              onChange=${e=>setSellPrice(e.target.value)}/>
          </div>
        </div>
        <div className="inp-group"><div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder="例：止盈清仓、换仓操作" value=${note} onChange=${e=>setNote(e.target.value)}/>
        </div>

        <!-- 清仓预览 -->
        ${valid&&html`
          <div style=${{background:totalPL>=0?'rgba(82,200,122,.07)':'rgba(240,128,128,.07)',
            border:'1px solid '+(totalPL>=0?'rgba(82,200,122,.2)':'rgba(240,128,128,.2)'),
            borderRadius:8,padding:'10px 14px',marginBottom:12}}>
            <div className="txs fw6 mb6" style=${{color:'var(--ok)'}}>清仓结果预览</div>
            <div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 16px'}}>
              <div className="fb"><span className="txs tm">卖出数量</span><span className="fn ts">${fmtNum(pos.effectiveQty,4)}</span></div>
              <div className="fb"><span className="txs tm">到账金额</span><span className="fn tg">${sym}${fmtNum(totalReceived)}</span></div>
              <div className="fb"><span className="txs tm">本次交易盈亏</span>
                <span className=${'fn '+(tradePL>=0?'pl-pos':'pl-neg')}>${tradePL>=0?'+':''}${sym}${fmtNum(tradePL)}</span></div>
              <div className="fb" style=${{gridColumn:'1/-1',borderTop:'1px solid rgba(128,128,128,.15)',paddingTop:6,marginTop:2}}>
                <span className="txs tm">总盈亏（含已实现+分红）</span>
                <span className=${'fn '+(totalPL>=0?'pl-pos':'pl-neg')}>
                  ${totalPL>=0?'+':''}${sym}${fmtNum(totalPL)}
                  ${totalPLPct!=null?html`<span className="txs" style=${{marginLeft:4}}>(${totalPLPct>=0?'+':''}${fmtNum(totalPLPct,2)}%)</span>`:''}
                </span>
              </div>
            </div>
          </div>
        `}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn" style=${{background:'rgba(240,128,128,.15)',color:'var(--err)',border:'1px solid rgba(240,128,128,.3)'}}
            onClick=${()=>valid&&onConfirm({sellPrice:priceN,sellDate,note:note.trim()})}
            disabled=${!valid}>
            🏳 确认清仓
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── 非固定收益历史档案卡片 ────────────────────────────────
function VarInvArchiveCard({inv,accName,onDelete}){
  const pos=calcEffectivePosition(inv);
  const sym=CUR_SYM[inv.currency]||'';
  const totalDiv=(inv.dividends||[]).reduce((s,d)=>s+Number(d.amount),0);
  const totalPL=pos.realizedPL+totalDiv;
  const totalPLPct=pos.totalCost>0?totalPL/pos.totalCost*100:null;
  const buyDate=inv.buyDate?new Date(inv.buyDate):null;
  const clearDate=inv.clearedDate?new Date(inv.clearedDate):null;
  const days=(buyDate&&clearDate)?Math.max(1,Math.floor((clearDate-buyDate)/86400000)):null;
  const annRate=(totalPLPct!=null&&days&&(1+totalPLPct/100)>0)
    ?(Math.pow(1+totalPLPct/100,365/days)-1)*100:null;

  return html`
    <div className="card" style=${{padding:0,overflow:'hidden',border:'1px solid rgba(201,160,67,.15)',opacity:.85}}>
      <!-- 头部 -->
      <div style=${{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
        <div className="fb mb4">
          <div className="fc g6">
            <span className="tag" style=${{background:'rgba(100,100,100,.12)',color:'var(--muted)',fontSize:10}}>${inv.type}</span>
            ${inv.ticker?html`<span className="tag" style=${{background:'rgba(255,255,255,.06)',color:'var(--muted)',fontSize:10}}>${inv.ticker}</span>`:null}
            <span className="tag" style=${{background:'rgba(201,160,67,.12)',color:'var(--gold)',fontSize:10}}>🏳 已清仓</span>
          </div>
          <span className="fn" style=${{color:'var(--gold)',fontSize:16}}>${sym}${fmtNum(pos.totalCost)}</span>
        </div>
        <div className="fw6 ts">${inv.name}</div>
        <div className="txs tm mt2">${accName?accName+' · ':''}${inv.currency}${days?html` · 持有 ${days} 天`:''}</div>
      </div>
      <!-- 数据 -->
      <div style=${{padding:'10px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 20px',borderBottom:'1px solid var(--border)'}}>
        <div>
          <div className="txs tm mb1">总盈亏（实现+分红）</div>
          <div className=${'fn '+(totalPL>=0?'pl-pos':'pl-neg')}>
            ${totalPL>=0?'+':''}${sym}${fmtNum(totalPL)}
          </div>
          ${totalPLPct!=null?html`<div className=${'txs '+(totalPLPct>=0?'pl-pos':'pl-neg')}>${totalPLPct>=0?'+':''}${fmtNum(totalPLPct,2)}%</div>`:null}
        </div>
        <div>
          <div className="txs tm mb1">年化收益率</div>
          ${annRate!=null?html`
            <div className=${'fn '+(annRate>=0?'pl-pos':'pl-neg')}>${annRate>=0?'+':''}${fmtNum(annRate,2)}%</div>
          `:html`<div className="fn ts">—</div>`}
        </div>
        <div>
          <div className="txs tm mb1">持仓区间</div>
          <div className="ts">${fmtDate(inv.buyDate)} → ${fmtDate(inv.clearedDate)}</div>
        </div>
        <div>
          <div className="txs tm mb1">清仓价 / 到账</div>
          <div className="ts">${sym}${fmtNum(inv.clearedPrice,4)}</div>
          <div className="fn tg" style=${{marginTop:2}}>${sym}${fmtNum(inv.clearedAmount)}</div>
        </div>
        ${totalDiv>0?html`
          <div>
            <div className="txs tm mb1">累计分红</div>
            <div className="fn pl-pos">+${sym}${fmtNum(totalDiv)}</div>
          </div>
        `:null}
      </div>
      <!-- 操作 -->
      <div className="fc g6" style=${{padding:'8px 16px'}}>
        <button className="btn btn-danger btn-xs" onClick=${onDelete}>删除档案</button>
      </div>
    </div>
  `;
}

// ── 收益概览面板 ──────────────────────────────────────────
// ── 对比基准 Modal ────────────────────────────────────────
function BenchmarkModal({bench,onSave,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const [f,sf]=useState({
    name:bench?.name||'',
    symbol:bench?.symbol||'',
    startDate:bench?.startDate||today,
    startPrice:bench?.startPrice!=null?String(bench.startPrice):'',
    currentPrice:bench?.currentPrice!=null?String(bench.currentPrice):'',
    note:bench?.note||'',
  });
  const set=k=>e=>sf(x=>({...x,[k]:e.target.value}));
  const canSave=f.name.trim()&&Number(f.startPrice)>0&&f.startDate;

  const applyPreset=p=>{
    sf(x=>({...x,name:p.name,symbol:p.symbol}));
  };

  const submit=()=>{
    if(!canSave)return;
    onSave({...bench,...f,
      startPrice:Number(f.startPrice),
      currentPrice:f.currentPrice!==''?Number(f.currentPrice):null,
    });
  };

  const ret=(Number(f.currentPrice)>0&&Number(f.startPrice)>0)
    ?(Number(f.currentPrice)-Number(f.startPrice))/Number(f.startPrice)*100:null;
  const days=f.startDate?Math.floor((new Date()-new Date(f.startDate))/86400000):null;

  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:440}}>
        <div className="modal-title">${bench?'编辑基准':'添加对比基准'}</div>

        <!-- 预设选择 -->
        ${!bench?html`
          <div className="inp-group">
            <div className="inp-label">快速选择</div>
            <div style=${{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
              ${BENCHMARK_PRESETS.map(p=>html`
                <button key=${p.name} onClick=${()=>applyPreset(p)}
                  style=${{padding:'3px 10px',borderRadius:16,fontSize:12,cursor:'pointer',
                    border:'1px solid rgba(255,255,255,.15)',background:'transparent',
                    color:'var(--muted)',transition:'all .15s'}}
                  onMouseOver=${e=>{e.target.style.borderColor='var(--gold)';e.target.style.color='var(--gold)';}}
                  onMouseOut=${e=>{e.target.style.borderColor='rgba(255,255,255,.15)';e.target.style.color='var(--muted)';}}>
                  ${p.name}
                </button>
              `)}
            </div>
          </div>
        `:null}

        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">基准名称 *</div>
            <input className="inp" placeholder="例：标普500、我的参考组合" autoFocus
              value=${f.name} onChange=${set('name')}/>
          </div>
          <div className="inp-group"><div className="inp-label">代码（可选）</div>
            <input className="inp" placeholder="^GSPC、^HSI" value=${f.symbol} onChange=${set('symbol')}/>
          </div>
        </div>

        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">起始日期 *</div>
            <input className="inp" type="date" value=${f.startDate} onChange=${set('startDate')}/>
          </div>
          <div className="inp-group"><div className="inp-label">起始价格 *</div>
            <input className="inp" type="number" step="any" min="0" placeholder="买入当日收盘价"
              value=${f.startPrice} onChange=${set('startPrice')}/>
          </div>
        </div>

        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">当前价格（可选）</div>
            <input className="inp" type="number" step="any" min="0" placeholder="留空后续手动更新"
              value=${f.currentPrice} onChange=${set('currentPrice')}/>
          </div>
          <div className="inp-group"><div className="inp-label">备注</div>
            <input className="inp" placeholder="可选" value=${f.note} onChange=${set('note')}
              onKeyDown=${e=>e.key==='Enter'&&submit()}/>
          </div>
        </div>

        ${ret!==null?html`
          <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px',marginBottom:12}}>
            <div className="fc g16 txs">
              <span className="tm">持有 ${days} 天</span>
              <span className=${'fw6 '+(ret>=0?'pl-pos':'pl-neg')}>
                基准涨跌：${ret>=0?'+':''}${fmtNum(ret,2)}%
              </span>
            </div>
          </div>
        `:null}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn btn-gold" onClick=${submit} disabled=${!canSave}>保存</button>
        </div>
      </div>
    </div>
  `;
}

// ── 对比基准区块 ──────────────────────────────────────────
function BenchmarkSection({benchmarks,varInvestments,onSave,onDelete}){
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [fetching,setFetching]=useState({});
  const [fetchErr,setFetchErr]=useState({});

  // 各货币持仓总收益率（用于对比）
  const portfolioByCur=useMemo(()=>{
    const map={};
    varInvestments.filter(i=>!i.cleared).forEach(inv=>{
      const pos=calcEffectivePosition(inv);
      const cur=inv.currency;
      if(!map[cur])map[cur]={cost:0,market:0};
      map[cur].cost+=pos.totalCost;
      if(inv.currentPrice!=null)map[cur].market+=Number(inv.currentPrice)*pos.effectiveQty;
      else map[cur].market+=pos.totalCost;
    });
    Object.keys(map).forEach(cur=>{
      const s=map[cur];
      s.retPct=s.cost>0?(s.market-s.cost)/s.cost*100:null;
    });
    return map;
  },[varInvestments]);

  // 自动拉取 Yahoo Finance 当前价
  const fetchPrice=async b=>{
    if(!b.symbol)return;
    setFetching(p=>({...p,[b.id]:true}));
    setFetchErr(p=>({...p,[b.id]:''}));
    try{
      const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(b.symbol)}?interval=1d&range=1d`;
      const r=await fetch(url);
      const j=await r.json();
      const price=j?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if(price){onSave({...b,currentPrice:price});}
      else setFetchErr(p=>({...p,[b.id]:'获取失败，请手动输入'}));
    }catch{setFetchErr(p=>({...p,[b.id]:'网络错误'}))}
    setFetching(p=>({...p,[b.id]:false}));
  };

  if(benchmarks.length===0&&!showAdd)return html`
    <div className="card mb20" style=${{padding:'16px 20px'}}>
      <div className="fb" style=${{alignItems:'center'}}>
        <div className="fc g8">
          <span style=${{fontSize:16}}>📊</span>
          <span className="fw6 ts">对比基准</span>
          <span className="txs tm">与指数/基准对比超额收益</span>
        </div>
        <button className="btn btn-ghost btn-xs" onClick=${()=>setShowAdd(true)}>+ 添加基准</button>
      </div>
      ${showAdd&&html`<${BenchmarkModal} onSave=${b=>{onSave(b);setShowAdd(false);}} onClose=${()=>setShowAdd(false)}/>`}
    </div>
  `;

  return html`
    <div className="card mb20" style=${{padding:'16px 20px'}}>
      <div className="fb mb16" style=${{alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div className="fc g8">
          <span style=${{fontSize:16}}>📊</span>
          <span className="fw6 ts">对比基准</span>
        </div>
        <button className="btn btn-ghost btn-xs" onClick=${()=>{setEditItem(null);setShowAdd(true);}}>+ 添加</button>
      </div>

      <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
        ${benchmarks.map(b=>{
          const ret=(b.currentPrice!=null&&b.startPrice>0)
            ?(b.currentPrice-b.startPrice)/b.startPrice*100:null;
          const days=b.startDate?Math.floor((new Date()-new Date(b.startDate))/86400000):null;
          const sym=CUR_SYM[BENCHMARK_PRESETS.find(p=>p.symbol===b.symbol)?.currency||'']||'';
          const portRet=portfolioByCur[BENCHMARK_PRESETS.find(p=>p.symbol===b.symbol)?.currency||'']?.retPct??null;
          const alpha=ret!==null&&portRet!==null?portRet-ret:null;
          const isFetching=fetching[b.id];

          return html`
            <div key=${b.id} style=${{background:'var(--bg3)',borderRadius:10,padding:'14px 16px',
              position:'relative',border:'1px solid var(--border)'}}>
              <!-- 头部 -->
              <div className="fb mb10">
                <div>
                  <div className="ts fw6">${b.name}</div>
                  ${b.symbol?html`<div className="txs tm">${b.symbol}${days!=null?' · '+days+'天':''}</div>`:null}
                </div>
                <div className="fc g4">
                  <button className="btn btn-ghost btn-ico" title="编辑"
                    onClick=${()=>{setEditItem(b);setShowAdd(true);}}>✎</button>
                  <button className="btn btn-danger btn-ico" onClick=${()=>onDelete(b.id)}>✕</button>
                </div>
              </div>

              <!-- 价格行 -->
              <div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 16px',marginBottom:10}}>
                <div>
                  <div className="txs tm mb1">起始价</div>
                  <div className="fn ts">${fmtNum(b.startPrice,2)}</div>
                  <div className="txs tm">${fmtDate(b.startDate)}</div>
                </div>
                <div>
                  <div className="txs tm mb1 fc g4">
                    当前价
                    ${b.symbol?html`
                      <button className="btn btn-ghost btn-xs" style=${{padding:'0 5px',fontSize:10}}
                        onClick=${()=>fetchPrice(b)} disabled=${isFetching}>
                        ${isFetching?'…':'↻'}
                      </button>
                    `:null}
                  </div>
                  <${InlinePriceEdit} value=${b.currentPrice} currency=""
                    onSave=${p=>onSave({...b,currentPrice:p})}/>
                  ${fetchErr[b.id]?html`<div className="txs" style=${{color:'var(--err)',marginTop:2}}>${fetchErr[b.id]}</div>`:null}
                </div>
              </div>

              <!-- 涨跌幅 vs 持仓 -->
              <div style=${{borderTop:'1px solid var(--border)',paddingTop:8,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                <div>
                  <div className="txs tm mb1">基准</div>
                  ${ret!==null
                    ?html`<div className=${'fn fw6 '+(ret>=0?'pl-pos':'pl-neg')}>${ret>=0?'+':''}${fmtNum(ret,2)}%</div>`
                    :html`<div className="txs tm">待填价格</div>`}
                </div>
                <div>
                  <div className="txs tm mb1">持仓</div>
                  ${portRet!==null
                    ?html`<div className=${'fn fw6 '+(portRet>=0?'pl-pos':'pl-neg')}>${portRet>=0?'+':''}${fmtNum(portRet,2)}%</div>`
                    :html`<div className="txs tm">—</div>`}
                </div>
                <div>
                  <div className="txs tm mb1">超额</div>
                  ${alpha!==null
                    ?html`<div className=${'fn fw6 '+(alpha>=0?'pl-pos':'pl-neg')} style=${{fontSize:15}}>
                      ${alpha>=0?'+':''}${fmtNum(alpha,2)}%
                    </div>`
                    :html`<div className="txs tm">—</div>`}
                </div>
              </div>

              ${b.note?html`<div className="txs tm mt8">📝 ${b.note}</div>`:null}
            </div>
          `;
        })}
      </div>

      ${showAdd&&html`<${BenchmarkModal} bench=${editItem}
        onSave=${b=>{onSave(b);setShowAdd(false);setEditItem(null);}}
        onClose=${()=>{setShowAdd(false);setEditItem(null);}}/>`}
    </div>
  `;
}

function InvestmentIncomePanel({investments}){
  const [show,setShow]=useState(true);
  const today=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return d;},[]);

  // 固定收益（活跃）按币种
  const fixedByCur=useMemo(()=>{
    const map={};
    investments.filter(i=>(i.category||'variable')==='fixed'&&!i.settled).forEach(inv=>{
      const fr=calcFixedReturn(inv);
      if(!fr||!inv.annualRate)return;
      const cur=inv.currency;
      if(!map[cur])map[cur]={principal:0,annualIncome:0};
      const annual=fr.principal*Number(inv.annualRate)/100;
      map[cur].principal+=fr.principal;
      map[cur].annualIncome+=annual;
    });
    Object.values(map).forEach(s=>{
      s.monthlyIncome=s.annualIncome/12;
      s.annualRate=s.principal>0?s.annualIncome/s.principal*100:0;
    });
    return map;
  },[investments]);

  // 非固定收益按币种
  const varByCur=useMemo(()=>{
    const map={};
    investments.filter(i=>(i.category||'variable')==='variable').forEach(inv=>{
      const pos=calcEffectivePosition(inv);
      const cur=inv.currency;
      const totalDiv=(inv.dividends||[]).reduce((s,d)=>s+Number(d.amount),0);
      const mv=inv.currentPrice!=null?Number(inv.currentPrice)*pos.effectiveQty:null;
      const unrealizedPL=mv!==null?mv-pos.totalCost:0;
      const totalReturn=unrealizedPL+pos.realizedPL+totalDiv;
      const days=inv.buyDate?Math.max(1,Math.floor((today-new Date(inv.buyDate))/86400000)):365;
      if(!map[cur])map[cur]={cost:0,totalReturn:0,_costDays:0,hasAnyPrice:false};
      map[cur].cost+=pos.totalCost;
      map[cur].totalReturn+=totalReturn;
      map[cur]._costDays+=pos.totalCost*days;
      if(inv.currentPrice!=null)map[cur].hasAnyPrice=true;
    });
    Object.values(map).forEach(s=>{
      const avgDays=s.cost>0?s._costDays/s.cost:365;
      const r=s.cost>0?s.totalReturn/s.cost:0;
      if(s.cost>0&&avgDays>=1&&(1+r)>0){
        s.annualRate=(Math.pow(1+r,365/avgDays)-1)*100;
        s.annualIncome=s.cost*s.annualRate/100;
        s.monthlyIncome=s.annualIncome/12;
      }else{
        s.annualRate=null;s.annualIncome=null;s.monthlyIncome=null;
      }
      s.totalReturnPct=s.cost>0?r*100:0;
    });
    return map;
  },[investments,today]);

  const allCurs=useMemo(()=>
    [...new Set([...Object.keys(fixedByCur),...Object.keys(varByCur)])].sort()
  ,[fixedByCur,varByCur]);

  if(allCurs.length===0)return null;

  return html`
    <div className="card mb16" style=${{padding:'16px 20px'}}>
      <div className="fb mb14" style=${{alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div className="fc g8">
          <span style=${{fontSize:16}}>💹</span>
          <span className="fw6 ts">收益概览</span>
          <span className="txs tm">本金 · 月收益 · 年收益 · 年化率</span>
        </div>
        <button className="btn btn-ghost btn-xs" onClick=${()=>setShow(p=>!p)}>${show?'收起 ▲':'展开 ▼'}</button>
      </div>

      ${show&&html`<div>
        ${allCurs.map(cur=>{
          const fx=fixedByCur[cur];
          const vr=varByCur[cur];
          const sym=CUR_SYM[cur]||'';
          const totalPrincipal=(fx?.principal||0)+(vr?.cost||0);
          const fixedAnnual=fx?.annualIncome||0;
          const varAnnual=vr?.annualIncome||0;
          const totalAnnualIncome=fixedAnnual+(vr?.annualIncome!=null?varAnnual:0);
          const totalMonthly=totalAnnualIncome/12;
          const overallRate=totalPrincipal>0?totalAnnualIncome/totalPrincipal*100:null;
          const hasBoth=!!(fx&&vr);

          return html`
            <div key=${cur} style=${{marginBottom:allCurs.length>1?16:0}}>
              ${allCurs.length>1?html`
                <div className="fc g8 mb10" style=${{alignItems:'center'}}>
                  <span style=${{color:'var(--gold)',fontWeight:700,fontSize:13}}>${cur}</span>
                  <span style=${{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/>
                </div>
              `:null}

              <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(148px,1fr))',gap:10}}>

                <!-- 总投入本金 -->
                <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px'}}>
                  <div className="txs tm mb4">总投入本金</div>
                  <div className="fn ts" style=${{fontSize:17}}>${sym}${fmtNum(totalPrincipal)}</div>
                  ${hasBoth?html`
                    <div className="txs tm mt3">
                      固 ${sym}${fmtNum(fx.principal)}
                      <span style=${{margin:'0 3px',opacity:.4}}>·</span>
                      浮 ${sym}${fmtNum(vr.cost)}
                    </div>
                  `:null}
                </div>

                <!-- 月均收益 -->
                <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px'}}>
                  <div className="txs tm mb4">月均收益（估）</div>
                  <div className="fn pl-pos" style=${{fontSize:17}}>+${sym}${fmtNum(totalMonthly)}</div>
                  ${hasBoth?html`
                    <div className="txs tm mt3">
                      ${fx?html`固 +${sym}${fmtNum(fx.monthlyIncome)}`:''}
                      ${vr?.monthlyIncome!=null?html`<span style=${{margin:'0 3px',opacity:.4}}>·</span>浮 +${sym}${fmtNum(vr.monthlyIncome)}`:''}
                    </div>
                  `:null}
                </div>

                <!-- 年收益 -->
                <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px'}}>
                  <div className="txs tm mb4">年收益（估）</div>
                  <div className="fn pl-pos" style=${{fontSize:17}}>+${sym}${fmtNum(totalAnnualIncome)}</div>
                  ${hasBoth?html`
                    <div className="txs tm mt3">
                      ${fx?html`固 +${sym}${fmtNum(fx.annualIncome)}`:''}
                      ${vr?.annualIncome!=null?html`<span style=${{margin:'0 3px',opacity:.4}}>·</span>浮 +${sym}${fmtNum(vr.annualIncome)}`:''}
                    </div>
                  `:null}
                  ${!hasBoth&&vr&&vr.annualIncome==null?html`
                    <div className="txs tm mt3" style=${{color:'var(--gold)'}}>需填入现价</div>
                  `:null}
                </div>

                <!-- 综合年化率 -->
                <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px'}}>
                  <div className="txs tm mb4">综合年化率</div>
                  ${overallRate!=null?html`
                    <div className=${'fn '+(overallRate>=0?'pl-pos':'pl-neg')} style=${{fontSize:17}}>
                      ${overallRate>=0?'+':''}${fmtNum(overallRate,2)}%
                    </div>
                  `:html`<div className="fn ts">—</div>`}
                  ${hasBoth?html`
                    <div className="txs tm mt3">
                      ${fx?html`固 ${fmtNum(fx.annualRate,2)}%`:''}
                      ${vr?.annualRate!=null?html`<span style=${{margin:'0 3px',opacity:.4}}>·</span>浮 ${vr.annualRate>=0?'+':''}${fmtNum(vr.annualRate,2)}%`:''}
                    </div>
                  `:null}
                  ${!hasBoth&&vr&&vr.annualRate!=null?html`
                    <div className="txs tm mt3">持仓年化 ${vr.annualRate>=0?'+':''}${fmtNum(vr.annualRate,2)}%</div>
                  `:null}
                  ${!hasBoth&&vr&&vr.annualRate==null?html`
                    <div className="txs tm mt3" style=${{color:'var(--gold)'}}>需填入现价</div>
                  `:null}
                </div>

              </div>

              <!-- 非固定收益补充：总回报 -->
              ${vr?html`
                <div className="fc g16 mt8" style=${{flexWrap:'wrap'}}>
                  <div className="txs tm">
                    累计总回报
                    <span className=${'fn ml6 '+(vr.totalReturn>=0?'pl-pos':'pl-neg')}>
                      ${vr.totalReturn>=0?'+':''}${sym}${fmtNum(vr.totalReturn)}
                    </span>
                    <span className="ml4 txs">(${vr.totalReturnPct>=0?'+':''}${fmtNum(vr.totalReturnPct,2)}%)</span>
                  </div>
                </div>
              `:null}
            </div>
          `;
        })}

        <div className="txs mt12" style=${{opacity:.5,textAlign:'right',fontSize:10}}>
          * 非固定收益的月/年收益及年化率，以当前持仓成本 × 历史年化收益率推算，仅供参考
        </div>
      </div>`}
    </div>
  `;
}

// ── 固定收益历史档案卡片 ──────────────────────────────────
function FixedInvArchiveCard({inv,accName,onDelete}){
  const fr=calcFixedReturn(inv);
  const sym=CUR_SYM[inv.currency]||'';
  return html`
    <div className="card" style=${{padding:0,overflow:'hidden',border:'1px solid rgba(82,200,122,.15)',opacity:.85}}>
      <!-- 头部 -->
      <div style=${{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
        <div className="fb mb4">
          <div className="fc g6">
            <span className="tag" style=${{background:'rgba(100,100,100,.12)',color:'var(--muted)',fontSize:10}}>${inv.type}</span>
            <span className="tag" style=${{background:'rgba(82,200,122,.12)',color:'var(--ok)',fontSize:10}}>✓ 已结算</span>
          </div>
          <span className="fn" style=${{color:'var(--gold)',fontSize:16}}>${sym}${fr?fmtNum(fr.principal):'—'}</span>
        </div>
        <div className="fw6 ts">${inv.name}</div>
        <div className="txs tm mt2">${accName?accName+' · ':''}${inv.currency}${inv.note?' · '+inv.note:''}</div>
      </div>
      <!-- 数据 -->
      <div style=${{padding:'10px 16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 20px',borderBottom:'1px solid var(--border)'}}>
        <div>
          <div className="txs tm mb1">年化利率</div>
          <div className="fn" style=${{color:'var(--gold)'}}>${inv.annualRate}%</div>
        </div>
        <div>
          <div className="txs tm mb1">到期总收益</div>
          <div className="fn pl-pos">+${sym}${fr?fmtNum(fr.totalReturn):'—'}</div>
        </div>
        <div>
          <div className="txs tm mb1">存期</div>
          <div className="ts">${fmtDate(inv.buyDate)} → ${fmtDate(inv.maturityDate)}</div>
          ${fr?html`<div className="txs tm">${fr.termDays} 天</div>`:null}
        </div>
        <div>
          <div className="txs tm mb1">结算日 / 到账</div>
          <div className="ts">${inv.settledDate?fmtDate(inv.settledDate):'—'}</div>
          ${inv.settledAmount!=null?html`<div className="fn pl-pos" style=${{marginTop:2}}>${sym}${fmtNum(inv.settledAmount)}</div>`:null}
        </div>
      </div>
      <!-- 操作 -->
      <div className="fc g6" style=${{padding:'8px 16px'}}>
        <button className="btn btn-danger btn-xs" onClick=${onDelete}>删除档案</button>
      </div>
    </div>
  `;
}

// ── 换算汇总组件 ──────────────────────────────────────────
function InvestmentFxSummary({investments}){
  const [baseCur,setBaseCur]=useState('CNY');
  const [rates,setRates]=useState({});
  const [show,setShow]=useState(true);

  const currencies=useMemo(()=>[...new Set(investments.map(i=>i.currency))].sort(),[investments]);
  const foreignCurs=currencies.filter(c=>c!==baseCur);

  const getRate=cur=>{
    if(cur===baseCur)return 1;
    const r=parseFloat(rates[cur]);
    return isNaN(r)||r<=0?null:r;
  };

  const summary=useMemo(()=>{
    let fixedPrincipal=0,fixedAccrued=0,fixedReturn=0;
    let varCost=0,varMarket=0,varRealizedPL=0;
    const missingCurs=[];
    investments.forEach(inv=>{
      const rate=getRate(inv.currency);
      if(rate===null){if(!missingCurs.includes(inv.currency))missingCurs.push(inv.currency);return;}
      const isFixed=(inv.category||'variable')==='fixed';
      if(isFixed){
        const fr=calcFixedReturn(inv);if(!fr)return;
        fixedPrincipal+=fr.principal*rate;
        fixedAccrued+=fr.accrued*rate;
        fixedReturn+=fr.totalReturn*rate;
      }else{
        const pos=calcEffectivePosition(inv);
        varCost+=pos.totalCost*rate;
        varRealizedPL+=pos.realizedPL*rate;
        varMarket+=inv.currentPrice!=null
          ?Number(inv.currentPrice)*pos.effectiveQty*rate
          :pos.totalCost*rate;
      }
    });
    const varPL=varMarket-varCost;
    const varPLPct=varCost?varPL/varCost*100:0;
    return{fixedPrincipal,fixedAccrued,fixedReturn,varCost,varMarket,varPL,varPLPct,varRealizedPL,missingCurs};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[investments,baseCur,rates]);

  if(investments.length===0)return null;
  const sym=CUR_SYM[baseCur]||'';
  const totalAssets=summary.fixedPrincipal+summary.fixedAccrued+summary.varMarket;

  return html`
    <div className="card mb20" style=${{padding:'16px 20px'}}>
      <div className="fb mb14" style=${{alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div className="fc g8">
          <span style=${{fontSize:16}}>💱</span>
          <span className="fw6 ts">换算汇总</span>
          <span className="txs tm">统一折算为基准货币</span>
        </div>
        <button className="btn btn-ghost btn-xs" onClick=${()=>setShow(p=>!p)}>${show?'收起 ▲':'展开 ▼'}</button>
      </div>

      ${show&&html`<div>
        <!-- 基准货币选择 -->
        <div className="fc g8 mb14" style=${{alignItems:'center',flexWrap:'wrap'}}>
          <span className="txs tm">基准货币</span>
          <select className="inp" value=${baseCur}
            onChange=${e=>{setBaseCur(e.target.value);setRates({});}}
            style=${{margin:0,width:'auto'}}>
            ${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}
          </select>
        </div>

        <!-- 汇率输入 -->
        ${foreignCurs.length>0&&html`
          <div style=${{background:'var(--bg3)',borderRadius:8,padding:'12px 14px',marginBottom:14}}>
            <div className="txs fw6 tm mb10">填入当前汇率（1 外币 = ? ${baseCur}）</div>
            <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}}>
              ${foreignCurs.map(cur=>html`
                <div key=${cur} className="fc g8" style=${{alignItems:'center'}}>
                  <span style=${{minWidth:36,color:'var(--gold)',fontWeight:700,fontSize:13}}>
                    ${cur}
                  </span>
                  <input className="inp" type="number" step="any" min="0"
                    placeholder=${'1 '+cur+' = ? '+baseCur}
                    value=${rates[cur]||''}
                    onChange=${e=>setRates(r=>({...r,[cur]:e.target.value}))}
                    style=${{margin:0,flex:1,fontSize:13,padding:'4px 8px'}}/>
                </div>
              `)}
            </div>
            ${summary.missingCurs.length>0&&html`
              <div className="txs mt8" style=${{color:'var(--gold)'}}>
                ⚠ 尚未填写汇率：${summary.missingCurs.join('、')}，对应持仓已排除在外
              </div>
            `}
          </div>
        `}

        <!-- 折算结果 -->
        <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10,marginBottom:12}}>
          <!-- 固定收益 -->
          <div style=${{background:'var(--bg3)',borderRadius:10,padding:'14px 16px'}}>
            <div className="txs fw6 tm mb10">📋 固定收益（${baseCur}）</div>
            <div style=${{display:'flex',flexDirection:'column',gap:6}}>
              <div className="fb">
                <span className="txs tm">合计本金</span>
                <span className="fn ts">${sym}${fmtNum(summary.fixedPrincipal)}</span>
              </div>
              <div className="fb">
                <span className="txs tm">已计利息</span>
                <span className="fn pl-pos">+${sym}${fmtNum(summary.fixedAccrued)}</span>
              </div>
              <div className="fb" style=${{borderTop:'1px solid var(--border)',paddingTop:6,marginTop:2}}>
                <span className="txs tm">到期总收益</span>
                <span className="fn pl-pos">+${sym}${fmtNum(summary.fixedReturn)}</span>
              </div>
            </div>
          </div>
          <!-- 非固定收益 -->
          <div style=${{background:'var(--bg3)',borderRadius:10,padding:'14px 16px'}}>
            <div className="txs fw6 tm mb10">📈 非固定收益（${baseCur}）</div>
            <div style=${{display:'flex',flexDirection:'column',gap:6}}>
              <div className="fb">
                <span className="txs tm">合计成本</span>
                <span className="fn ts">${sym}${fmtNum(summary.varCost)}</span>
              </div>
              <div className="fb">
                <span className="txs tm">当前市值</span>
                <span className="fn ts">${sym}${fmtNum(summary.varMarket)}</span>
              </div>
              <div className="fb" style=${{borderTop:'1px solid var(--border)',paddingTop:6,marginTop:2}}>
                <span className="txs tm">未实现盈亏</span>
                <span className=${'fn '+(summary.varPL>=0?'pl-pos':'pl-neg')}>
                  ${summary.varPL>=0?'+':''}${sym}${fmtNum(summary.varPL)}
                  ${summary.varCost>0?html`
                    <span className="txs" style=${{marginLeft:4}}>
                      (${summary.varPLPct>=0?'+':''}${fmtNum(summary.varPLPct,2)}%)
                    </span>
                  `:''}
                </span>
              </div>
              ${summary.varRealizedPL!==0&&html`
                <div className="fb">
                  <span className="txs tm">已实现盈亏</span>
                  <span className=${'fn '+(summary.varRealizedPL>=0?'pl-pos':'pl-neg')}>
                    ${summary.varRealizedPL>=0?'+':''}${sym}${fmtNum(summary.varRealizedPL)}
                  </span>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- 总资产 -->
        <div style=${{background:'rgba(201,160,67,.08)',border:'1px solid rgba(201,160,67,.2)',borderRadius:10,padding:'14px 18px'}}>
          <div className="fb" style=${{alignItems:'center',flexWrap:'wrap',gap:8}}>
            <div>
              <div className="ts fw6">投资总资产（${baseCur}）</div>
              <div className="txs tm mt2">固定本金+已计利息 ＋ 非固定当前市值</div>
            </div>
            <span className="fh fn tg" style=${{fontSize:24,marginLeft:'auto'}}>${sym}${fmtNum(totalAssets)}</span>
          </div>
        </div>
      </div>`}
    </div>
  `;
}

// ── 投资持仓页 ────────────────────────────────────────────
function InvestmentsPage({data,saveInvestment,deleteInvestment,addInvestmentNote,deleteInvestmentNote,addTrade,deleteTrade,addDividend,deleteDividend,settleFixedInvestment,clearVariableInvestment,saveBenchmark,deleteBenchmark}){
  const updatePrice=(inv,newPrice)=>saveInvestment({...inv,currentPrice:newPrice});
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [notesItem,setNotesItem]=useState(null);
  const [tradeItem,setTradeItem]=useState(null);
  const [dividendItem,setDividendItem]=useState(null);
  const [clearItem,setClearItem]=useState(null);
  const [dismissed,setDismissed]=useState([]);

  // ── 筛选状态 ──────────────────────────────────────────
  const [search,setSearch]=useState('');
  const [filterCur,setFilterCur]=useState('');
  const [filterAcc,setFilterAcc]=useState('');
  const [filterStatus,setFilterStatus]=useState('');
  const hasFilter=search||filterCur||filterAcc||filterStatus;
  const resetFilter=()=>{setSearch('');setFilterCur('');setFilterAcc('');setFilterStatus('');};

  const today=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return d;},[]);
  const fixedInvs=useMemo(()=>data.investments.filter(i=>(i.category||'variable')==='fixed'),[data.investments]);
  const varInvs=useMemo(()=>data.investments.filter(i=>(i.category||'variable')==='variable'),[data.investments]);

  const maturingSoon=useMemo(()=>fixedInvs.filter(inv=>{
    if(!inv.maturityDate||inv.settled)return false;
    const dl=Math.ceil((new Date(inv.maturityDate)-today)/86400000);
    return dl>=0&&dl<=3&&!dismissed.includes(inv.id);
  }),[fixedInvs,today,dismissed]);

  const varSummaryByCur=useMemo(()=>{
    const map={};
    varInvs.filter(i=>!i.cleared).forEach(inv=>{
      const pos=calcEffectivePosition(inv);
      const cur=inv.currency;
      if(!map[cur])map[cur]={cost:0,market:0,realizedPL:0,hasCurrent:false};
      map[cur].cost+=pos.totalCost;
      map[cur].realizedPL+=pos.realizedPL;
      if(inv.currentPrice!=null){map[cur].hasCurrent=true;map[cur].market+=Number(inv.currentPrice)*pos.effectiveQty;}
      else map[cur].market+=pos.totalCost;
    });
    Object.values(map).forEach(s=>{s.pl=s.market-s.cost;s.plPct=s.cost?s.pl/s.cost*100:0;});
    return map;
  },[varInvs]);

  const fixedSummaryByCur=useMemo(()=>{
    const map={};
    fixedInvs.forEach(inv=>{
      if(inv.settled)return;
      const fr=calcFixedReturn(inv);if(!fr)return;
      const cur=inv.currency;
      if(!map[cur])map[cur]={principal:0,accrued:0,totalReturn:0};
      map[cur].principal+=fr.principal;map[cur].accrued+=fr.accrued;map[cur].totalReturn+=fr.totalReturn;
    });
    Object.values(map).forEach(s=>{
      s.accruedPct=s.principal?s.accrued/s.principal*100:0;
      s.totalPct=s.principal?s.totalReturn/s.principal*100:0;
    });
    return map;
  },[fixedInvs]);

  const fixedSettledSummaryByCur=useMemo(()=>{
    const map={};
    fixedInvs.filter(i=>i.settled).forEach(inv=>{
      const fr=calcFixedReturn(inv);if(!fr)return;
      const cur=inv.currency;
      if(!map[cur])map[cur]={count:0,principal:0,totalReturn:0};
      map[cur].count++;
      map[cur].principal+=fr.principal;
      map[cur].totalReturn+=fr.totalReturn;
    });
    Object.values(map).forEach(s=>{
      s.totalPct=s.principal?s.totalReturn/s.principal*100:0;
    });
    return map;
  },[fixedInvs]);

  const getAcc=id=>data.accounts.find(a=>a.id===id);

  // ── 筛选逻辑 ──────────────────────────────────────────
  const allCurrencies=useMemo(()=>[...new Set(data.investments.map(i=>i.currency))].sort(),[data.investments]);

  const matchBase=(inv)=>{
    if(filterCur&&inv.currency!==filterCur)return false;
    if(filterAcc&&String(inv.accountId)!==String(filterAcc))return false;
    if(search){
      const q=search.toLowerCase();
      if(!inv.name.toLowerCase().includes(q)&&!(inv.ticker||'').toLowerCase().includes(q))return false;
    }
    return true;
  };

  const fixedFiltered=useMemo(()=>fixedInvs.filter(inv=>{
    if(!matchBase(inv))return false;
    if(filterStatus){
      const fr=calcFixedReturn(inv);
      const settled=!!inv.settled;
      const matured=fr&&fr.isMatured;
      const dl=fr?fr.daysLeft:null;
      if(filterStatus==='active'&&(settled||matured))return false;
      if(filterStatus==='maturing'&&!(dl!=null&&dl<=7&&dl>=0&&!settled&&!matured))return false;
      if(filterStatus==='matured'&&!(matured&&!settled))return false;
      if(filterStatus==='settled'&&!settled)return false;
    }
    return true;
  }),[fixedInvs,search,filterCur,filterAcc,filterStatus]);

  const varFiltered=useMemo(()=>varInvs.filter(inv=>{
    if(!matchBase(inv))return false;
    if(['maturing','matured','settled'].includes(filterStatus))return false;
    if(filterStatus==='cleared'&&!inv.cleared)return false;
    if(filterStatus==='active_var'&&inv.cleared)return false;
    return true;
  }),[varInvs,search,filterCur,filterAcc,filterStatus]);

  const fixedActiveFiltered=useMemo(()=>fixedFiltered.filter(i=>!i.settled),[fixedFiltered]);
  const fixedSettledFiltered=useMemo(()=>fixedFiltered.filter(i=>i.settled),[fixedFiltered]);
  const varActiveFiltered=useMemo(()=>varFiltered.filter(i=>!i.cleared),[varFiltered]);
  const varClearedFiltered=useMemo(()=>varFiltered.filter(i=>i.cleared),[varFiltered]);
  const totalFiltered=fixedFiltered.length+varFiltered.length;

  return html`
    <div>
      <div className="fb mb16" style=${{flexWrap:'wrap',gap:10}}>
        <div><div className="pg-title">投资持仓</div><div className="pg-sub">固定收益及非固定收益理财产品</div></div>
        <button className="btn btn-gold shrink0" onClick=${()=>{setEditItem(null);setShowAdd(true);}}>+ 添加持仓</button>
      </div>

      <!-- 筛选栏 -->
      <div className="card mb16" style=${{padding:'12px 16px'}}>
        <div style=${{display:'grid',gridTemplateColumns:'1fr repeat(3,auto)',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input className="inp" placeholder="🔍 搜索名称 / 代码..." value=${search}
            style=${{margin:0}}
            onChange=${e=>setSearch(e.target.value)}/>
          <select className="inp" value=${filterCur} onChange=${e=>setFilterCur(e.target.value)} style=${{margin:0,width:'auto'}}>
            <option value="">全部币种</option>
            ${allCurrencies.map(c=>html`<option key=${c} value=${c}>${c}</option>`)}
          </select>
          <select className="inp" value=${filterAcc} onChange=${e=>setFilterAcc(e.target.value)} style=${{margin:0,width:'auto'}}>
            <option value="">全部账户</option>
            ${data.accounts.map(a=>html`<option key=${a.id} value=${a.id}>${a.name}</option>`)}
          </select>
          <select className="inp" value=${filterStatus} onChange=${e=>setFilterStatus(e.target.value)} style=${{margin:0,width:'auto'}}>
            <option value="">全部状态</option>
            <option value="active">固定·持有中</option>
            <option value="maturing">固定·临近到期</option>
            <option value="matured">固定·已到期</option>
            <option value="settled">固定·已结算</option>
            <option value="active_var">浮动·持有中</option>
            <option value="cleared">浮动·已清仓</option>
          </select>
        </div>
        ${hasFilter?html`
          <div className="fc g8 mt8">
            <span className="txs tm">共 ${totalFiltered} 项</span>
            <button className="btn btn-ghost btn-xs" onClick=${resetFilter}>✕ 清除筛选</button>
          </div>
        `:null}
      </div>

      <!-- 临近到期提醒 -->
      ${maturingSoon.map(inv=>{
        const dl=Math.ceil((new Date(inv.maturityDate)-today)/86400000);
        return html`
          <div key=${inv.id} style=${{background:'rgba(240,128,128,.1)',border:'1px solid rgba(240,128,128,.3)',borderRadius:10,
            padding:'12px 16px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div className="fc g8">
              <span style=${{fontSize:18}}>⚠️</span>
              <div>
                <div className="ts" style=${{color:'var(--err)',fontWeight:600}}>${inv.name} 即将到期！</div>
                <div className="txs tm">${dl===0?'今天到期':dl===1?'明天到期':'还有 '+dl+' 天到期'} · ${fmtDate(inv.maturityDate)}</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-xs" onClick=${()=>setDismissed(p=>[...p,inv.id])}>知道了</button>
          </div>
        `;
      })}

      ${!hasFilter?html`
        <${InvestmentIncomePanel} investments=${data.investments}/>
        <${InvestmentROIChart} investments=${data.investments}/>
        <${BenchmarkSection} benchmarks=${data.benchmarks||[]}
          varInvestments=${data.investments.filter(i=>(i.category||'variable')==='variable')}
          onSave=${saveBenchmark} onDelete=${deleteBenchmark}/>
      `:null}

      <!-- 固定收益（持有中） -->
      <div className="fb mb12 mt4" style=${{alignItems:'center',gap:8}}>
        <span className="fw6 ts">📋 固定收益</span>
        <span className="txs tm">${fixedActiveFiltered.length}${hasFilter&&fixedActiveFiltered.length!==fixedInvs.filter(i=>!i.settled).length?' / '+fixedInvs.filter(i=>!i.settled).length:''} 项</span>
      </div>
      ${fixedActiveFiltered.length===0
        ?html`<div className="ts tm" style=${{padding:'8px 0 20px'}}>${hasFilter&&filterStatus!=='settled'?'无匹配结果':'暂无固定收益持仓'}</div>`
        :html`<${React.Fragment}>
          ${!hasFilter?html`
          <div className="card mb14" style=${{padding:'12px 18px'}}>
            ${Object.keys(fixedSummaryByCur).length>1?html`
              <div style=${{display:'grid',gridTemplateColumns:'52px 1fr 1fr 1fr',gap:'4px 10px',marginBottom:8,borderBottom:'1px solid var(--border)',paddingBottom:6}}>
                <div className="txs tm">币种</div>
                <div className="txs tm">合计本金</div>
                <div className="txs tm">已计收益</div>
                <div className="txs tm">到期总收益</div>
              </div>
            `:null}
            ${Object.entries(fixedSummaryByCur).map(([cur,s])=>{
              const sym=CUR_SYM[cur]||'';
              return html`
                <div key=${cur} style=${{display:'grid',gridTemplateColumns:'52px 1fr 1fr 1fr',gap:'4px 10px',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                  <div style=${{color:'var(--gold)',fontWeight:700,fontSize:12,alignSelf:'center'}}>${cur}</div>
                  <div><div className="fn ts">${sym}${fmtNum(s.principal)}</div></div>
                  <div>
                    <div className="fn pl-pos">+${sym}${fmtNum(s.accrued)}</div>
                    <div className="txs pl-pos">+${fmtNum(s.accruedPct,2)}%</div>
                  </div>
                  <div>
                    <div className="fn pl-pos">+${sym}${fmtNum(s.totalReturn)}</div>
                    <div className="txs pl-pos">+${fmtNum(s.totalPct,2)}%</div>
                  </div>
                </div>
              `;
            })}
          </div>`:null}
          <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12,marginBottom:24}}>
            ${fixedActiveFiltered.map(inv=>html`
              <${FixedInvCard} key=${inv.id} inv=${inv}
                accName=${getAcc(inv.accountId)?getAcc(inv.accountId).name:null}
                onEdit=${()=>{setEditItem(inv);setShowAdd(true);}}
                onDelete=${()=>deleteInvestment(inv.id)}
                onSettle=${()=>settleFixedInvestment(inv.id)}
                onNotes=${()=>setNotesItem(inv)}/>
            `)}
          </div>
        </${React.Fragment}>`}

      <!-- 历史档案（已结算） -->
      ${(fixedSettledFiltered.length>0||filterStatus==='settled')?html`
        <div className="fb mb12" style=${{alignItems:'center',gap:8,marginTop:8}}>
          <span className="fw6 ts">🗂 历史档案</span>
          <span className="txs tm">${fixedSettledFiltered.length} 项已结算</span>
        </div>
        ${fixedSettledFiltered.length===0
          ?html`<div className="ts tm" style=${{padding:'8px 0 20px'}}>${hasFilter?'无匹配结果':'暂无已结算记录'}</div>`
          :html`<${React.Fragment}>
            ${!hasFilter?html`
            <div className="card mb14" style=${{padding:'12px 18px'}}>
              ${Object.keys(fixedSettledSummaryByCur).length>1?html`
                <div style=${{display:'grid',gridTemplateColumns:'52px 1fr 1fr 1fr',gap:'4px 10px',marginBottom:8,borderBottom:'1px solid var(--border)',paddingBottom:6}}>
                  <div className="txs tm">币种</div>
                  <div className="txs tm">笔数</div>
                  <div className="txs tm">累计本金</div>
                  <div className="txs tm">累计利息</div>
                </div>
              `:null}
              ${Object.entries(fixedSettledSummaryByCur).map(([cur,s])=>{
                const sym=CUR_SYM[cur]||'';
                return html`
                  <div key=${cur} style=${{display:'grid',gridTemplateColumns:'52px 1fr 1fr 1fr',gap:'4px 10px',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                    <div style=${{color:'var(--ok)',fontWeight:700,fontSize:12,alignSelf:'center'}}>${cur}</div>
                    <div><div className="fn ts">${s.count} 笔</div></div>
                    <div><div className="fn ts">${sym}${fmtNum(s.principal)}</div></div>
                    <div>
                      <div className="fn pl-pos">+${sym}${fmtNum(s.totalReturn)}</div>
                      <div className="txs pl-pos">+${fmtNum(s.totalPct,2)}%</div>
                    </div>
                  </div>
                `;
              })}
            </div>`:null}
            <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12,marginBottom:24}}>
              ${fixedSettledFiltered.map(inv=>html`
                <${FixedInvArchiveCard} key=${inv.id} inv=${inv}
                  accName=${getAcc(inv.accountId)?getAcc(inv.accountId).name:null}
                  onDelete=${()=>deleteInvestment(inv.id)}/>
              `)}
            </div>
          </${React.Fragment}>`}
      `:null}

      <!-- 非固定收益（持有中） -->
      <div className="fb mb12" style=${{alignItems:'center',gap:8}}>
        <span className="fw6 ts">📈 非固定收益</span>
        <span className="txs tm">${varActiveFiltered.length}${hasFilter&&varActiveFiltered.length!==varInvs.filter(i=>!i.cleared).length?' / '+varInvs.filter(i=>!i.cleared).length:''} 项</span>
      </div>
      ${varActiveFiltered.length===0
        ?html`<div className="ts tm" style=${{padding:'8px 0'}}>${hasFilter&&filterStatus!=='cleared'?'无匹配结果':'暂无非固定收益持仓'}</div>`
        :html`<${React.Fragment}>
          <div className="card mb14" style=${{padding:'12px 18px'}}>
            ${Object.keys(varSummaryByCur).length>1?html`
              <div style=${{display:'grid',gridTemplateColumns:'52px 1fr 1fr 1fr',gap:'4px 10px',marginBottom:8,borderBottom:'1px solid var(--border)',paddingBottom:6}}>
                <div className="txs tm">币种</div>
                <div className="txs tm">合计成本</div>
                <div className="txs tm">当前市值</div>
                <div className="txs tm">未实现盈亏</div>
              </div>
            `:null}
            ${Object.entries(varSummaryByCur).map(([cur,s])=>{
              const sym=CUR_SYM[cur]||'';
              return html`
                <div key=${cur} style=${{display:'grid',gridTemplateColumns:'52px 1fr 1fr 1fr',gap:'4px 10px',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.04)'}}>
                  <div style=${{color:'var(--gold)',fontWeight:700,fontSize:12,alignSelf:'center'}}>${cur}</div>
                  <div><div className="fn ts">${sym}${fmtNum(s.cost)}</div></div>
                  <div>
                    ${s.hasCurrent
                      ?html`<div className="fn ts">${sym}${fmtNum(s.market)}</div>`
                      :html`<span className="txs tm">待填现价</span>`}
                  </div>
                  <div>
                    ${s.hasCurrent?html`
                      <div className=${'fn '+(s.pl>=0?'pl-pos':'pl-neg')}>
                        ${s.pl>=0?'+':''}${sym}${fmtNum(s.pl)}
                      </div>
                      <div className=${'txs '+(s.pl>=0?'pl-pos':'pl-neg')}>
                        ${s.plPct>=0?'+':''}${fmtNum(s.plPct,2)}%
                      </div>
                    `:html`<span className="txs tm">—</span>`}
                    ${s.realizedPL!==0?html`<div className=${'txs mt1 '+(s.realizedPL>=0?'pl-pos':'pl-neg')}>已实现 ${s.realizedPL>=0?'+':''}${sym}${fmtNum(s.realizedPL)}</div>`:null}
                  </div>
                </div>
              `;
            })}
          </div>
          <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12,marginBottom:24}}>
            ${varActiveFiltered.map(inv=>html`
              <${VarInvCard} key=${inv.id} inv=${inv}
                accName=${getAcc(inv.accountId)?getAcc(inv.accountId).name:null}
                onEdit=${()=>{setEditItem(inv);setShowAdd(true);}}
                onDelete=${()=>deleteInvestment(inv.id)}
                onTrade=${()=>setTradeItem(inv)}
                onDividend=${()=>setDividendItem(inv)}
                onNotes=${()=>setNotesItem(inv)}
                onPriceUpdate=${p=>updatePrice(inv,p)}
                onClear=${()=>setClearItem(inv)}/>
            `)}
          </div>
        </${React.Fragment}>`}

      <!-- 已清仓档案 -->
      ${(varClearedFiltered.length>0||filterStatus==='cleared')?html`
        <div className="fb mb12" style=${{alignItems:'center',gap:8,marginTop:8}}>
          <span className="fw6 ts">🗂 已清仓档案</span>
          <span className="txs tm">${varClearedFiltered.length} 项</span>
        </div>
        ${varClearedFiltered.length===0
          ?html`<div className="ts tm" style=${{padding:'8px 0 20px'}}>${hasFilter?'无匹配结果':'暂无已清仓记录'}</div>`
          :html`<div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12,marginBottom:24}}>
            ${varClearedFiltered.map(inv=>html`
              <${VarInvArchiveCard} key=${inv.id} inv=${inv}
                accName=${getAcc(inv.accountId)?getAcc(inv.accountId).name:null}
                onDelete=${()=>deleteInvestment(inv.id)}/>
            `)}
          </div>`}
      `:null}

      <${InvestmentFxSummary} investments=${data.investments}/>

      ${showAdd&&html`<${InvestmentModal} inv=${editItem} accounts=${data.accounts}
        onSave=${i=>{saveInvestment(i);setShowAdd(false);setEditItem(null);}}
        onClose=${()=>{setShowAdd(false);setEditItem(null);}}/>`}
      ${notesItem&&html`<${InvestmentNotesModal}
        inv=${data.investments.find(i=>i.id===notesItem.id)||notesItem}
        onAdd=${content=>addInvestmentNote(notesItem.id,content)}
        onDelete=${noteId=>deleteInvestmentNote(notesItem.id,noteId)}
        onClose=${()=>setNotesItem(null)}/>`}
      ${tradeItem&&html`<${TradeModal}
        inv=${data.investments.find(i=>i.id===tradeItem.id)||tradeItem}
        onAddTrade=${trade=>addTrade(tradeItem.id,trade)}
        onDeleteTrade=${tradeId=>deleteTrade(tradeItem.id,tradeId)}
        onClose=${()=>setTradeItem(null)}/>`}
      ${dividendItem&&html`<${DividendModal}
        inv=${data.investments.find(i=>i.id===dividendItem.id)||dividendItem}
        onAddDividend=${div=>addDividend(dividendItem.id,div)}
        onDeleteDividend=${divId=>deleteDividend(dividendItem.id,divId)}
        onClose=${()=>setDividendItem(null)}/>`}
      ${clearItem&&html`<${ClearPositionModal}
        inv=${data.investments.find(i=>i.id===clearItem.id)||clearItem}
        onConfirm=${params=>{clearVariableInvestment(clearItem.id,params);setClearItem(null);}}
        onClose=${()=>setClearItem(null)}/>`}
    </div>
  `;
}
