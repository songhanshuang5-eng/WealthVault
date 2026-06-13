// ══════════════════════════════════════════════════════════
// 收支相关 Modal：定期收入计划、支出记录
// ══════════════════════════════════════════════════════════

function IncomePlanModal({accounts,plan,onSave,onClose}){
  const [f,sf]=useState({
    name:plan?.name||'',
    amount:plan?.amount||'',
    currency:plan?.currency||(accounts[0]?.holdings?.[0]?.currency||'CNY'),
    accountId:plan?.accountId||(accounts[0]?.id||''),
    dayOfMonth:plan?.dayOfMonth||1,
    note:plan?.note||'',
  });
  const set=k=>e=>sf(x=>({...x,[k]:e.target.value}));
  const selectedAcc=accounts.find(a=>String(a.id)===String(f.accountId));
  const onAccChange=e=>{
    const acc=accounts.find(a=>String(a.id)===String(e.target.value));
    const cur=acc?.holdings?.[0]?.currency||'CNY';
    sf(x=>({...x,accountId:e.target.value,currency:cur}));
  };
  const canSave=f.name.trim()&&Number(f.amount)>0&&f.dayOfMonth>=1&&f.dayOfMonth<=31;
  const submit=()=>{
    if(!canSave)return;
    onSave({...plan,...f,amount:Number(f.amount),dayOfMonth:Number(f.dayOfMonth)});
  };
  const sym=CUR_SYM[f.currency]||'';
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:400}}>
        <div className="modal-title">${plan?'编辑收入计划':'新建定期收入计划'}</div>

        <div className="inp-group"><div className="inp-label">收入名称 *</div>
          <input className="inp" placeholder="例：工资、房租收入" autoFocus
            value=${f.name} onChange=${set('name')}/>
        </div>

        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">金额 *</div>
            <input className="inp" type="number" step="any" min="0"
              placeholder="每次入账金额" value=${f.amount} onChange=${set('amount')}/>
          </div>
          <div className="inp-group"><div className="inp-label">每月几号到账</div>
            <input className="inp" type="number" min="1" max="31"
              value=${f.dayOfMonth} onChange=${set('dayOfMonth')}/>
          </div>
        </div>

        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">存入账户</div>
            <select className="inp" value=${f.accountId} onChange=${onAccChange}>
              <option value="">不关联账户</option>
              ${accounts.map(a=>html`<option key=${a.id} value=${a.id}>${a.name}</option>`)}
            </select>
          </div>
          <div className="inp-group"><div className="inp-label">货币</div>
            <select className="inp" value=${f.currency} onChange=${set('currency')}>
              ${(selectedAcc?.holdings||[]).length>0
                ?(selectedAcc.holdings||[]).map(h=>html`<option key=${h.currency} value=${h.currency}>${h.currency}</option>`)
                :CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c}</option>`)}
            </select>
          </div>
        </div>

        <div className="inp-group"><div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder="例：税后工资" value=${f.note} onChange=${set('note')}
            onKeyDown=${e=>e.key==='Enter'&&submit()}/>
        </div>

        ${f.name&&Number(f.amount)>0?html`
          <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13}}>
            <div className="fc g6 txs tm">
              <span>📅</span>
              <span>每月 <b style=${{color:'var(--gold)'}}>${f.dayOfMonth}</b> 号提醒入账</span>
              <span style=${{color:'var(--ok)',fontWeight:600}}>${sym}${fmtNum(Number(f.amount))}</span>
              ${f.accountId?html`<span>→ ${selectedAcc?.name||''}</span>`:''}
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

