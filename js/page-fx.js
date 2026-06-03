function FxPage({data,addFx,deleteFx}){
  const today=new Date().toISOString().slice(0,10);
  const [form,setForm]=useState({
    accountId:'',
    sellCurrency:'USD',
    buyCurrency:'CNY',
    rate:'',
    sellAmount:'',
    date:today,
    note:'',
  });
  const sf=v=>e=>setForm(f=>({...f,[v]:e.target.value}));

  // 买入金额 = 卖出金额 × 汇率
  const buyAmount=(form.rate&&form.sellAmount)
    ?Math.round(Number(form.sellAmount)*Number(form.rate)*1e8)/1e8
    :null;

  // 选中账户的余额信息
  const selectedAcc=data.accounts.find(a=>String(a.id)===String(form.accountId));
  const sellBalance=selectedAcc
    ?(selectedAcc.holdings||[]).filter(h=>h.currency===form.sellCurrency).reduce((s,h)=>s+Number(h.amount||0),0)
    :null;
  const insufficientBal=sellBalance!==null&&Number(form.sellAmount)>sellBalance;

  const canSubmit=form.accountId&&form.rate&&form.sellAmount&&Number(form.sellAmount)>0
    &&form.sellCurrency!==form.buyCurrency&&!insufficientBal&&form.date;

  const submit=()=>{
    if(!canSubmit)return;
    addFx({
      accountId:form.accountId,
      sellCurrency:form.sellCurrency,
      sellAmount:Number(form.sellAmount),
      buyCurrency:form.buyCurrency,
      buyAmount,
      rate:Number(form.rate),
      date:form.date,
      note:form.note.trim(),
    });
    setForm(f=>({...f,rate:'',sellAmount:'',note:'',date:today}));
  };

  return html`
    <div>
      <div className="mb20">
        <div className="pg-title">货币兑换</div>
        <div className="pg-sub">记录货币买卖，自动同步账户余额</div>
      </div>

      <div className="card mb20">
        <div className="fw6 mb16">新建货币兑换</div>

        <!-- 选择银行账户 -->
        <div className="inp-group">
          <div className="inp-label">兑换银行 / 账户 *</div>
          <select className="inp" value=${form.accountId} onChange=${sf('accountId')}>
            <option value="">— 请选择账户 —</option>
            ${data.accounts.map(a=>html`<option key=${a.id} value=${a.id}>${a.bank}${a.number?' · 尾号'+a.number:''} — ${a.name}</option>`)}
          </select>
        </div>

        <!-- 日期 -->
        <div className="inp-group">
          <div className="inp-label">兑换日期 *</div>
          <input className="inp" type="date" value=${form.date} onChange=${sf('date')}/>
        </div>

        <!-- 卖出 / 买入货币 -->
        <div className="modal-row">
          <div className="inp-group">
            <div className="inp-label">卖出货币（扣款）</div>
            <select className="inp" value=${form.sellCurrency} onChange=${e=>setForm(f=>({...f,sellCurrency:e.target.value}))}>
              ${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}
            </select>
          </div>
          <div className="inp-group">
            <div className="inp-label">买入货币（到账）</div>
            <select className="inp" value=${form.buyCurrency} onChange=${e=>setForm(f=>({...f,buyCurrency:e.target.value}))}>
              ${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}
            </select>
          </div>
        </div>
        ${form.sellCurrency===form.buyCurrency&&html`
          <div className="alert alert-warn mb12">⚠ 卖出与买入货币不能相同</div>
        `}

        <!-- 汇率 & 卖出金额 -->
        <div className="modal-row">
          <div className="inp-group">
            <div className="inp-label">汇率（1 ${form.sellCurrency} = ? ${form.buyCurrency}）</div>
            <input className="inp" type="number" step="any" min="0" placeholder="手动输入汇率" value=${form.rate} onChange=${sf('rate')}/>
          </div>
          <div className="inp-group">
            <div className="inp-label">
              卖出金额（${form.sellCurrency}）
              ${sellBalance!==null&&html`<span className="tm"> · 可用余额 ${CUR_SYM[form.sellCurrency]||''}${fmtNum(sellBalance)}</span>`}
            </div>
            <input className="inp" type="number" step="any" min="0" placeholder="输入卖出金额"
              value=${form.sellAmount}
              style=${{borderColor:insufficientBal?'var(--err)':undefined}}
              onChange=${sf('sellAmount')}/>
            ${insufficientBal&&html`<div style=${{color:'var(--err)',fontSize:12,marginTop:4}}>余额不足，当前可用 ${CUR_SYM[form.sellCurrency]||''}${fmtNum(sellBalance)} ${form.sellCurrency}</div>`}
          </div>
        </div>

        <!-- 兑换结果预览 -->
        ${buyAmount!==null&&form.sellCurrency!==form.buyCurrency&&html`
          <div className="total-banner mb12" style=${{padding:'14px 20px'}}>
            <div className="total-label">兑换结果</div>
            <div className="fc g8" style=${{justifyContent:'center',flexWrap:'wrap'}}>
              <span className="ts tm">卖出 ${CUR_SYM[form.sellCurrency]||''}${fmtNum(Number(form.sellAmount))} ${form.sellCurrency}</span>
              <span className="ts tm">→</span>
              <span className="fh tg fn" style=${{fontSize:28}}>${CUR_SYM[form.buyCurrency]||''}${fmtNum(buyAmount)} ${form.buyCurrency}</span>
            </div>
            <div className="ts tm" style=${{textAlign:'center',marginTop:4}}>汇率 1 ${form.sellCurrency} = ${form.rate} ${form.buyCurrency}</div>
          </div>
        `}

        <div className="inp-group">
          <div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder="例：机场换汇、网银购汇..." value=${form.note} onChange=${sf('note')}/>
        </div>

        <button className="btn btn-gold btn-w" onClick=${submit} disabled=${!canSubmit}>
          💱 确认兑换
        </button>
        ${!form.accountId&&html`<div className="txs tm mt8" style=${{textAlign:'center'}}>请先选择兑换账户</div>`}
      </div>

      <!-- 兑换历史 -->
      <div className="fw6 mb12">兑换历史</div>
      ${(data.fxHistory||[]).length===0
        ?html`<div className="empty"><div className="empty-ico">💱</div><div>暂无记录</div></div>`
        :html`<div style=${{display:'flex',flexDirection:'column',gap:8}}>
          ${[...(data.fxHistory||[])].sort((a,b)=>(b.ts||0)-(a.ts||0)).map(fx=>{
            const acc=data.accounts.find(a=>String(a.id)===String(fx.accountId));
            // 兼容旧格式（from/to/amount/result）
            const isNew=fx.sellCurrency!=null;
            const sellCur=isNew?fx.sellCurrency:fx.from;
            const buyCur=isNew?fx.buyCurrency:fx.to;
            const sellAmt=isNew?fx.sellAmount:fx.amount;
            const buyAmt=isNew?fx.buyAmount:fx.result;
            return html`
              <div key=${fx.id} className="card" style=${{padding:'13px 18px'}}>
                <div className="fb" style=${{flexWrap:'wrap',gap:8}}>
                  <div style=${{flex:1,minWidth:0}}>
                    <div className="fc g8 fw">
                      <span style=${{color:'var(--err)',fontWeight:600}}>-${CUR_SYM[sellCur]||''}${fmtNum(sellAmt)} ${sellCur}</span>
                      <span className="tm">→</span>
                      <span className="fh tg fn" style=${{fontSize:18}}>+${CUR_SYM[buyCur]||''}${fmtNum(buyAmt)} ${buyCur}</span>
                    </div>
                    <div className="txs tm mt4">
                      汇率: 1 ${sellCur} = ${fx.rate} ${buyCur}
                      ${acc?html` · <span style=${{color:'var(--gold)'}}>${acc.bank}${acc.number?' 尾号'+acc.number:''}</span>`:''}
                      ${fx.date?html` · ${fx.date}`:''}
                      ${fx.note?html` · ${fx.note}`:''}
                    </div>
                  </div>
                  <button className="btn btn-danger btn-xs shrink0" onClick=${()=>deleteFx(fx.id)}>删除</button>
                </div>
              </div>
            `;
          })}
        </div>`}
    </div>
  `;
}
