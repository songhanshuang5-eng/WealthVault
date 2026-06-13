function FxPage({data,addFx,deleteFx}){
  const today=new Date().toISOString().slice(0,10);
  const [form,setForm]=useState({
    accountId:'',
    sellCurrency:'USD',
    buyCurrency:'CNY',
    sellAmount:'',
    buyAmount:'',
    date:today,
    note:'',
    sourceHoldingId:'',  // 来源持仓 id
  });
  const sf=v=>e=>setForm(f=>({...f,[v]:e.target.value}));

  // 汇率 = 买入金额 / 卖出金额（自动计算）
  const calcRate=(form.sellAmount&&form.buyAmount&&Number(form.sellAmount)>0)
    ?Math.round(Number(form.buyAmount)/Number(form.sellAmount)*1e8)/1e8
    :null;

  // 选中账户
  const selectedAcc=data.accounts.find(a=>String(a.id)===String(form.accountId));

  // 该账户下卖出货币的所有正余额持仓
  const sellHoldings=selectedAcc
    ?(selectedAcc.holdings||[]).filter(h=>h.currency===form.sellCurrency&&Number(h.amount||0)>0)
    :[];

  // 有效来源持仓：只有一笔时自动选中，否则依赖用户选择
  const effectiveSourceId=sellHoldings.length===1
    ?sellHoldings[0].id
    :form.sourceHoldingId;

  const sourceHolding=effectiveSourceId
    ?sellHoldings.find(h=>h.id===effectiveSourceId)
    :null;

  // 余额：有来源持仓则显示该持仓余额，否则显示合计
  const sellBalance=sourceHolding
    ?Number(sourceHolding.amount||0)
    :selectedAcc&&sellHoldings.length>0
      ?sellHoldings.reduce((s,h)=>s+Number(h.amount||0),0)
      :null;

  const insufficientBal=sellBalance!==null&&Number(form.sellAmount)>sellBalance;

  // 多持仓时必须选择来源
  const needsSourcePick=sellHoldings.length>1&&!form.sourceHoldingId;

  const canSubmit=form.accountId&&form.sellAmount&&Number(form.sellAmount)>0
    &&form.buyAmount&&Number(form.buyAmount)>0
    &&form.sellCurrency!==form.buyCurrency&&!insufficientBal&&form.date
    &&!needsSourcePick;

  const submit=()=>{
    if(!canSubmit)return;
    addFx({
      accountId:form.accountId,
      sellCurrency:form.sellCurrency,
      sellAmount:Number(form.sellAmount),
      buyCurrency:form.buyCurrency,
      buyAmount:Number(form.buyAmount),
      rate:calcRate,
      date:form.date,
      note:form.note.trim(),
      sourceHoldingId:effectiveSourceId||null,
    });
    setForm(f=>({...f,sellAmount:'',buyAmount:'',note:'',date:today,sourceHoldingId:''}));
  };

  // 持仓标签（用于下拉选项）
  const holdingLabel=h=>{
    const sym=CUR_SYM[h.currency]||'';
    const amt=fmtNum(Number(h.amount||0));
    const tag=h.summary?h.summary.slice(0,20):(h.entryDate?h.entryDate:'活期');
    return `${sym}${amt} · ${tag}`;
  };

  return html`
    <div>
      <div className="mb20">
        <div className="pg-title">货币兑换</div>
        <div className="pg-sub">记录货币买卖，自动同步账户余额</div>
      </div>

      <div className="card mb20">
        <div className="fw6 mb16">新建货币兑换</div>

        <div className="inp-group">
          <div className="inp-label">兑换银行 / 账户 *</div>
          <select className="inp" value=${form.accountId}
            onChange=${e=>setForm(f=>({...f,accountId:e.target.value,sourceHoldingId:''}))}>
            <option value="">— 请选择账户 —</option>
            ${data.accounts.map(a=>html`<option key=${a.id} value=${a.id}>${a.bank}${a.number?' · 尾号'+a.number:''} — ${a.name}</option>`)}
          </select>
        </div>

        <div className="inp-group">
          <div className="inp-label">兑换日期 *</div>
          <input className="inp" type="date" value=${form.date} onChange=${sf('date')}/>
        </div>

        <div className="modal-row">
          <div className="inp-group">
            <div className="inp-label">卖出货币</div>
            <select className="inp" value=${form.sellCurrency}
              onChange=${e=>setForm(f=>({...f,sellCurrency:e.target.value,sourceHoldingId:''}))}>
              ${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}
            </select>
          </div>
          <div className="inp-group">
            <div className="inp-label">买入货币</div>
            <select className="inp" value=${form.buyCurrency} onChange=${e=>setForm(f=>({...f,buyCurrency:e.target.value}))}>
              ${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}
            </select>
          </div>
        </div>
        ${form.sellCurrency===form.buyCurrency&&html`
          <div className="alert alert-warn mb12">⚠ 卖出与买入货币不能相同</div>
        `}

        ${/* 来源持仓选择器 */form.accountId&&form.sellCurrency&&html`
          <div className="inp-group">
            <div className="inp-label">来源持仓（卖出 ${form.sellCurrency} 从哪笔持仓扣减）</div>
            ${sellHoldings.length===0&&html`
              <div className="alert alert-warn" style=${{padding:'9px 12px',fontSize:13}}>
                ⚠ 该账户没有 ${form.sellCurrency} 余额
              </div>
            `}
            ${sellHoldings.length===1&&html`
              <div style=${{
                background:'var(--bg3)',borderRadius:8,padding:'10px 14px',
                fontSize:13,color:'var(--gold)',fontWeight:500
              }}>
                ${holdingLabel(sellHoldings[0])}
                <span className="tm" style=${{fontWeight:400}}> （唯一持仓，已自动选中）</span>
              </div>
            `}
            ${sellHoldings.length>1&&html`
              <select className="inp" value=${form.sourceHoldingId}
                onChange=${sf('sourceHoldingId')}>
                <option value="">— 请选择来源持仓 —</option>
                ${sellHoldings.map(h=>html`
                  <option key=${h.id} value=${h.id}>${holdingLabel(h)}</option>
                `)}
              </select>
              ${needsSourcePick&&html`
                <div style=${{color:'var(--err)',fontSize:12,marginTop:4}}>请选择卖出来源持仓</div>
              `}
            `}
          </div>
        `}

        <div className="modal-row">
          <div className="inp-group">
            <div className="inp-label">
              卖出金额（${form.sellCurrency}）
              ${sellBalance!==null&&html`<span className="tm"> · ${sourceHolding?'持仓':'合计'} ${CUR_SYM[form.sellCurrency]||''}${fmtNum(sellBalance)}</span>`}
            </div>
            <input className="inp" type="number" step="any" min="0" placeholder="输入卖出金额"
              value=${form.sellAmount}
              style=${{borderColor:insufficientBal?'var(--err)':undefined}}
              onChange=${sf('sellAmount')}/>
            ${insufficientBal&&html`<div style=${{color:'var(--err)',fontSize:12,marginTop:4}}>余额不足，可用 ${CUR_SYM[form.sellCurrency]||''}${fmtNum(sellBalance)}</div>`}
          </div>
          <div className="inp-group">
            <div className="inp-label">买入金额（${form.buyCurrency}）</div>
            <input className="inp" type="number" step="any" min="0" placeholder="输入买入金额"
              value=${form.buyAmount}
              onChange=${sf('buyAmount')}/>
          </div>
        </div>

        ${calcRate!==null&&form.sellCurrency!==form.buyCurrency&&html`
          <div className="total-banner mb12" style=${{padding:'14px 20px'}}>
            <div className="total-label">兑换结果</div>
            <div className="fc g8" style=${{justifyContent:'center',flexWrap:'wrap'}}>
              <span className="ts tm">卖出 ${CUR_SYM[form.sellCurrency]||''}${fmtNum(Number(form.sellAmount))} ${form.sellCurrency}</span>
              <span className="ts tm">→</span>
              <span className="fh tg fn" style=${{fontSize:28}}>${CUR_SYM[form.buyCurrency]||''}${fmtNum(Number(form.buyAmount))} ${form.buyCurrency}</span>
            </div>
            <div className="ts tm" style=${{textAlign:'center',marginTop:4}}>汇率 1 ${form.sellCurrency} = ${calcRate} ${form.buyCurrency}</div>
          </div>
        `}

        <div className="inp-group">
          <div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder="例：机场换汇、网银购汇..." value=${form.note} onChange=${sf('note')}/>
        </div>

        <button className="btn btn-gold btn-w" onClick=${submit} disabled=${!canSubmit}>
          💱 确认兑换
        </button>
        ${!form.accountId&&html`<div className="txs tm mt8" style=${{textAlign:'center'}}>请先选择账户</div>`}
      </div>

      <div className="fw6 mb12">兑换历史</div>
      ${(data.fxHistory||[]).length===0
        ?html`<div className="empty"><div className="empty-ico">💱</div><div>暂无记录</div></div>`
        :html`<div style=${{display:'flex',flexDirection:'column',gap:8}}>
          ${[...(data.fxHistory||[])].sort((a,b)=>(b.ts||0)-(a.ts||0)).map(fx=>{
            const acc=data.accounts.find(a=>String(a.id)===String(fx.accountId));
            const isNew=fx.sellCurrency!=null;
            const sellCur=isNew?fx.sellCurrency:fx.from;
            const buyCur=isNew?fx.buyCurrency:fx.to;
            const sellAmt=isNew?fx.sellAmount:fx.amount;
            const buyAmt=isNew?fx.buyAmount:fx.result;
            const rate=fx.rate;
            // 来源持仓标签
            const srcHolding=fx.sourceHoldingId&&acc
              ?(acc.holdings||[]).find(h=>h.id===fx.sourceHoldingId)
              :null;
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
                      汇率: 1 ${sellCur} = ${rate} ${buyCur}
                      ${acc?html` · <span style=${{color:'var(--gold)'}}>${acc.bank}${acc.number?' 尾号'+acc.number:''}</span>`:''}
                      ${fx.date?html` · ${fx.date}`:''}
                      ${srcHolding?html` · 来源: ${srcHolding.summary||srcHolding.entryDate||'持仓'}`:fx.sourceHoldingId?html` · 来源: 已删除持仓`:''}
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
