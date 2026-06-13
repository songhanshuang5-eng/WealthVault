// ══════════════════════════════════════════════════════════
// 账户相关组件：HoldingSettleModal, AccountModal,
//               HoldingModal, StatementModal
// ══════════════════════════════════════════════════════════

function HoldingSettleModal({acc, holding, onSettle, onClose}){
  const di=calcDepositInterest(holding);
  const principal=Number(holding.amount);
  const interest=di?(di.type==='fixed'?di.totalInterest:di.interest):0;
  const total=Math.round((principal+interest)*1e8)/1e8;
  const sym=CUR_SYM[holding.currency]||'';
  const today=new Date().toISOString().slice(0,10);

  const [reinvest,setReinvest]=useState('');
  const [newRate,setNewRate]=useState(String(holding.interestRate||''));
  const [newStart,setNewStart]=useState(holding.maturityDate||today);
  const [newEnd,setNewEnd]=useState('');
  const [note,setNote]=useState('');

  const reinvestN=Math.max(0,parseFloat(reinvest)||0);
  const cashOut=Math.round((total-reinvestN)*1e8)/1e8;
  const canSave=cashOut>=0&&reinvestN<=total;

  const submit=()=>{
    if(!canSave)return;
    onSettle({interest,reinvestAmount:reinvestN,cashAmount:cashOut,
      newRate:parseFloat(newRate)||0,newStart,newEnd,
      currency:holding.currency,note:note.trim()});
  };

  const newDi=(reinvestN>0&&newRate&&newStart&&newEnd)
    ?calcDepositInterest({depositType:'fixed',amount:reinvestN,interestRate:parseFloat(newRate),startDate:newStart,maturityDate:newEnd})
    :null;

  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:480}}>
        <div className="modal-title">🏦 到期结算 · ${holding.currency}</div>

        <div style=${{background:'var(--bg3)',borderRadius:10,padding:'14px 16px',marginBottom:16}}>
          <div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px 20px'}}>
            <div><div className="txs tm mb1">存款本金</div>
              <div className="fn ts">${sym}${fmtNum(principal)}</div></div>
            <div><div className="txs tm mb1">到期利息</div>
              <div className="fn pl-pos">+${sym}${fmtNum(interest)}</div></div>
            <div style=${{gridColumn:'1/-1',borderTop:'1px solid var(--border)',paddingTop:8,marginTop:4}}>
              <div className="txs tm mb1">可取总额</div>
              <div className="fh fn tg" style=${{fontSize:20}}>${sym}${fmtNum(total)}</div>
            </div>
          </div>
        </div>

        <div className="txs fw6 tm mb8">续存部分（可留空表示全额取出）</div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">续存金额</div>
            <input className="inp" type="number" step="any" min="0" autoFocus
              placeholder=${'最多 '+sym+fmtNum(total)}
              value=${reinvest} onChange=${e=>setReinvest(e.target.value)}/>
            ${reinvestN>total?html`<div style=${{color:'var(--err)',fontSize:12,marginTop:3}}>超出可取总额</div>`:null}
          </div>
          <div className="inp-group"><div className="inp-label">取出金额（自动）</div>
            <div className="fn ts" style=${{padding:'10px 12px',background:'var(--bg3)',borderRadius:8,marginTop:4,
              color:cashOut>=0?'var(--ok)':'var(--err)'}}>
              ${sym}${fmtNum(cashOut)}
              ${interest>0&&cashOut>0?html`<div className="txs tm mt1">含利息 ${sym}${fmtNum(Math.min(interest,cashOut))}</div>`:null}
            </div>
          </div>
        </div>

        ${reinvestN>0&&html`
          <div className="txs fw6 tm mb8 mt4">新存款条款</div>
          <div className="modal-row">
            <div className="inp-group"><div className="inp-label">新年利率（%）</div>
              <input className="inp" type="number" step="any" min="0" value=${newRate} onChange=${e=>setNewRate(e.target.value)}/>
            </div>
            <div className="inp-group"><div className="inp-label">起息日</div>
              <input className="inp" type="date" value=${newStart} onChange=${e=>setNewStart(e.target.value)}/>
            </div>
          </div>
          <div className="inp-group"><div className="inp-label">新到期日</div>
            <input className="inp" type="date" value=${newEnd} onChange=${e=>setNewEnd(e.target.value)}/>
          </div>
          ${newDi&&html`
            <div style=${{background:'rgba(82,200,122,.06)',border:'1px solid rgba(82,200,122,.15)',borderRadius:8,padding:'10px 14px',marginBottom:12}}>
              <div className="fb mb4"><span className="txs tm">新存期</span><span className="fn ts">${newDi.termDays} 天</span></div>
              <div className="fb mb4"><span className="txs tm">到期利息</span><span className="fn pl-pos">+${sym}${fmtNum(newDi.totalInterest)}</span></div>
              <div className="fb"><span className="txs tm">到期总额</span><span className="fn tg" style=${{fontSize:16}}>${sym}${fmtNum(reinvestN+newDi.totalInterest)}</span></div>
            </div>
          `}
        `}

        <div className="inp-group"><div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder="例：部分取出用于消费" value=${note} onChange=${e=>setNote(e.target.value)}/>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn btn-gold" onClick=${submit} disabled=${!canSave}>
            ✅ 确认结算
          </button>
        </div>
      </div>
    </div>
  `;
}

function AccountModal({acc,onSave,onClose}){
  const [f,sf]=useState({name:acc?acc.name:'',bank:acc?acc.bank:'',number:acc?acc.number:'',color:acc?acc.color:CARD_COLORS[0],note:acc?acc.note:''});
  const set=k=>e=>sf(x=>({...x,[k]:e.target.value}));
  const submit=()=>{if(!f.name||!f.bank)return;onSave({...acc,...f});};
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-title">${acc?'编辑账户':'添加银行账户'}</div>
        <div className="inp-group"><div className="inp-label">账户名称 *</div><input className="inp" placeholder="例：工行储蓄卡" value=${f.name} onChange=${set('name')}/></div>
        <div className="inp-group"><div className="inp-label">银行名称 *</div><input className="inp" placeholder="例：中国工商银行" value=${f.bank} onChange=${set('bank')}/></div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">卡号后四位</div><input className="inp" placeholder="1234" maxLength="4" value=${f.number} onChange=${set('number')}/></div>
          <div className="inp-group"><div className="inp-label">备注</div><input className="inp" placeholder="备注" value=${f.note} onChange=${set('note')}/></div>
        </div>
        <div className="inp-group"><div className="inp-label">卡片颜色</div>
          <div className="clr-pick">${CARD_COLORS.map(c=>html`<div key=${c} className=${'clr-sw '+(f.color===c?'on':'')} style=${{background:c}} onClick=${()=>sf(x=>({...x,color:c}))}/>`)}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn btn-gold" onClick=${submit} disabled=${!f.name||!f.bank}>保存</button>
        </div>
      </div>
    </div>
  `;
}

