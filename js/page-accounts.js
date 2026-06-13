function AccountsPage({data,totals,baseCur,saveAccount,deleteAccount,saveHolding,deleteHolding,saveLiability,deleteLiability,savePayment,deletePayment,settleDeposit,addExpense,deleteExpense,saveIncomePlan,deleteIncomePlan,confirmIncome}){
  const [showAdd,setShowAdd]=useState(false);
  const [showExpense,setShowExpense]=useState(false);
  const totMap=useMemo(()=>Object.fromEntries(totals.map(a=>[a.id,{total:a.total,assetTotal:a.assetTotal,liabTotal:a.liabTotal}])),[totals]);
  return html`
    <div>
      <div className="fb mb20" style=${{flexWrap:'wrap',gap:10}}>
        <div><div className="pg-title">银行账户</div><div className="pg-sub">管理银行卡、存款与负债项目</div></div>
        <div className="fc g8">
          <button className="btn btn-xs" style=${{background:'rgba(240,128,128,.12)',color:'var(--err)',border:'1px solid rgba(240,128,128,.25)'}}
            onClick=${()=>setShowExpense(true)}>💸 记支出</button>
          <button className="btn btn-gold shrink0" onClick=${()=>setShowAdd(true)}>+ 添加账户</button>
        </div>
      </div>
      ${data.accounts.length===0
        ?html`<div className="empty"><div className="empty-ico">🏦</div><div>暂无账户</div></div>`
        :html`<div style=${{display:'flex',flexDirection:'column',gap:10}}>
            ${data.accounts.map(acc=>html`<${AccountItem} key=${acc.id} acc=${acc} totInfo=${totMap[acc.id]} baseCur=${baseCur}
              investments=${data.investments} allAccounts=${data.accounts}
              fxHistory=${data.fxHistory||[]} transfers=${data.transfers||[]}
              saveAccount=${saveAccount} onDelete=${()=>deleteAccount(acc.id)}
              saveHolding=${h=>saveHolding(acc.id,h)} onDeleteHolding=${hid=>deleteHolding(acc.id,hid)}
              saveLiability=${l=>saveLiability(acc.id,l)} onDeleteLiability=${lid=>deleteLiability(acc.id,lid)}
              savePayment=${(liabId,pmt)=>savePayment(acc.id,liabId,pmt)}
              deletePayment=${(liabId,pmtId)=>deletePayment(acc.id,liabId,pmtId)}
              settleDeposit=${(hid,params)=>settleDeposit(acc.id,hid,params)}
              addExpense=${addExpense}/>`)}
          </div>`}

      <!-- 支出记录区块 -->
      <${ExpenseSection} expenses=${data.expenses||[]} accounts=${data.accounts} onDelete=${deleteExpense}
        onAdd=${()=>setShowExpense(true)}/>

      <!-- 定期收入计划区块 -->
      <${IncomePlansSection} plans=${data.incomePlans||[]} accounts=${data.accounts}
        onSave=${saveIncomePlan} onDelete=${deleteIncomePlan} onConfirm=${confirmIncome}/>

      ${showAdd&&html`<${AccountModal} acc=${null} onSave=${a=>{saveAccount(a);setShowAdd(false);}} onClose=${()=>setShowAdd(false)}/>`}
      ${showExpense&&html`<${ExpenseModal} accounts=${data.accounts}
        onSave=${exp=>{addExpense(exp);setShowExpense(false);}}
        onClose=${()=>setShowExpense(false)}/>`}
    </div>
  `;
}

