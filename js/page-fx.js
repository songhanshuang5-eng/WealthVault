function FxPage({data,addFx,deleteFx}){
  const [form,setForm]=useState({from:'USD',to:'CNY',rate:'',amount:'',note:''});
  const sf=v=>e=>setForm(f=>({...f,[v]:e.target.value}));
  const result=form.rate&&form.amount?Number(form.amount)*Number(form.rate):null;
  const submit=()=>{
    if(!form.rate||!form.amount)return;
    addFx({...form,rate:Number(form.rate),amount:Number(form.amount),result});
    setForm(f=>({...f,rate:'',amount:'',note:''}));
  };
  return html`
    <div>
      <div className="mb20"><div className="pg-title">货币换算</div><div className="pg-sub">记录货币转换历史，保留某时点汇率凭证</div></div>
      <div className="card mb20">
        <div className="fw6 mb16">新建换算记录</div>
        <div className="fx-grid">
          <div className="inp-group"><div className="inp-label">从货币</div>
            <select className="inp" value=${form.from} onChange=${sf('from')}>${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}</select>
          </div>
          <div className="inp-group"><div className="inp-label">到货币</div>
            <select className="inp" value=${form.to} onChange=${sf('to')}>${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c} — ${CUR_NAMES[c]}</option>`)}</select>
          </div>
          <div className="inp-group"><div className="inp-label">汇率（1 ${form.from} = ? ${form.to}）</div>
            <input className="inp" type="number" step="any" placeholder="输入汇率" value=${form.rate} onChange=${sf('rate')}/>
          </div>
          <div className="inp-group"><div className="inp-label">转换金额（${form.from}）</div>
            <input className="inp" type="number" step="any" placeholder="输入金额" value=${form.amount} onChange=${sf('amount')}/>
          </div>
          <div className="inp-group" style=${{gridColumn:'1/-1'}}><div className="inp-label">备注（可选）</div>
            <input className="inp" placeholder="例：汇款、购汇..." value=${form.note} onChange=${sf('note')}/>
          </div>
        </div>
        ${result!==null&&html`
          <div className="total-banner mb12" style=${{padding:'14px 20px'}}>
            <div className="total-label">换算结果</div>
            <div className="fc g8" style=${{justifyContent:'center',flexWrap:'wrap'}}>
              <span className="ts tm">${fmtNum(form.amount)} ${form.from} =</span>
              <span className="fh tg fn" style=${{fontSize:30}}>${CUR_SYM[form.to]}${fmtNum(result)} ${form.to}</span>
            </div>
          </div>
        `}
        <button className="btn btn-gold btn-w" onClick=${submit}>💾 保存换算记录</button>
      </div>
      <div className="fw6 mb12">换算历史</div>
      ${data.fxHistory.length===0
        ?html`<div className="empty"><div className="empty-ico">💱</div><div>暂无记录</div></div>`
        :html`<div style=${{display:'flex',flexDirection:'column',gap:8}}>
            ${data.fxHistory.map(fx=>html`
              <div key=${fx.id} className="card" style=${{padding:'13px 18px'}}>
                <div className="fb" style=${{flexWrap:'wrap',gap:8}}>
                  <div>
                    <div className="fc g8 fw">
                      <span className="fw6">${fmtNum(fx.amount)} ${fx.from}</span>
                      <span className="tm">→</span>
                      <span className="fh tg fn" style=${{fontSize:18}}>${CUR_SYM[fx.to]}${fmtNum(fx.result)} ${fx.to}</span>
                    </div>
                    <div className="txs tm mt4">汇率: 1 ${fx.from} = ${fx.rate} ${fx.to}${fx.note?' · '+fx.note:''} · ${new Date(fx.ts).toLocaleString('zh-CN')}</div>
                  </div>
                  <button className="btn btn-danger btn-xs shrink0" onClick=${()=>deleteFx(fx.id)}>删除</button>
                </div>
              </div>
            `)}
          </div>`}
    </div>
  `;
}
