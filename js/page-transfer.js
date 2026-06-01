function TransferPage({data,addTransfer,deleteTransfer}){
  const accounts=data.accounts;
  const initFrom=accounts[0]?accounts[0].id:'';
  const initFromHoldings=(accounts[0]?accounts[0].holdings:[])||[];
  const [form,setForm]=useState({
    fromAccountId:initFrom,
    toAccountId:(accounts.find(a=>a.id!==initFrom)||{}).id||'',
    currency:initFromHoldings[0]?initFromHoldings[0].currency:'',
    amount:'',date:new Date().toISOString().slice(0,10),note:''
  });
  const sf=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const fromAcc=accounts.find(a=>a.id===form.fromAccountId);
  const fromHoldings=(fromAcc?fromAcc.holdings:[])||[];
  // 同币种可能有多笔（活期+定期），取唯一货币列表并累加所有同币种余额
  const availCurs=[...new Set(fromHoldings.map(h=>h.currency))];
  const maxAmt=fromHoldings.filter(h=>h.currency===form.currency).reduce((s,h)=>s+h.amount,0);
  const toAccounts=accounts.filter(a=>a.id!==form.fromAccountId);
  const valid=form.fromAccountId&&form.toAccountId&&form.fromAccountId!==form.toAccountId&&form.currency&&Number(form.amount)>0&&Number(form.amount)<=maxAmt;
  const getAccName=id=>{const a=accounts.find(a=>a.id===id);return a?a.name:'—';};
  const submit=()=>{
    if(!valid)return;
    addTransfer({fromAccountId:form.fromAccountId,toAccountId:form.toAccountId,currency:form.currency,amount:Number(form.amount),date:form.date,note:form.note});
    setForm(f=>({...f,amount:'',note:''}));
  };
  return html`
    <div>
      <div className="mb20"><div className="pg-title">账户转账</div><div className="pg-sub">在不同银行账户之间划转资金，余额自动同步</div></div>
      ${accounts.length<2
        ?html`<div className="empty"><div className="empty-ico">🏦</div><div>至少需要两个账户才能进行转账</div></div>`
        :html`<div className="card mb20">
            <div className="fw6 mb16">新建转账</div>
            <div className="modal-row">
              <div className="inp-group"><div className="inp-label">转出账户</div>
                <select className="inp" value=${form.fromAccountId} onChange=${e=>{
                  const id=e.target.value;const acc=accounts.find(a=>a.id===id);
                  const firstCur=((acc?acc.holdings:[])||[])[0];
                  const newTo=(accounts.find(a=>a.id!==id)||{}).id||'';
                  setForm(f=>({...f,fromAccountId:id,currency:firstCur?firstCur.currency:'',amount:'',toAccountId:f.toAccountId===id?newTo:f.toAccountId}));
                }}>
                  ${accounts.map(a=>html`<option key=${a.id} value=${a.id}>${a.name} · ${a.bank}</option>`)}
                </select>
              </div>
              <div className="inp-group"><div className="inp-label">转入账户</div>
                <select className="inp" value=${form.toAccountId} onChange=${sf('toAccountId')}>
                  ${toAccounts.map(a=>html`<option key=${a.id} value=${a.id}>${a.name} · ${a.bank}</option>`)}
                </select>
              </div>
            </div>
            ${availCurs.length===0
              ?html`<div className="alert alert-warn mb12">⚠ 转出账户暂无货币持有记录</div>`
              :html`<${React.Fragment}>
                  <div className="modal-row">
                    <div className="inp-group"><div className="inp-label">转账货币</div>
                      <select className="inp" value=${form.currency} onChange=${e=>setForm(f=>({...f,currency:e.target.value,amount:''}))}>
                        ${availCurs.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}
                      </select>
                    </div>
                    <div className="inp-group">
                      <div className="inp-label">转账金额${maxAmt>0?' （可用: '+(CUR_SYM[form.currency]||'')+fmtNum(maxAmt)+'）':''}</div>
                      <input className="inp" type="number" step="any" min="0" placeholder="输入金额" value=${form.amount} onChange=${sf('amount')}/>
                    </div>
                  </div>
                  <div className="modal-row">
                    <div className="inp-group"><div className="inp-label">转账日期</div><input className="inp" type="date" value=${form.date} onChange=${sf('date')}/></div>
                    <div className="inp-group"><div className="inp-label">备注（可选）</div><input className="inp" placeholder="例：月度归集" value=${form.note} onChange=${sf('note')}/></div>
                  </div>
                  ${form.amount&&Number(form.amount)>maxAmt&&html`<div className="alert alert-warn mb12">⚠ 超过可用余额</div>`}
                  ${valid&&html`
                    <div className="total-banner mb12" style=${{padding:'14px 20px'}}>
                      <div className="total-label">转账确认</div>
                      <div className="fc g8 mb4" style=${{justifyContent:'center',flexWrap:'wrap'}}>
                        <span className="ts tm">${getAccName(form.fromAccountId)}</span><span className="tg fw6">→</span><span className="ts tm">${getAccName(form.toAccountId)}</span>
                      </div>
                      <div className="fh tg fn" style=${{fontSize:32,textAlign:'center'}}>${CUR_SYM[form.currency]}${fmtNum(Number(form.amount))} ${form.currency}</div>
                    </div>
                  `}
                </${React.Fragment}>`}
            <button className="btn btn-gold btn-w" onClick=${submit} disabled=${!valid}>💸 确认转账</button>
          </div>`}
      <div className="fw6 mb12">转账记录</div>
      ${(data.transfers||[]).length===0
        ?html`<div className="empty"><div className="empty-ico">🔄</div><div>暂无转账记录</div></div>`
        :html`<div style=${{display:'flex',flexDirection:'column',gap:8}}>
            ${(data.transfers||[]).map(tx=>html`
              <div key=${tx.id} className="card" style=${{padding:'13px 18px'}}>
                <div className="fb" style=${{flexWrap:'wrap',gap:8}}>
                  <div>
                    <div className="fc g8 fw">
                      <span className="fw6 ts">${getAccName(tx.fromAccountId)}</span>
                      <span className="tm">→</span>
                      <span className="fw6 ts">${getAccName(tx.toAccountId)}</span>
                      <span className="fh tg fn" style=${{fontSize:18}}>${CUR_SYM[tx.currency]}${fmtNum(tx.amount)} ${tx.currency}</span>
                    </div>
                    <div className="txs tm mt4">${fmtDate(tx.date)}${tx.note?' · '+tx.note:''} · 记录于 ${new Date(tx.ts).toLocaleString('zh-CN')}</div>
                  </div>
                  <button className="btn btn-danger btn-xs shrink0" onClick=${()=>deleteTransfer(tx.id)}>删除</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `;
}