function AccountItem({acc,totInfo,baseCur,investments,allAccounts,fxHistory,transfers,saveAccount,onDelete,saveHolding,onDeleteHolding,saveLiability,onDeleteLiability,savePayment,deletePayment,settleDeposit,addExpense}){
  const [open,setOpen]=useState(false);
  const [editMode,setEditMode]=useState(false);
  const [addHolding,setAddHolding]=useState(false);
  const [editHolding,setEditHolding]=useState(null);
  const [settleHolding,setSettleHolding]=useState(null);
  const [addLiab,setAddLiab]=useState(false);
  const [editLiab,setEditLiab]=useState(null);
  const [showStatement,setShowStatement]=useState(false);
  const [showExpense,setShowExpense]=useState(false);
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
              <button className="btn btn-xs" style=${{background:'rgba(240,128,128,.1)',color:'var(--err)',border:'1px solid rgba(240,128,128,.2)'}}
                onClick=${()=>setShowExpense(true)}>💸 记支出</button>
              <button className="btn btn-ghost btn-xs" onClick=${()=>setShowStatement(true)}>📋 流水</button>
              <button className="btn btn-ghost btn-xs" onClick=${()=>setEditMode(true)}>编辑账户</button>
              <button className="btn btn-danger btn-xs" onClick=${onDelete}>删除</button>
            </div>
          </div>
          ${(acc.holdings||[]).filter(h=>Number(h.amount)!==0).length===0
            ?html`<div className="ts tm" style=${{padding:'6px 0'}}>暂无货币记录</div>`
            :(acc.holdings||[]).filter(h=>Number(h.amount)!==0).map(h=>{
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
                        ${(h.entryDate||h.summary)?html`<div className="txs tm">${h.entryDate?h.entryDate:''}${h.summary?' · '+h.summary:''}</div>`:null}
                      </div>
                      <div className="fc g8">
                        <div className="hold-amt" style=${{color:isZero?'var(--muted)':undefined}}>${CUR_SYM[h.currency]}${fmtNum(h.amount)}</div>
                        ${(()=>{
                          if(!h.depositType||h.depositType==='none'||isZero)return null;
                          const di=calcDepositInterest(h);
                          const isMatured=di&&di.isMatured;
                          if(!isMatured)return null;
                          return html`<button className="btn btn-xs" style=${{background:'rgba(82,200,122,.12)',color:'var(--ok)',border:'1px solid rgba(82,200,122,.25)',padding:'2px 8px',fontSize:11}}
                            onClick=${()=>setSettleHolding(h)}>🏦 结算</button>`;
                        })()}
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
              const pos=calcEffectivePosition(inv);
              let valStr='';
              if(cat==='fixed'){const fr=calcFixedReturn(inv);const v=fr?fr.principal+fr.accrued:Number(inv.buyPrice)*Number(inv.quantity||1);valStr=(CUR_SYM[inv.currency]||'')+fmtNum(v);}
              else{const p=inv.currentPrice!=null?Number(inv.currentPrice):Number(inv.buyPrice);valStr=(CUR_SYM[inv.currency]||'')+fmtNum(p*pos.effectiveQty);}
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
      ${showStatement?html`<${StatementModal} acc=${acc} fxHistory=${fxHistory||[]} transfers=${transfers||[]} onClose=${()=>setShowStatement(false)}/>`:null}
      ${showExpense?html`<${ExpenseModal} accounts=${[acc]} defaultAccountId=${acc.id}
        onSave=${exp=>{addExpense(exp);setShowExpense(false);}}
        onClose=${()=>setShowExpense(false)}/>`:null}
      ${settleHolding?html`<${HoldingSettleModal} acc=${acc} holding=${settleHolding}
        onSettle=${params=>{settleDeposit(settleHolding.id||(settleHolding.currency+(settleHolding.startDate||'')),params);setSettleHolding(null);}}
        onClose=${()=>setSettleHolding(null)}/>`:null}
    </div>
  `;
}

// ── 支出记录区块 ──────────────────────────────────────────
function ExpenseSection({expenses,accounts,onDelete,onAdd}){
  const [filterAcc,setFilterAcc]=useState('');
  const [filterCat,setFilterCat]=useState('');
  const [filterMonth,setFilterMonth]=useState(()=>new Date().toISOString().slice(0,7));
  const [show,setShow]=useState(true);

  const allMonths=useMemo(()=>{
    const s=new Set(expenses.map(e=>e.date.slice(0,7)));
    const cur=new Date().toISOString().slice(0,7);
    s.add(cur);
    return [...s].sort((a,b)=>b.localeCompare(a));
  },[expenses]);

  const filtered=useMemo(()=>expenses.filter(e=>{
    if(filterMonth&&e.date.slice(0,7)!==filterMonth)return false;
    if(filterAcc&&String(e.accountId)!==String(filterAcc))return false;
    if(filterCat&&e.category!==filterCat)return false;
    return true;
  }),[expenses,filterMonth,filterAcc,filterCat]);

  // 本月分类汇总（按货币分组）
  const catSummary=useMemo(()=>{
    const map={};
    filtered.forEach(e=>{
      const k=e.category;
      if(!map[k])map[k]={category:k,amounts:{}};
      map[k].amounts[e.currency]=(map[k].amounts[e.currency]||0)+Number(e.amount);
    });
    return Object.values(map).sort((a,b)=>Object.values(b.amounts).reduce((s,v)=>s+v,0)-Object.values(a.amounts).reduce((s,v)=>s+v,0));
  },[filtered]);

  // 所有货币列表
  const currencies=useMemo(()=>[...new Set(filtered.map(e=>e.currency))],[filtered]);

  // 分类环形图数据（仅首个货币）
  const primaryCur=currencies[0]||'CNY';
  const donutSegs=useMemo(()=>catSummary.map(s=>({
    value:s.amounts[primaryCur]||0,
    color:EXPENSE_CAT_COLORS[s.category]||'#888',
    label:s.category,
  })).filter(s=>s.value>0),[catSummary,primaryCur]);
  const primaryTotal=donutSegs.reduce((s,d)=>s+d.value,0);

  const getAcc=id=>accounts.find(a=>String(a.id)===String(id));

  if(expenses.length===0&&!onAdd)return null;

  return html`
    <div style=${{marginTop:32}}>
      <div className="fb mb14" style=${{alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div className="fc g8">
          <span style=${{fontSize:16}}>💸</span>
          <span className="fw6 ts">支出记录</span>
        </div>
        <div className="fc g6" style=${{marginLeft:'auto'}}>
          <button className="btn btn-xs" style=${{background:'rgba(240,128,128,.12)',color:'var(--err)',border:'1px solid rgba(240,128,128,.25)'}}
            onClick=${onAdd}>+ 记支出</button>
          <button className="btn btn-ghost btn-xs" onClick=${()=>setShow(p=>!p)}>${show?'收起 ▲':'展开 ▼'}</button>
        </div>
      </div>

      ${show&&html`<div>
        <!-- 筛选栏 -->
        <div className="card mb14" style=${{padding:'10px 14px'}}>
          <div style=${{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:8,alignItems:'center'}}>
            <select className="inp" value=${filterMonth} onChange=${e=>setFilterMonth(e.target.value)} style=${{margin:0}}>
              ${allMonths.map(m=>html`<option key=${m} value=${m}>${m}</option>`)}
            </select>
            <select className="inp" value=${filterAcc} onChange=${e=>setFilterAcc(e.target.value)} style=${{margin:0,width:'auto'}}>
              <option value="">全部账户</option>
              ${accounts.map(a=>html`<option key=${a.id} value=${a.id}>${a.name}</option>`)}
            </select>
            <select className="inp" value=${filterCat} onChange=${e=>setFilterCat(e.target.value)} style=${{margin:0,width:'auto'}}>
              <option value="">全部分类</option>
              ${EXPENSE_CATEGORIES.map(c=>html`<option key=${c} value=${c}>${c}</option>`)}
            </select>
            ${(filterAcc||filterCat)?html`
              <button className="btn btn-ghost btn-xs" onClick=${()=>{setFilterAcc('');setFilterCat('');}}>✕</button>
            `:html`<div/>`}
          </div>
        </div>

        <!-- 汇总 + 图表 -->
        ${filtered.length>0?html`
          <div className="card mb14" style=${{padding:'14px 18px'}}>
            <div style=${{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
              ${donutSegs.length>1?html`
                <${DonutChart} segments=${donutSegs} size=${130}
                  centerLabel=${(CUR_SYM[primaryCur]||'')+fmtNum(primaryTotal,0)}
                  centerSub=${filterMonth}/>
              `:null}
              <div style=${{flex:1,minWidth:160}}>
                <div className="txs tm fw6 mb8">${filterMonth} 支出分类</div>
                ${catSummary.map(s=>html`
                  <div key=${s.category} style=${{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <div style=${{width:10,height:10,borderRadius:2,background:EXPENSE_CAT_COLORS[s.category]||'#888',flexShrink:0}}/>
                    <span className="txs" style=${{flex:1,color:'var(--muted)'}}>${s.category}</span>
                    <div style=${{textAlign:'right'}}>
                      ${Object.entries(s.amounts).map(([cur,amt])=>html`
                        <div key=${cur} className="fn txs">${CUR_SYM[cur]||''}${fmtNum(amt)}</div>
                      `)}
                    </div>
                  </div>
                `)}
                ${currencies.length>1?html`
                  <div className="txs tm mt8" style=${{opacity:.6}}>环形图仅显示 ${primaryCur}</div>
                `:null}
              </div>
            </div>
          </div>
        `:html`<div className="ts tm" style=${{padding:'8px 0 16px'}}>本月暂无支出记录</div>`}

        <!-- 支出列表 -->
        ${filtered.length>0?html`
          <div style=${{display:'flex',flexDirection:'column',gap:6}}>
            ${[...filtered].sort((a,b)=>b.date.localeCompare(a.date)||(b.ts||0)-(a.ts||0)).map(e=>{
              const acc=getAcc(e.accountId);
              const sym=CUR_SYM[e.currency]||'';
              const catColor=EXPENSE_CAT_COLORS[e.category]||'#888';
              return html`
                <div key=${e.id} style=${{background:'var(--bg2)',borderRadius:8,padding:'10px 14px',
                  display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',
                  borderLeft:'3px solid '+catColor}}>
                  <div style=${{flex:1,minWidth:0}}>
                    <div className="fc g8" style=${{flexWrap:'wrap'}}>
                      <span style=${{fontSize:12,color:catColor,fontWeight:600}}>${e.category}</span>
                      <span className="fn ts" style=${{color:'var(--err)'}}>${sym}${fmtNum(e.amount)}</span>
                      ${acc?html`<span className="txs tm">· ${acc.name}</span>`:''}
                      ${e.note?html`<span className="txs tm">· ${e.note}</span>`:''}
                    </div>
                    <div className="txs tm mt2">${fmtDate(e.date)}</div>
                  </div>
                  <button className="btn btn-danger btn-xs shrink0" onClick=${()=>onDelete(e.id)}>删除</button>
                </div>
              `;
            })}
          </div>
        `:null}
      </div>`}
    </div>
  `;
}

// ── 定期收入计划区块 ──────────────────────────────────────
function IncomePlansSection({plans,accounts,onSave,onDelete,onConfirm}){
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);

  const today=new Date();
  const todayDay=today.getDate();
  const currentMonth=today.toISOString().slice(0,7);

  // 本月到期但未确认的计划
  const duePlans=plans.filter(p=>
    todayDay>=Number(p.dayOfMonth) && p.lastConfirmedMonth!==currentMonth
  );

  // 距下次到账天数
  const daysUntil=p=>{
    const d=new Date(today);
    d.setDate(Number(p.dayOfMonth));
    if(d<today){d.setMonth(d.getMonth()+1);d.setDate(Number(p.dayOfMonth));}
    return Math.ceil((d-today)/86400000);
  };

  const getAcc=id=>accounts.find(a=>String(a.id)===String(id));

  return html`
    <div style=${{marginTop:32}}>
      <!-- 标题栏 -->
      <div className="fb mb12" style=${{alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div className="fc g8">
          <span className="fw6 ts">📅 定期收入计划</span>
          <span className="txs tm">${plans.length} 个计划</span>
        </div>
        <button className="btn btn-xs" style=${{background:'rgba(82,200,122,.12)',color:'var(--ok)',border:'1px solid rgba(82,200,122,.25)'}}
          onClick=${()=>{setEditItem(null);setShowAdd(true);}}>+ 新建计划</button>
      </div>

      <!-- 到账提醒 -->
      ${duePlans.map(p=>{
        const sym=CUR_SYM[p.currency]||'';
        const acc=getAcc(p.accountId);
        return html`
          <div key=${p.id} style=${{background:'rgba(82,200,122,.08)',border:'1px solid rgba(82,200,122,.25)',
            borderRadius:10,padding:'12px 16px',marginBottom:10,
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <div className="fc g10">
              <span style=${{fontSize:20}}>💰</span>
              <div>
                <div className="ts fw6" style=${{color:'var(--ok)'}}>${p.name} 本月已到账</div>
                <div className="txs tm">${sym}${fmtNum(p.amount)} ${p.currency}${acc?' → '+acc.name:''}</div>
              </div>
            </div>
            <button className="btn btn-sm" style=${{background:'rgba(82,200,122,.15)',color:'var(--ok)',border:'1px solid rgba(82,200,122,.3)'}}
              onClick=${()=>onConfirm(p.id)}>
              ✅ 确认入账
            </button>
          </div>
        `;
      })}

      <!-- 计划列表 -->
      ${plans.length===0
        ?html`<div className="ts tm" style=${{padding:'8px 0'}}>暂无计划，点击「新建计划」添加</div>`
        :html`<div style=${{display:'flex',flexDirection:'column',gap:6}}>
          ${plans.map(p=>{
            const sym=CUR_SYM[p.currency]||'';
            const acc=getAcc(p.accountId);
            const confirmed=p.lastConfirmedMonth===currentMonth;
            const days=daysUntil(p);
            return html`
              <div key=${p.id} style=${{background:'var(--bg2)',borderRadius:8,padding:'12px 14px',
                display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <div style=${{flex:1,minWidth:0}}>
                  <div className="fc g8" style=${{flexWrap:'wrap',marginBottom:3}}>
                    <span className="ts fw6">${p.name}</span>
                    <span className="fn" style=${{color:'var(--ok)',fontSize:15}}>${sym}${fmtNum(p.amount)}</span>
                    ${acc?html`<span className="txs tm">→ ${acc.name}</span>`:''}
                    ${p.note?html`<span className="txs tm">· ${p.note}</span>`:''}
                  </div>
                  <div className="fc g10 txs tm">
                    <span>每月 <b style=${{color:'var(--gold)'}}>${p.dayOfMonth}</b> 号</span>
                    ${confirmed
                      ?html`<span style=${{color:'var(--ok)'}}>✓ 本月已确认</span>`
                      :html`<span style=${{color:days===0?'var(--err)':days<=3?'var(--gold)':'var(--muted)'}}>
                        ${days===0?'今天到账':days<=3?days+'天后到账':'还有'+days+'天'}
                      </span>`}
                  </div>
                </div>
                <div className="fc g6">
                  <button className="btn btn-ghost btn-xs" onClick=${()=>{setEditItem(p);setShowAdd(true);}}>编辑</button>
                  <button className="btn btn-danger btn-xs" onClick=${()=>onDelete(p.id)}>删除</button>
                </div>
              </div>
            `;
          })}
        </div>`}

      ${showAdd&&html`<${IncomePlanModal}
        accounts=${accounts}
        plan=${editItem}
        onSave=${p=>{onSave(p);setShowAdd(false);setEditItem(null);}}
        onClose=${()=>{setShowAdd(false);setEditItem(null);}}/>`}
    </div>
  `;
}
