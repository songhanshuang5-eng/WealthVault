function AccountsPage({data,totals,baseCur,saveAccount,deleteAccount,saveHolding,deleteHolding,saveLiability,deleteLiability,savePayment,deletePayment}){
  const [showAdd,setShowAdd]=useState(false);
  const totMap=useMemo(()=>Object.fromEntries(totals.map(a=>[a.id,{total:a.total,assetTotal:a.assetTotal,liabTotal:a.liabTotal}])),[totals]);
  return html`
    <div>
      <div className="fb mb20" style=${{flexWrap:'wrap',gap:10}}>
        <div><div className="pg-title">银行账户</div><div className="pg-sub">管理银行卡、存款与负债项目</div></div>
        <button className="btn btn-gold shrink0" onClick=${()=>setShowAdd(true)}>+ 添加账户</button>
      </div>
      ${data.accounts.length===0
        ?html`<div className="empty"><div className="empty-ico">🏦</div><div>暂无账户</div></div>`
        :html`<div style=${{display:'flex',flexDirection:'column',gap:10}}>
            ${data.accounts.map(acc=>html`<${AccountItem} key=${acc.id} acc=${acc} totInfo=${totMap[acc.id]} baseCur=${baseCur}
              investments=${data.investments} allAccounts=${data.accounts}
              saveAccount=${saveAccount} onDelete=${()=>deleteAccount(acc.id)}
              saveHolding=${h=>saveHolding(acc.id,h)} onDeleteHolding=${hid=>deleteHolding(acc.id,hid)}
              saveLiability=${l=>saveLiability(acc.id,l)} onDeleteLiability=${lid=>deleteLiability(acc.id,lid)}
              savePayment=${(liabId,pmt)=>savePayment(acc.id,liabId,pmt)}
              deletePayment=${(liabId,pmtId)=>deletePayment(acc.id,liabId,pmtId)}/>`)}
          </div>`}
      ${showAdd&&html`<${AccountModal} acc=${null} onSave=${a=>{saveAccount(a);setShowAdd(false);}} onClose=${()=>setShowAdd(false)}/>`}
    </div>
  `;
}

