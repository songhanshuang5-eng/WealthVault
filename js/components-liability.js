// ══════════════════════════════════════════════════════════
// 负债相关组件：LiabilityModal, PaymentModal, LiabilityRow
// ══════════════════════════════════════════════════════════

function LiabilityModal({liab,onSave,onClose}){
  const [f,sf]=useState({
    name:liab?liab.name:'',currency:liab?liab.currency:'CNY',
    principal:liab?liab.principal:'',interestRate:liab?liab.interestRate:'',
    startDate:liab?liab.startDate:new Date().toISOString().slice(0,10),
    dueDate:liab?liab.dueDate:'',paymentFreq:liab?liab.paymentFreq:'monthly',note:liab?liab.note:''
  });
  const set=k=>e=>sf(x=>({...x,[k]:e.target.value}));
  const calc=(f.principal&&f.interestRate&&f.startDate&&f.dueDate)?calcLiability(f):null;
  const submit=()=>{
    if(!f.name||!f.principal||!f.interestRate||!f.dueDate)return;
    onSave({...liab,...f,principal:Number(f.principal),interestRate:Number(f.interestRate)});
  };
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-title">${liab?'编辑负债':'添加负债项目'}</div>
        <div className="inp-group"><div className="inp-label">负债名称 *</div>
          <input className="inp" placeholder="例：住房贷款、信用卡欠款" value=${f.name} onChange=${set('name')}/>
        </div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">货币</div>
            <select className="inp" value=${f.currency} onChange=${set('currency')}>${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c}</option>`)}</select>
          </div>
          <div className="inp-group"><div className="inp-label">当前余额（本金）*</div>
            <input className="inp" type="number" step="any" min="0" placeholder="剩余欠款金额" value=${f.principal} onChange=${set('principal')}/>
          </div>
        </div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">年利率（%）*</div>
            <input className="inp" type="number" step="any" min="0" placeholder="例：4.2" value=${f.interestRate} onChange=${set('interestRate')}/>
          </div>
          <div className="inp-group"><div className="inp-label">还款方式</div>
            <select className="inp" value=${f.paymentFreq} onChange=${set('paymentFreq')}>
              <option value="monthly">每月还款</option>
              <option value="quarterly">每季度还款</option>
              <option value="yearly">每年还款</option>
              <option value="bullet">到期一次性还款</option>
            </select>
          </div>
        </div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">计息起始日</div>
            <input className="inp" type="date" value=${f.startDate} onChange=${set('startDate')}/>
          </div>
          <div className="inp-group"><div className="inp-label">到期日 *</div>
            <input className="inp" type="date" value=${f.dueDate} onChange=${set('dueDate')}/>
          </div>
        </div>
        <div className="inp-group"><div className="inp-label">备注</div>
          <input className="inp" placeholder="备注" value=${f.note} onChange=${set('note')}/>
        </div>
        ${calc&&calc.payment&&html`
          <div style=${{background:'var(--bg3)',padding:'12px 14px',borderRadius:8,marginBottom:12}}>
            <div className="fb mb6"><span className="ts tm">${FREQ_LABEL[f.paymentFreq]}还款额</span><span className="fh fn" style=${{fontSize:20,color:'var(--err)'}}>${CUR_SYM[f.currency]}${fmtNum(calc.payment)}</span></div>
            <div className="fb mb4"><span className="ts tm">预计总利息</span><span className="fn ts" style=${{color:'var(--err)'}}>${CUR_SYM[f.currency]}${fmtNum(calc.totalInterest)}</span></div>
            ${calc.remainingPeriods&&html`<div className="fb"><span className="ts tm">剩余期数</span><span className="ts">${calc.remainingPeriods} / ${calc.totalPeriods} 期</span></div>`}
          </div>
        `}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn btn-gold" onClick=${submit} disabled=${!f.name||!f.principal||!f.interestRate||!f.dueDate}>保存</button>
        </div>
      </div>
    </div>
  `;
}