function ExpenseModal({accounts,defaultAccountId,onSave,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const _defAcc=accounts.find(a=>String(a.id)===String(defaultAccountId));
  const _defCur=_defAcc?.holdings?.find(h=>Number(h.amount)>0)?.currency
    ||_defAcc?.holdings?.[0]?.currency||'CNY';
  const [f,sf]=useState({
    date:today,
    amount:'',
    currency:_defCur,
    accountId:defaultAccountId||'',
    category:EXPENSE_CATEGORIES[0],
    note:'',
  });
  const set=k=>e=>sf(x=>({...x,[k]:e.target.value}));

  const selectedAcc=accounts.find(a=>String(a.id)===String(f.accountId));
  const avail=selectedAcc
    ?(selectedAcc.holdings||[])
      .filter(h=>h.currency===f.currency)
      .reduce((s,h)=>s+Number(h.amount||0),0)
    :null;
  const insufficient=avail!==null&&Number(f.amount)>Number(avail);
  const canSave=f.amount&&Number(f.amount)>0&&f.date&&f.currency&&!insufficient;

  const onAccChange=e=>{
    const acc=accounts.find(a=>String(a.id)===String(e.target.value));
    const firstCur=acc?.holdings?.[0]?.currency||'CNY';
    sf(x=>({...x,accountId:e.target.value,currency:firstCur}));
  };

  const submit=()=>{
    if(!canSave)return;
    onSave({date:f.date,amount:Number(f.amount),currency:f.currency,
      accountId:f.accountId||null,category:f.category,note:f.note.trim()});
  };

  const sym=CUR_SYM[f.currency]||'';
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:420}}>
        <div className="modal-title">💸 记录支出</div>

        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">日期 *</div>
            <input className="inp" type="date" value=${f.date} onChange=${set('date')}/>
          </div>
          <div className="inp-group">
            <div className="inp-label">金额 *</div>
            <input className="inp" type="number" step="any" min="0" autoFocus
              placeholder="支出金额" value=${f.amount}
              style=${{borderColor:insufficient?'var(--err)':undefined}}
              onChange=${set('amount')}/>
            ${insufficient?html`<div style=${{color:'var(--err)',fontSize:12,marginTop:3}}>余额不足，可用 ${sym}${fmtNum(avail)}</div>`:null}
            ${avail!==null&&!insufficient?html`<div className="txs tm mt1">可用 ${sym}${fmtNum(avail)}</div>`:null}
          </div>
        </div>

        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">扣款账户</div>
            <select className="inp" value=${f.accountId} onChange=${onAccChange}>
              <option value="">不关联账户</option>
              ${accounts.map(a=>html`<option key=${a.id} value=${a.id}>${a.name}</option>`)}
            </select>
          </div>
          <div className="inp-group"><div className="inp-label">货币</div>
            <select className="inp" value=${f.currency} onChange=${set('currency')}>
              ${(selectedAcc?.holdings||[]).length>0
                ?(selectedAcc.holdings||[]).map(h=>html`<option key=${h.currency} value=${h.currency}>${h.currency}</option>`)
                :CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c}</option>`)}
            </select>
          </div>
        </div>

        <div className="inp-group"><div className="inp-label">分类</div>
          <div style=${{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
            ${EXPENSE_CATEGORIES.map(cat=>html`
              <button key=${cat} onClick=${()=>sf(x=>({...x,category:cat}))}
                style=${{padding:'4px 12px',borderRadius:20,fontSize:12,cursor:'pointer',border:'1px solid',
                  background:f.category===cat?(EXPENSE_CAT_COLORS[cat]+'33'):'transparent',
                  borderColor:f.category===cat?EXPENSE_CAT_COLORS[cat]:'rgba(255,255,255,.12)',
                  color:f.category===cat?EXPENSE_CAT_COLORS[cat]:'var(--muted)',
                  transition:'all .15s'}}>
                ${cat}
              </button>
            `)}
          </div>
        </div>

        <div className="inp-group" style=${{marginTop:12}}><div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder="例：午餐、地铁月票" value=${f.note} onChange=${set('note')}
            onKeyDown=${e=>e.key==='Enter'&&submit()}/>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn" style=${{background:'rgba(240,128,128,.15)',color:'var(--err)',border:'1px solid rgba(240,128,128,.3)'}}
            onClick=${submit} disabled=${!canSave}>
            💸 确认支出
          </button>
        </div>
      </div>
    </div>
  `;
}