function AccountItem({acc,totInfo,baseCur,investments,allAccounts,saveAccount,onDelete,saveHolding,onDeleteHolding,saveLiability,onDeleteLiability,savePayment,deletePayment}){
  const [open,setOpen]=useState(false);
  const [editMode,setEditMode]=useState(false);
  const [addHolding,setAddHolding]=useState(false);
  const [editHolding,setEditHolding]=useState(null);
  const [addLiab,setAddLiab]=useState(false);
  const [editLiab,setEditLiab]=useState(null);
  const {total,assetTotal,liabTotal}=totInfo||{};
  const hasLiab=(acc.liabilities||[]).length>0;
  const linkedInv=(investments||[]).filter(inv=>inv.accountId===acc.id);
  return html`
    <div className="acc">
      <div className="acc-hdr" onClick=${()=>setOpen(!open)}>
        <div className="fc g12">
          <div className="acc-dot" style=${{background:acc.color||'#C9A043'}}/>
          <div>
            <div className="acc-name">${acc.name}</div>
            <div className="acc-bank-txt">${acc.bank}${acc.number?' · 尾号'+acc.number:''}${acc.note?' · '+acc.note:''}</div>
          </div>
        </div>
        <div className="fc g12">
          ${total!=null?html`
            <div className="tr">
              ${hasLiab&&assetTotal!=null?html`<div className="txs tm">存 ${CUR_SYM[baseCur]}${fmtNum(assetTotal)} · 债 ${CUR_SYM[baseCur]}${fmtNum(liabTotal)}</div>`:null}
              <div className="fh fn" style=${{fontSize:16,color:total>=0?'var(--gold)':'var(--err)'}}>${CUR_SYM[baseCur]}${fmtNum(total)}</div>
              <div className="txs tm">${hasLiab?'净资产 · ':''}${baseCur}</div>
            </div>
          `:null}
          <span className="tm txs">${open?'▲':'▼'}</span>
        </div>
      </div>
      ${open?html`
        <div className="acc-body">
          <div className="fb mb8 mt8" style=${{flexWrap:'wrap',gap:6}}>
            <span className="txs tm fw6">💰 存款</span>
            <div className="fc g6 fw">
              <button className="btn btn-ghost btn-xs" onClick=${()=>setAddHolding(true)}>+ 添加存款</button>
              <button className="btn btn-ghost btn-xs" onClick=${()=>setEditMode(true)}>编辑账户</button>
              <button className="btn btn-danger btn-xs" onClick=${onDelete}>删除</button>
            </div>
          </div>
          ${(acc.holdings||[]).length===0
            ?html`<div className="ts tm" style=${{padding:'6px 0'}}>暂无货币记录</div>`
            :(acc.holdings||[]).map(h=>{
                const di=calcDepositInterest(h);
                const typeLabel=h.depositType==='demand'?'活期':h.depositType==='fixed'?'定期':null;
                const isZero=Number(h.amount)===0;
                return html`
                  <div key=${h.id||h.currency} style=${{borderBottom:'1px solid rgba(36,45,63,.5)',padding:'7px 0',opacity:isZero?0.5:1}}>
                    <div className="fb">
                      <div>
                        <div className="hold-cur">${h.currency}
                          ${typeLabel?html`<span className="tag t-blue" style=${{marginLeft:5,fontSize:9}}>${typeLabel}</span>`:null}
                          ${isZero?html`<span className="tag" style=${{marginLeft:5,fontSize:9,background:'rgba(110,122,144,.15)',color:'var(--muted)'}}>已转出</span>`:null}
                        </div>
                        <div className="hold-name">${CUR_NAMES[h.currency]}${h.interestRate?' · '+h.interestRate+'%/年':''}${h.note?' · '+h.note:''}</div>
                      </div>
                      <div className="fc g8">
                        <div className="hold-amt" style=${{color:isZero?'var(--muted)':undefined}}>${CUR_SYM[h.currency]}${fmtNum(h.amount)}</div>
                        ${!isZero?html`<button className="btn btn-ghost btn-ico txs" onClick=${()=>setEditHolding(h)}>✎</button>`:null}
                        <button className="btn btn-danger btn-ico txs" onClick=${()=>onDeleteHolding(h.id||h.currency)}>✕</button>
                      </div>
                    </div>
                    ${di?html`
                      <div style=${{display:'flex',gap:16,flexWrap:'wrap',marginTop:4,paddingLeft:2}}>
                        ${di.type==='demand'?html`<${React.Fragment}>
                          <span className="txs tm">已计 ${di.days} 天</span>
                          <span className="txs pl-pos">+${CUR_SYM[h.currency]}${fmtNum(di.interest)} 利息</span>
                        </${React.Fragment}>`:null}
                        ${di.type==='fixed'?html`<${React.Fragment}>
                          ${di.isMatured
                            ?html`<span className="txs pl-neg">已到期</span>`
                            :html`<span className="txs tm">还有 ${di.daysLeft} 天到期</span>`}
                          <span className="txs pl-pos">已计 +${CUR_SYM[h.currency]}${fmtNum(di.accrued)}</span>
                          <span className="txs tm">到期共 +${CUR_SYM[h.currency]}${fmtNum(di.totalInterest)}</span>
                        </${React.Fragment}>`:null}
                      </div>
                    `:null}
                  </div>
                `;
              })
          }
          ${linkedInv.length>0?html`
            <div className="fb mt12 mb8" style=${{flexWrap:'wrap',gap:6}}>
              <span className="txs tm fw6">📈 投资持仓</span>
              <span className="txs tm">${linkedInv.length} 项</span>
            </div>
            ${linkedInv.map(inv=>{
              const cat=inv.category||'variable';
              let valStr='';
              if(cat==='fixed'){const fr=calcFixedReturn(inv);const v=fr?fr.principal+fr.accrued:Number(inv.buyPrice)*Number(inv.quantity||1);valStr=(CUR_SYM[inv.currency]||'')+fmtNum(v);}
              else{const p=inv.currentPrice!=null?Number(inv.currentPrice):Number(inv.buyPrice);valStr=(CUR_SYM[inv.currency]||'')+fmtNum(p*Number(inv.quantity||0));}
              return html`
                <div key=${inv.id} style=${{borderBottom:'1px solid rgba(36,45,63,.4)',padding:'7px 0'}}>
                  <div className="fb">
                    <div>
                      <div className="fc g6"><span className="ts fw6">${inv.name}</span><span className="tag t-blue">${inv.type}</span></div>
                      <div className="txs tm mt2">${cat==='fixed'?'固定收益':'非固定收益'}${inv.maturityDate?' · 到期 '+fmtDate(inv.maturityDate):''}</div>
                    </div>
                    <div className="fn ts tg">${valStr} <span className="txs tm">${inv.currency}</span></div>
                  </div>
                </div>
              `;
            })}
          `:null}
          <div className="fb mt12 mb8" style=${{flexWrap:'wrap',gap:6}}>
            <span className="txs fw6" style=${{color:'var(--err)'}}>📋 负债</span>
            <button className="btn btn-xs" style=${{background:'rgba(240,128,128,.1)',color:'var(--err)',border:'1px solid rgba(240,128,128,.2)'}} onClick=${()=>setAddLiab(true)}>+ 添加负债</button>
          </div>
          ${(acc.liabilities||[]).length===0
            ?html`<div className="ts tm" style=${{padding:'4px 0 8px'}}>暂无负债记录</div>`
            :(acc.liabilities||[]).map(l=>html`<${LiabilityRow} key=${l.id} liab=${l}
              allAccounts=${allAccounts}
              onEdit=${()=>setEditLiab(l)}
              onDelete=${()=>onDeleteLiability(l.id)}
              onSavePayment=${pmt=>savePayment(l.id,pmt)}
              onDeletePayment=${pmtId=>deletePayment(l.id,pmtId)}/>`)
          }
        </div>
      `:null}
      ${editMode?html`<${AccountModal} acc=${acc} onSave=${a=>{saveAccount(a);setEditMode(false);}} onClose=${()=>setEditMode(false)}/>`:null}
      ${addHolding?html`<${HoldingModal} acc=${acc} onSave=${h=>{saveHolding(h);setAddHolding(false);}} onClose=${()=>setAddHolding(false)}/>`:null}
      ${editHolding?html`<${HoldingModal} acc=${acc} editHolding=${editHolding} onSave=${h=>{saveHolding(h);setEditHolding(null);}} onClose=${()=>setEditHolding(null)}/>`:null}
      ${addLiab?html`<${LiabilityModal} onSave=${l=>{saveLiability(l);setAddLiab(false);}} onClose=${()=>setAddLiab(false)}/>`:null}
      ${editLiab?html`<${LiabilityModal} liab=${editLiab} onSave=${l=>{saveLiability(l);setEditLiab(null);}} onClose=${()=>setEditLiab(null)}/>`:null}
    </div>
  `;
}