function HoldingModal({acc,editHolding,onSave,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const [f,sf]=useState({
    currency:editHolding?editHolding.currency:'CNY',
    amount:editHolding?editHolding.amount:'',
    depositType:editHolding?(editHolding.depositType||'none'):'none',
    interestRate:editHolding?(editHolding.interestRate||''):'',
    startDate:editHolding?(editHolding.startDate||today):today,
    maturityDate:editHolding?(editHolding.maturityDate||''):'',
    note:editHolding?(editHolding.note||''):'',
    entryDate:editHolding?(editHolding.entryDate||today):today,
    summary:editHolding?(editHolding.summary||''):'',
  });
  const [dupWarn,setDupWarn]=useState(false);
  const set=k=>e=>sf(x=>({...x,[k]:e.target.value}));
  const preview=(f.depositType!=='none'&&f.amount&&f.interestRate&&f.startDate)
    ?calcDepositInterest({...f,amount:Number(f.amount),interestRate:Number(f.interestRate)})
    :null;
  const buildHolding=()=>{
    const h={currency:f.currency,amount:Number(f.amount),entryDate:f.entryDate,summary:f.summary.trim()};
    if(editHolding)h.id=editHolding.id||genId(); // 编辑时始终保留/生成 id
    if(f.depositType!=='none'&&f.interestRate&&f.startDate){
      h.depositType=f.depositType;h.interestRate=Number(f.interestRate);h.startDate=f.startDate;
      if(f.depositType==='fixed'&&f.maturityDate)h.maturityDate=f.maturityDate;
    }
    if(f.note.trim())h.note=f.note.trim();
    return h;
  };
  const submit=()=>{
    if(!f.amount||Number(f.amount)<=0)return;
    if(!editHolding){
      const dup=(acc.holdings||[]).some(h=>h.entryDate===f.entryDate&&Number(h.amount)===Number(f.amount)&&h.currency===f.currency);
      if(dup&&!dupWarn){setDupWarn(true);return;}
    }
    onSave(buildHolding());
  };
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-title">${editHolding?'编辑存款':'添加存款'}</div>
        <div className="ts tm mb16">账户：${acc.name}</div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">货币</div>
            <select className="inp" value=${f.currency} onChange=${e=>sf(x=>({...x,currency:e.target.value}))} disabled=${!!editHolding}>
              ${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}
            </select>
          </div>
          <div className="inp-group"><div className="inp-label">持有金额 *</div>
            <input className="inp" type="number" step="any" min="0" placeholder="输入金额" value=${f.amount} onChange=${e=>{sf(x=>({...x,amount:e.target.value}));setDupWarn(false);}}/>
          </div>
        </div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">入账日期 *</div>
            <input className="inp" type="date" value=${f.entryDate} onChange=${e=>{sf(x=>({...x,entryDate:e.target.value}));setDupWarn(false);}}/>
          </div>
          <div className="inp-group"><div className="inp-label">摘要（可选）</div>
            <input className="inp" placeholder="例：工资、租金收入" value=${f.summary} onChange=${set('summary')}/>
          </div>
        </div>
        <div className="inp-group"><div className="inp-label">存款类型</div>
          <select className="inp" value=${f.depositType} onChange=${set('depositType')}>
            <option value="none">不计息 / 现金</option>
            <option value="demand">活期存款</option>
            <option value="fixed">定期存款</option>
          </select>
        </div>
        ${f.depositType!=='none'&&html`<${React.Fragment}>
          <div className="modal-row">
            <div className="inp-group"><div className="inp-label">年利率（%）</div>
              <input className="inp" type="number" step="any" min="0" placeholder="例：0.35" value=${f.interestRate} onChange=${set('interestRate')}/>
            </div>
            <div className="inp-group"><div className="inp-label">起息日</div>
              <input className="inp" type="date" value=${f.startDate} onChange=${set('startDate')}/>
            </div>
          </div>
          ${f.depositType==='fixed'&&html`
            <div className="inp-group"><div className="inp-label">到期日</div>
              <input className="inp" type="date" value=${f.maturityDate} onChange=${set('maturityDate')}/>
            </div>
          `}
          ${preview&&html`
            <div style=${{background:'var(--bg3)',padding:'12px 14px',borderRadius:8,marginBottom:12}}>
              ${preview.type==='demand'&&html`<${React.Fragment}>
                <div className="fb mb4"><span className="ts tm">已计息天数</span><span className="fn ts">${preview.days} 天</span></div>
                <div className="fb"><span className="ts tm">当前应计利息</span><span className="fh fn pl-pos" style=${{fontSize:18}}>${CUR_SYM[f.currency]||''}${fmtNum(preview.interest)}</span></div>
              </${React.Fragment}>`}
              ${preview.type==='fixed'&&html`<${React.Fragment}>
                <div className="fb mb4"><span className="ts tm">存期</span><span className="fn ts">${preview.termDays} 天</span></div>
                <div className="fb mb4"><span className="ts tm">${preview.isMatured?'已到期':'距到期'}</span><span className=${'fn ts '+(preview.isMatured?'pl-neg':'tg')}>${preview.isMatured?'已到期':'还有 '+preview.daysLeft+' 天'}</span></div>
                <div className="fb mb4"><span className="ts tm">已计利息</span><span className="fn ts pl-pos">${CUR_SYM[f.currency]||''}${fmtNum(preview.accrued)}</span></div>
                <div className="fb"><span className="ts tm">到期总利息</span><span className="fh fn pl-pos" style=${{fontSize:18}}>${CUR_SYM[f.currency]||''}${fmtNum(preview.totalInterest)}</span></div>
              </${React.Fragment}>`}
            </div>
          `}
        </${React.Fragment}>`}
        <div className="inp-group"><div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder="例：招行一年期定存、2024年春节特惠利率" value=${f.note} onChange=${set('note')}/>
        </div>
        ${dupWarn&&html`
          <div className="alert alert-warn" style=${{marginBottom:12}}>
            ⚠ 检测到同一日期（${f.entryDate}）已有相同金额（${CUR_SYM[f.currency]}${fmtNum(Number(f.amount))} ${f.currency}）的入账记录，是否重复入账？
            <div className="fc g8 mt8">
              <button className="btn btn-danger btn-sm" onClick=${()=>{setDupWarn(false);onSave(buildHolding());}}>确认保存（非重复）</button>
              <button className="btn btn-ghost btn-sm" onClick=${()=>setDupWarn(false)}>取消</button>
            </div>
          </div>
        `}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn btn-gold" onClick=${submit} disabled=${!f.amount||Number(f.amount)<=0}>保存</button>
        </div>
      </div>
    </div>
  `;
}

function StatementModal({acc,fxHistory,transfers,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const firstOfMonth=today.slice(0,7)+'-01';
  const [from,setFrom]=useState(firstOfMonth);
  const [to,setTo]=useState(today);

  const txns=useMemo(()=>{
    const list=[];
    (acc.holdings||[]).forEach(h=>{
      const d=h.entryDate||'';
      if(!d||d<from||d>to)return;
      list.push({date:d,currency:h.currency,type:'转入',amount:Number(h.amount),note:h.summary||h.note||'',sign:1});
    });
    (fxHistory||[]).filter(fx=>String(fx.accountId)===String(acc.id)).forEach(fx=>{
      const d=fx.date||'';
      if(!d||d<from||d>to)return;
      const isNew=fx.sellCurrency!=null;
      const sellCur=isNew?fx.sellCurrency:fx.from;
      const buyCur=isNew?fx.buyCurrency:fx.to;
      const sellAmt=isNew?fx.sellAmount:fx.amount;
      const buyAmt=isNew?fx.buyAmount:fx.result;
      list.push({date:d,currency:sellCur,type:'换汇卖出',amount:Number(sellAmt),note:fx.note||'',sign:-1});
      list.push({date:d,currency:buyCur,type:'换汇买入',amount:Number(buyAmt),note:fx.note||'',sign:1});
    });
    (transfers||[]).forEach(tx=>{
      const d=tx.date||'';
      if(!d||d<from||d>to)return;
      if(String(tx.fromAccountId)===String(acc.id))
        list.push({date:d,currency:tx.currency,type:'转出',amount:Number(tx.amount),note:tx.note||'',sign:-1});
      else if(String(tx.toAccountId)===String(acc.id))
        list.push({date:d,currency:tx.currency,type:'转入',amount:Number(tx.amount),note:tx.note||'',sign:1});
    });
    (acc.liabilities||[]).forEach(l=>{
      (l.payments||[]).forEach(p=>{
        const d=p.date||'';
        if(!d||d<from||d>to)return;
        if(String(p.fromAccountId)!==String(acc.id))return;
        list.push({date:d,currency:p.currency||l.currency,type:'还款',amount:Number(p.totalPaid),note:p.note||l.name||'',sign:-1});
      });
    });
    return list.sort((a,b)=>b.date.localeCompare(a.date)||(b.sign-a.sign));
  },[acc,fxHistory,transfers,from,to]);

  const inTotal={};const outTotal={};
  txns.forEach(t=>{
    if(t.sign>0)inTotal[t.currency]=(inTotal[t.currency]||0)+t.amount;
    else outTotal[t.currency]=(outTotal[t.currency]||0)+t.amount;
  });

  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:620}}>
        <div className="modal-title">📋 ${acc.bank} · ${acc.name} 流水明细</div>
        <div className="modal-row" style=${{marginBottom:16}}>
          <div className="inp-group">
            <div className="inp-label">开始日期</div>
            <input className="inp" type="date" value=${from} onChange=${e=>setFrom(e.target.value)}/>
          </div>
          <div className="inp-group">
            <div className="inp-label">结束日期</div>
            <input className="inp" type="date" value=${to} onChange=${e=>setTo(e.target.value)}/>
          </div>
        </div>
        ${txns.length>0&&html`
          <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',gap:24,flexWrap:'wrap'}}>
            <div>
              <div className="txs tm mb2">合计转入</div>
              ${Object.keys(inTotal).length===0
                ?html`<div className="txs tm">—</div>`
                :Object.entries(inTotal).map(([cur,amt])=>html`<div key=${cur} className="fn" style=${{color:'var(--ok)',fontSize:13}}>${CUR_SYM[cur]||''}${fmtNum(amt)} <span className="txs tm">${cur}</span></div>`)
              }
            </div>
            <div>
              <div className="txs tm mb2">合计转出</div>
              ${Object.keys(outTotal).length===0
                ?html`<div className="txs tm">—</div>`
                :Object.entries(outTotal).map(([cur,amt])=>html`<div key=${cur} className="fn" style=${{color:'var(--err)',fontSize:13}}>${CUR_SYM[cur]||''}${fmtNum(amt)} <span className="txs tm">${cur}</span></div>`)
              }
            </div>
            <div><div className="txs tm mb2">共</div><div className="fn ts">${txns.length} 笔</div></div>
          </div>
        `}
        ${txns.length===0
          ?html`<div className="ts tm" style=${{textAlign:'center',padding:'28px 0'}}>该时间段内暂无流水记录</div>`
          :html`<div style=${{maxHeight:420,overflowY:'auto',borderRadius:8,border:'1px solid var(--border)'}}>
            <table style=${{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style=${{borderBottom:'1px solid var(--border2)',background:'var(--bg3)'}}>
                  <th style=${{padding:'8px 10px',textAlign:'left',color:'var(--muted)',fontWeight:500,whiteSpace:'nowrap'}}>日期</th>
                  <th style=${{padding:'8px 10px',textAlign:'left',color:'var(--muted)',fontWeight:500}}>类型</th>
                  <th style=${{padding:'8px 10px',textAlign:'right',color:'var(--muted)',fontWeight:500}}>金额</th>
                  <th style=${{padding:'8px 10px',textAlign:'left',color:'var(--muted)',fontWeight:500}}>币种</th>
                  <th style=${{padding:'8px 10px',textAlign:'left',color:'var(--muted)',fontWeight:500}}>摘要</th>
                </tr>
              </thead>
              <tbody>
                ${txns.map((t,i)=>html`
                  <tr key=${i} style=${{borderBottom:'1px solid rgba(36,45,63,.5)',background:i%2===0?'transparent':'rgba(30,38,55,.3)'}}>
                    <td style=${{padding:'8px 10px',color:'var(--muted)',fontSize:12,whiteSpace:'nowrap'}}>${t.date}</td>
                    <td style=${{padding:'8px 10px'}}>
                      <span style=${{
                        background:t.sign>0?'rgba(82,214,138,.1)':t.type==='换汇卖出'?'rgba(201,160,67,.1)':'rgba(240,128,128,.1)',
                        color:t.sign>0?'var(--ok)':t.type==='换汇卖出'?'var(--gold)':'var(--err)',
                        padding:'2px 7px',borderRadius:4,fontSize:11,fontWeight:600,whiteSpace:'nowrap'
                      }}>${t.type}</span>
                    </td>
                    <td style=${{padding:'8px 10px',textAlign:'right',fontFamily:'var(--fh)',fontSize:15,
                      color:t.sign>0?'var(--ok)':t.type==='换汇卖出'?'var(--gold)':'var(--err)',fontWeight:600,whiteSpace:'nowrap'}}>
                      ${t.sign>0?'+':'-'}${fmtNum(t.amount)}
                    </td>
                    <td style=${{padding:'8px 10px',color:'var(--gold)',fontSize:12,fontWeight:600}}>${t.currency}</td>
                    <td style=${{padding:'8px 10px',color:'var(--muted)',fontSize:12,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>${t.note||'—'}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          </div>`
        }
        <div className="modal-footer" style=${{marginTop:16}}>
          <button className="btn btn-ghost" onClick=${onClose}>关闭</button>
        </div>
      </div>
    </div>
  `;
}