function PaymentModal({liab,allAccounts,onSave,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const remaining=calcRemainingPrincipal(liab);
  const calc=calcLiability(liab);
  const suggested=calc.payment?fmtNum(calc.payment,2).replace(/,/g,''):fmtNum(remaining,2).replace(/,/g,'');
  const [date,setDate]=useState(today);
  const [amount,setAmount]=useState(suggested);
  const [fromAccId,setFromAccId]=useState(()=>{
    const match=allAccounts.find(a=>(a.holdings||[]).some(h=>h.currency===liab.currency&&h.amount>0));
    return match?match.id:'';
  });
  const [note,setNote]=useState('');
  const [err,setErr]=useState('');

  const totalPaid=Number(amount)||0;
  const periodInterest=calcPeriodInterest(remaining,liab.interestRate,liab.paymentFreq);
  const interestPaid=Math.min(periodInterest,totalPaid);
  const principalPaid=Math.max(0,totalPaid-interestPaid);
  const newRemaining=Math.max(0,remaining-principalPaid);

  const fromAcc=allAccounts.find(a=>a.id===fromAccId);
  const availBal=(fromAcc?.holdings||[]).find(h=>h.currency===liab.currency)?.amount||0;

  const canSave=totalPaid>0&&date;
  const submit=()=>{
    if(!canSave)return;
    if(fromAccId&&totalPaid>availBal){setErr(`账户余额不足，可用 ${CUR_SYM[liab.currency]}${fmtNum(availBal)}`);return;}
    onSave({date,totalPaid,principalPaid,interestPaid,currency:liab.currency,fromAccountId:fromAccId||null,note:note.trim()});
  };

  const sym=CUR_SYM[liab.currency]||'';
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-title">记录还款 · ${liab.name}</div>
        <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px',marginBottom:14}}>
          <div className="fb mb4">
            <span className="txs tm">当前剩余本金</span>
            <span className="fn ts" style=${{color:'var(--err)'}}>${sym}${fmtNum(remaining)}</span>
          </div>
          ${calc.payment&&html`<div className="fb">
            <span className="txs tm">本期建议还款</span>
            <span className="fn ts">${sym}${fmtNum(calc.payment)}</span>
          </div>`}
        </div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">还款日期 *</div>
            <input className="inp" type="date" value=${date} onChange=${e=>setDate(e.target.value)}/>
          </div>
          <div className="inp-group"><div className="inp-label">还款金额 *</div>
            <input className="inp" type="number" step="any" min="0" value=${amount} onChange=${e=>{setAmount(e.target.value);setErr('');}}/>
          </div>
        </div>
        <div className="inp-group"><div className="inp-label">扣款账户（可选）</div>
          <select className="inp" value=${fromAccId} onChange=${e=>{setFromAccId(e.target.value);setErr('');}}>
            <option value="">不自动扣款</option>
            ${allAccounts.map(a=>{
              const bal=(a.holdings||[]).find(h=>h.currency===liab.currency)?.amount||0;
              return html`<option key=${a.id} value=${a.id}>${a.name} · ${sym}${fmtNum(bal)}</option>`;
            })}
          </select>
        </div>
        ${totalPaid>0&&html`
          <div style=${{background:'rgba(240,128,128,.07)',border:'1px solid rgba(240,128,128,.15)',borderRadius:8,padding:'10px 14px',marginBottom:10}}>
            <div className="fb mb4">
              <span className="txs tm">利息部分</span>
              <span className="fn ts" style=${{color:'var(--err)'}}>${sym}${fmtNum(interestPaid)}</span>
            </div>
            <div className="fb mb4">
              <span className="txs tm">还本部分</span>
              <span className="fn ts" style=${{color:'var(--gold)'}}>${sym}${fmtNum(principalPaid)}</span>
            </div>
            <div className="fb">
              <span className="txs tm">还款后剩余本金</span>
              <span className="fn ts" style=${{color:'var(--err)'}}>${sym}${fmtNum(newRemaining)}</span>
            </div>
          </div>
        `}
        ${err&&html`<div style=${{color:'var(--err)',fontSize:13,marginBottom:8}}>${err}</div>`}
        <div className="inp-group"><div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder="例：6月份月供" value=${note} onChange=${e=>setNote(e.target.value)}/>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn btn-gold" onClick=${submit} disabled=${!canSave}>确认还款</button>
        </div>
      </div>
    </div>
  `;
}

function LiabilityRow({liab,allAccounts,onEdit,onDelete,onSavePayment,onDeletePayment}){
  const [open,setOpen]=useState(false);
  const [showPayment,setShowPayment]=useState(false);
  const [showHistory,setShowHistory]=useState(false);

  const remaining=calcRemainingPrincipal(liab);
  const calc=calcLiability(liab);
  const urgent=calc.daysLeft!==null&&calc.daysLeft<=30&&calc.daysLeft>=0;
  const overdue=calc.daysLeft<0;
  const payments=(liab.payments||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const paidPrincipal=(liab.payments||[]).reduce((s,p)=>s+(p.principalPaid||0),0);
  const originalPrincipal=Number(liab.principal);
  const progressPct=originalPrincipal>0?Math.min(100,paidPrincipal/originalPrincipal*100):0;
  const sym=CUR_SYM[liab.currency]||'';
  const isPaidOff=remaining<=0;

  return html`
    <div style=${{borderBottom:'1px solid rgba(36,45,63,.5)'}}>
      <div className="fb" style=${{padding:'8px 0',cursor:'pointer'}} onClick=${()=>setOpen(!open)}>
        <div style=${{flex:1,minWidth:0}}>
          <div className="fc g8">
            <span style=${{fontSize:11,fontWeight:700,color:'var(--err)',letterSpacing:'.07em'}}>${liab.currency}</span>
            <span style=${{fontSize:14,fontWeight:500}}>${liab.name}</span>
            ${isPaidOff&&html`<span className="tag t-blue">已还清</span>`}
            ${!isPaidOff&&overdue&&html`<span className="tag t-red">已逾期</span>`}
            ${!isPaidOff&&urgent&&!overdue&&html`<span className="tag t-gold">⚠ 即将到期</span>`}
          </div>
          <div className="txs tm mt4">${FREQ_LABEL[liab.paymentFreq]} · 年利率 ${liab.interestRate}% · 到期 ${fmtDate(liab.dueDate)}</div>
          ${payments.length>0&&html`
            <div style=${{marginTop:6}}>
              <div style=${{background:'rgba(255,255,255,.06)',borderRadius:4,height:4,overflow:'hidden'}}>
                <div style=${{height:'100%',width:progressPct+'%',background:isPaidOff?'#52C87A':'var(--err)',borderRadius:4,transition:'width .4s'}}></div>
              </div>
              <div className="txs tm mt2">已还本金 ${sym}${fmtNum(paidPrincipal)}（${fmtNum(progressPct,1)}%）</div>
            </div>
          `}
        </div>
        <div className="fc g8">
          <div className="tr">
            <div style=${{fontSize:14,fontWeight:500,color:'var(--err)'}}>-${sym}${fmtNum(remaining)}</div>
            ${calc.payment&&!isPaidOff&&html`<div className="txs tm">${FREQ_LABEL[liab.paymentFreq]}供 ${sym}${fmtNum(calc.payment)}</div>`}
          </div>
          <span className="tm txs">${open?'▲':'▼'}</span>
        </div>
      </div>

      ${open&&html`
        <div style=${{paddingBottom:12}}>
          <div style=${{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8,marginBottom:12}}>
            ${!isPaidOff&&calc.payment&&html`<div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 12px'}}>
              <div className="txs tm mb4">${FREQ_LABEL[liab.paymentFreq]}还款额</div>
              <div style=${{fontSize:18,fontFamily:'var(--fh)',color:'var(--err)'}}>${sym}${fmtNum(calc.payment)}</div>
            </div>`}
            ${!isPaidOff&&calc.remainingPeriods!=null&&html`<div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 12px'}}>
              <div className="txs tm mb4">剩余期数</div>
              <div style=${{fontSize:18,fontFamily:'var(--fh)',color:'var(--gold)'}}>${calc.remainingPeriods}<span className="txs tm"> / ${calc.totalPeriods} 期</span></div>
            </div>`}
            ${!isPaidOff&&html`<div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 12px'}}>
              <div className="txs tm mb4">剩余本金</div>
              <div style=${{fontSize:18,fontFamily:'var(--fh)',color:'var(--err)'}}>${sym}${fmtNum(remaining)}</div>
            </div>`}
            ${!isPaidOff&&html`<div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 12px'}}>
              <div className="txs tm mb4">${calc.payment?'下次还款':'到期还款'}</div>
              <div style=${{fontSize:13,color:overdue?'var(--err)':urgent?'var(--gold)':'var(--text)'}}>${fmtDate(calc.nextPayDate)}</div>
              <div className="txs mt4" style=${{color:overdue?'var(--err)':calc.daysLeft<=90?'var(--gold)':'var(--muted)'}}>${overdue?'逾期 '+(-calc.daysLeft)+' 天':calc.daysLeft===0?'今日到期':calc.daysLeft+' 天后'}</div>
            </div>`}
          </div>

          ${payments.length>0&&html`
            <div style=${{marginBottom:10}}>
              <div className="fb mb6" style=${{alignItems:'center'}}>
                <span className="txs fw6" style=${{color:'var(--muted)'}}>还款记录（${payments.length} 笔）</span>
                <button className="btn btn-ghost btn-xs" onClick=${()=>setShowHistory(p=>!p)}>${showHistory?'收起':'展开'}</button>
              </div>
              ${showHistory&&html`
                <div style=${{display:'flex',flexDirection:'column',gap:4}}>
                  ${payments.map(pmt=>{
                    const pmtAcc=allAccounts?.find(a=>a.id===pmt.fromAccountId);
                    return html`
                      <div key=${pmt.id} style=${{background:'var(--bg3)',borderRadius:6,padding:'8px 10px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
                        <div>
                          <div className="fc g8">
                            <span className="ts">${pmt.date}</span>
                            <span className="fn ts" style=${{color:'var(--err)'}}>${sym}${fmtNum(pmt.totalPaid)}</span>
                            ${pmtAcc&&html`<span className="txs tm">· ${pmtAcc.name}</span>`}
                          </div>
                          <div className="fc g12 mt2 txs tm">
                            <span>利息 ${sym}${fmtNum(pmt.interestPaid)}</span>
                            <span>本金 ${sym}${fmtNum(pmt.principalPaid)}</span>
                            ${pmt.note&&html`<span>· ${pmt.note}</span>`}
                          </div>
                        </div>
                        <button className="btn btn-danger btn-xs" onClick=${()=>onDeletePayment(pmt.id)}>撤销</button>
                      </div>
                    `;
                  })}
                </div>
              `}
            </div>
          `}

          ${liab.note&&html`<div className="txs tm mb8">${liab.note}</div>`}
          <div className="fc g6">
            ${!isPaidOff&&html`<button
              className="btn btn-xs"
              style=${{background:'rgba(240,128,128,.12)',color:'var(--err)',border:'1px solid rgba(240,128,128,.2)'}}
              onClick=${()=>setShowPayment(true)}>💳 还款</button>`}
            <button className="btn btn-ghost btn-xs" onClick=${onEdit}>编辑</button>
            <button className="btn btn-danger btn-xs" onClick=${onDelete}>删除</button>
          </div>
        </div>
      `}

      ${showPayment&&html`<${PaymentModal}
        liab=${liab}
        allAccounts=${allAccounts||[]}
        onSave=${pmt=>{onSavePayment(pmt);setShowPayment(false);}}
        onClose=${()=>setShowPayment(false)}/>`}
    </div>
  `;
}
