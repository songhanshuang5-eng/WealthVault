// ══════════════════════════════════════════════════════════
// 投资相关组件：InvestmentModal, InlinePriceEdit,
//   InvestmentNotesModal, PriceHistoryChart,
//   TradeModal, DividendModal
// ══════════════════════════════════════════════════════════

function InvestmentModal({inv,accounts,onSave,onClose}){
  const initCat=inv?(inv.category||'variable'):'variable';
  const [f,sf]=useState({
    category:initCat,
    name:inv?inv.name:'',
    type:inv?inv.type:(initCat==='fixed'?INV_FIXED_TYPES[0]:INV_VARIABLE_TYPES[0]),
    ticker:inv?inv.ticker:'',
    accountId:inv?inv.accountId:(accounts[0]?accounts[0].id:''),
    currency:inv?inv.currency:'CNY',
    buyDate:inv?inv.buyDate:new Date().toISOString().slice(0,10),
    maturityDate:inv?inv.maturityDate||'':'',
    buyPrice:inv?inv.buyPrice:'',
    quantity:inv?inv.quantity:'1',
    annualRate:inv?inv.annualRate||'':'',
    currentPrice:inv&&inv.currentPrice!=null?inv.currentPrice:'',
    note:inv?inv.note:'',
    buyFeeType:inv?inv.buyFeeType||'abs':'abs',
    buyFeeInput:inv?(inv.buyFeeType==='pct'?(inv.buyFeePct||''):(inv.buyFee||'')):'',
  });
  const set=k=>e=>sf(x=>({...x,[k]:e.target.value}));
  const setCat=cat=>sf(x=>({...x,category:cat,type:cat==='fixed'?INV_FIXED_TYPES[0]:INV_VARIABLE_TYPES[0],quantity:cat==='fixed'?'1':x.quantity}));
  const typeList=f.category==='fixed'?INV_FIXED_TYPES:INV_VARIABLE_TYPES;
  const principal=f.buyPrice&&f.quantity?Number(f.buyPrice)*Number(f.quantity):null;
  const fixedCalc=(f.category==='fixed'&&f.buyDate&&f.maturityDate&&f.annualRate&&principal)
    ?calcFixedReturn({...f,buyPrice:Number(f.buyPrice),quantity:Number(f.quantity),annualRate:Number(f.annualRate)}):null;
  const mv=f.category==='variable'&&f.currentPrice&&f.quantity?Number(f.currentPrice)*Number(f.quantity):null;
  const pl=mv!==null&&principal!==null?mv-principal:null;
  const plPct=pl!==null&&principal?pl/principal*100:null;
  const buyFeeAbs=f.buyFeeInput===''?0
    :f.buyFeeType==='pct'?((principal||0)*parseFloat(f.buyFeeInput||0)/100)
    :parseFloat(f.buyFeeInput||0)||0;
  const submit=()=>{
    if(!f.name||!f.buyPrice)return;
    if(f.category==='fixed'&&(!f.maturityDate||!f.annualRate))return;
    if(f.category==='variable'&&!f.quantity)return;
    const cp=f.category==='variable'&&f.currentPrice!==''?Number(f.currentPrice):null;
    const ar=f.category==='fixed'&&f.annualRate?Number(f.annualRate):undefined;
    const md=f.category==='fixed'?f.maturityDate:undefined;
    const feeFields=buyFeeAbs>0?{buyFee:Math.round(buyFeeAbs*1e8)/1e8,buyFeeType:f.buyFeeType,buyFeePct:f.buyFeeType==='pct'?parseFloat(f.buyFeeInput):undefined}:{buyFee:0};
    onSave({...inv,...f,buyPrice:Number(f.buyPrice),quantity:Number(f.quantity||1),annualRate:ar,maturityDate:md,currentPrice:cp,...feeFields});
  };
  const canSave=f.name&&f.buyPrice&&(f.category==='fixed'?(f.maturityDate&&f.annualRate):(f.quantity&&f.buyDate));
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-title">${inv?'编辑持仓':'添加投资持仓'}</div>
        <div className="inp-group mb16">
          <div className="inp-label">产品类别</div>
          <div className="fc g8 mt4">
            <button className=${'btn btn-sm '+(f.category==='fixed'?'btn-gold':'btn-ghost')} onClick=${()=>setCat('fixed')}>📋 固定收益</button>
            <button className=${'btn btn-sm '+(f.category==='variable'?'btn-gold':'btn-ghost')} onClick=${()=>setCat('variable')}>📈 非固定收益</button>
          </div>
        </div>
        <div className="inp-group"><div className="inp-label">名称 *</div>
          <input className="inp" placeholder=${f.category==='fixed'?'例：国债2024、招行理财A':'例：腾讯控股、沪深300ETF'} value=${f.name} onChange=${set('name')}/>
        </div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">类型</div>
            <select className="inp" value=${f.type} onChange=${set('type')}>${typeList.map(t=>html`<option key=${t} value=${t}>${t}</option>`)}</select>
          </div>
          <div className="inp-group"><div className="inp-label">关联账户</div>
            <select className="inp" value=${f.accountId} onChange=${set('accountId')}>
              <option value="">不关联</option>
              ${accounts.map(a=>html`<option key=${a.id} value=${a.id}>${a.name}</option>`)}
            </select>
          </div>
        </div>
        <div className="modal-row">
          <div className="inp-group"><div className="inp-label">货币</div>
            <select className="inp" value=${f.currency} onChange=${set('currency')}>${CURRENCIES.map(c=>html`<option key=${c} value=${c}>${c}</option>`)}</select>
          </div>
          ${f.category==='variable'&&html`
            <div className="inp-group"><div className="inp-label">代码/编号</div>
              <input className="inp" placeholder="例：00700.HK" value=${f.ticker} onChange=${set('ticker')}/>
            </div>
          `}
        </div>
        ${f.category==='fixed'&&html`<${React.Fragment}>
          <div className="modal-row">
            <div className="inp-group"><div className="inp-label">购买日期 *</div><input className="inp" type="date" value=${f.buyDate} onChange=${set('buyDate')}/></div>
            <div className="inp-group"><div className="inp-label">到期日期 *</div><input className="inp" type="date" value=${f.maturityDate} onChange=${set('maturityDate')}/></div>
          </div>
          <div className="modal-row">
            <div className="inp-group"><div className="inp-label">认购金额 *</div>
              <input className="inp" type="number" step="any" min="0" placeholder="投入本金" value=${f.buyPrice} onChange=${set('buyPrice')}/>
            </div>
            <div className="inp-group"><div className="inp-label">年化收益率（%）*</div>
              <input className="inp" type="number" step="any" min="0" placeholder="例：3.50" value=${f.annualRate} onChange=${set('annualRate')}/>
            </div>
          </div>
          ${fixedCalc&&html`
            <div style=${{background:'var(--bg3)',padding:'12px 14px',borderRadius:8,marginBottom:12}}>
              <div className="fb mb4"><span className="ts tm">存期</span><span className="fn ts">${fixedCalc.termDays} 天</span></div>
              <div className="fb mb4">
                <span className="ts tm">${fixedCalc.isMatured?'状态':'距到期'}</span>
                <span className=${'fn ts '+(fixedCalc.isMatured?'pl-neg':fixedCalc.daysLeft<=3?'pl-neg':'tg')}>${fixedCalc.isMatured?'⚠ 已到期':'还有 '+fixedCalc.daysLeft+' 天'}</span>
              </div>
              <div className="fb mb4"><span className="ts tm">预计总收益</span><span className="fh fn pl-pos" style=${{fontSize:18}}>${CUR_SYM[f.currency]}${fmtNum(fixedCalc.totalReturn)}</span></div>
              <div className="fb"><span className="ts tm">到期总金额</span><span className="fh fn tg" style=${{fontSize:20}}>${CUR_SYM[f.currency]}${fmtNum(fixedCalc.principal+fixedCalc.totalReturn)}</span></div>
            </div>
          `}
        </${React.Fragment}>`}
        ${f.category==='variable'&&html`<${React.Fragment}>
          <div className="modal-row">
            <div className="inp-group">
              <div className="inp-label">起始/买入日期 *</div>
              <input className="inp" type="date" value=${f.buyDate} onChange=${set('buyDate')}/>
              <div className="txs tm mt4" style=${{paddingLeft:2}}>用于计算持有天数与年化收益率</div>
            </div>
            <div className="inp-group"><div className="inp-label">买入价格 *</div><input className="inp" type="number" step="any" min="0" placeholder="每份/每股" value=${f.buyPrice} onChange=${set('buyPrice')}/></div>
          </div>
          <div className="modal-row">
            <div className="inp-group"><div className="inp-label">数量 *</div><input className="inp" type="number" step="any" min="0" placeholder="份数/股数" value=${f.quantity} onChange=${set('quantity')}/></div>
            <div className="inp-group"><div className="inp-label">当前价格（可选）</div><input className="inp" type="number" step="any" min="0" placeholder="填入即显示盈亏及年化" value=${f.currentPrice} onChange=${set('currentPrice')}/></div>
          </div>
          ${(principal!==null||mv!==null)&&html`
            <div style=${{background:'var(--bg3)',padding:'10px 14px',borderRadius:8,marginBottom:12,fontSize:13}}>
              <div className="fb mb4"><span className="tm">买入总值</span><span className="fh fn tg" style=${{fontSize:16}}>${CUR_SYM[f.currency]}${fmtNum(principal)}</span></div>
              ${mv!==null&&html`<div className="fb mb4"><span className="tm">当前市值</span><span className="fh fn" style=${{fontSize:16}}>${CUR_SYM[f.currency]}${fmtNum(mv)}</span></div>`}
              ${pl!==null&&html`<div className="fb mb4"><span className="tm">未实现盈亏</span><span className=${'fh fn '+(pl>=0?'pl-pos':'pl-neg')} style=${{fontSize:16}}>${pl>=0?'+':''}${CUR_SYM[f.currency]}${fmtNum(pl)} (${plPct>=0?'+':''}${fmtNum(plPct,2)}%)</span></div>`}
              ${(()=>{
                const days=f.buyDate?Math.max(1,Math.floor((new Date()-new Date(f.buyDate))/86400000)):null;
                const ann=(plPct!=null&&days!=null&&days>=1&&(1+plPct/100)>0)?(Math.pow(1+plPct/100,365/days)-1)*100:null;
                if(ann===null)return null;
                return html`<div className="fb"><span className="tm">年化收益率</span><span className=${'fh fn '+(ann>=0?'pl-pos':'pl-neg')} style=${{fontSize:16}}>${ann>=0?'+':''}${fmtNum(ann,2)}% <span style=${{fontSize:11,fontWeight:400,opacity:.7}}>（持有 ${days} 天）</span></span></div>`;
              })()}
            </div>
          `}
        </${React.Fragment}>`}
        <!-- 建仓手续费 -->
        <div className="inp-group">
          <div className="inp-label fc g8">
            建仓手续费（可选）
            <div className="fc g4" style=${{marginLeft:'auto'}}>
              <button className=${'btn btn-xs '+(f.buyFeeType==='abs'?'btn-gold':'btn-ghost')}
                onClick=${()=>sf(x=>({...x,buyFeeType:'abs',buyFeeInput:''}))}>绝对值</button>
              <button className=${'btn btn-xs '+(f.buyFeeType==='pct'?'btn-gold':'btn-ghost')}
                onClick=${()=>sf(x=>({...x,buyFeeType:'pct',buyFeeInput:''}))}>百分比</button>
            </div>
          </div>
          <input className="inp" type="number" step="any" min="0"
            placeholder=${f.buyFeeType==='pct'?'例：0.03（即0.03%）':'例：50（元）'}
            value=${f.buyFeeInput} onChange=${set('buyFeeInput')}/>
          ${buyFeeAbs>0?html`
            <div className="txs tm mt4">
              手续费：${CUR_SYM[f.currency]||''}${fmtNum(buyFeeAbs,4)}
              （计入成本，实际总成本 ${CUR_SYM[f.currency]||''}${fmtNum((principal||0)+buyFeeAbs,2)}）
            </div>
          `:null}
        </div>
        <div className="inp-group"><div className="inp-label">备注（简短说明）</div><input className="inp" placeholder="备注" value=${f.note} onChange=${set('note')}/></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn btn-gold" onClick=${submit} disabled=${!canSave}>保存</button>
        </div>
      </div>
    </div>
  `;
}

function InlinePriceEdit({value,currency,onSave}){
  const [editing,setEditing]=useState(false);
  const [val,setVal]=useState('');
  const sym=CUR_SYM[currency]||'';
  const open=()=>{setVal(value!=null?String(value):'');setEditing(true);};
  const commit=()=>{
    const n=parseFloat(val);
    if(!isNaN(n)&&val.trim()!=='')onSave(n);
    setEditing(false);
  };
  const cancel=()=>setEditing(false);
  const onKey=e=>{if(e.key==='Enter'){e.preventDefault();commit();}else if(e.key==='Escape')cancel();};
  if(editing)return html`
    <div className="fc g4" style=${{alignItems:'center'}}>
      <input autoFocus className="inp" type="number" step="any" min="0"
        value=${val} onInput=${e=>setVal(e.target.value)}
        onKeyDown=${onKey} onBlur=${commit}
        style=${{width:72,padding:'2px 6px',fontSize:13,height:26}}/>
    </div>
  `;
  return html`
    <div onClick=${open} title="点击修改现价"
      style=${{cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4,borderBottom:'1px dotted rgba(255,255,255,.25)',paddingBottom:1}}>
      ${value!=null
        ?html`<span className="fn">${fmtNum(value,4)}</span>`
        :html`<span style=${{color:'var(--gold)',fontSize:12}}>点击输入</span>`}
    </div>
  `;
}

function InvestmentNotesModal({inv,onAdd,onDelete,onClose}){
  const [text,setText]=useState('');
  const notes=(inv.notes||[]).slice().sort((a,b)=>a.ts-b.ts);
  const fmtDT=ts=>{
    const d=new Date(ts);
    const ymd=d.toLocaleDateString('zh-CN');
    const hm=d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
    return ymd+' '+hm;
  };
  const save=()=>{
    if(!text.trim())return;
    onAdd(text);
    setText('');
  };
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:500}}>
        <div className="modal-title">📝 备注日志 · ${inv.name}</div>

        ${inv.note&&html`
          <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px',marginBottom:14}}>
            <div className="txs tm mb4">说明（编辑持仓可修改）</div>
            <div className="ts">${inv.note}</div>
          </div>
        `}

        <div className="inp-group">
          <div className="inp-label">添加记录</div>
          <textarea
            className="inp"
            rows="3"
            placeholder="记录操作原因、市场观点、调仓计划等..."
            value=${text}
            style=${{resize:'vertical',lineHeight:1.6}}
            onInput=${e=>setText(e.target.value)}
          ></textarea>
        </div>
        <div style=${{textAlign:'right',marginBottom:16}}>
          <button className="btn btn-gold btn-sm" onClick=${save} disabled=${!text.trim()}>保存记录</button>
        </div>

        ${notes.length>0?html`
          <div className="txs fw6 tm mb8">历史记录（共 ${notes.length} 条）</div>
          <div style=${{display:'flex',flexDirection:'column',gap:8,maxHeight:360,overflowY:'auto'}}>
            ${notes.map((n,i)=>html`
              <div key=${n.id} style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 12px'}}>
                <div className="fb mb6" style=${{alignItems:'center',gap:8}}>
                  <div className="fc g8">
                    <span style=${{
                      background:'rgba(201,160,67,.15)',color:'var(--gold)',
                      fontSize:11,fontWeight:700,padding:'1px 7px',borderRadius:4,flexShrink:0
                    }}>第 ${i+1} 条</span>
                    <span className="txs tm">${fmtDT(n.ts)}</span>
                  </div>
                  <button className="btn btn-danger btn-xs" onClick=${()=>onDelete(n.id)}>删除</button>
                </div>
                <div className="ts" style=${{whiteSpace:'pre-wrap',lineHeight:1.7}}>${n.content}</div>
              </div>
            `)}
          </div>
        `:html`
          <div className="ts tm" style=${{textAlign:'center',padding:'16px 0'}}>暂无记录，添加第一条吧</div>
        `}

        <div className="modal-footer" style=${{marginTop:16}}>
          <button className="btn btn-ghost" onClick=${onClose}>关闭</button>
        </div>
      </div>
    </div>
  `;
}

function PriceHistoryChart({inv}){
  const sym=CUR_SYM[inv.currency]||'';
  const priceHistory=[...(inv.priceHistory||[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(priceHistory.length<2){
    return html`<div className="txs tm" style=${{textAlign:'center',padding:'10px 0',opacity:.6}}>
      更新现价后将自动记录走势（已记录 ${priceHistory.length} / 至少需 2 次）
    </div>`;
  }
  const trades=[...(inv.trades||[])].sort((a,b)=>a.date.localeCompare(b.date));
  const getCostAt=date=>{
    let avgCost=Number(inv.buyPrice)||0,totalQty=Number(inv.quantity)||0,totalCost=avgCost*totalQty;
    trades.forEach(t=>{
      if(t.date>date)return;
      const qty=Math.abs(Number(t.quantity)||0),price=Number(t.price)||0;
      if(t.type==='buy'){totalCost+=qty*price;totalQty+=qty;avgCost=totalQty>0?totalCost/totalQty:avgCost;}
      else if(t.type==='sell'){totalQty=Math.max(0,totalQty-qty);totalCost=avgCost*totalQty;}
    });
    return avgCost;
  };
  const points=priceHistory.map(h=>({date:h.date,price:Number(h.price),cost:getCostAt(h.date)}));
  const W=460,H=150,PL=52,PR=16,PT=14,PB=28;
  const cW=W-PL-PR,cH=H-PT-PB;
  const allVals=[...points.map(p=>p.price),...points.map(p=>p.cost)];
  const minV=Math.min(...allVals)*0.985,maxV=Math.max(...allVals)*1.015;
  const n=points.length;
  const xS=i=>PL+(i/(n-1))*cW;
  const yS=v=>PT+cH-(v-minV)/(maxV-minV)*cH;
  const pathOf=vals=>vals.map((v,i)=>`${i===0?'M':'L'}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(' ');
  const yTicks=[minV,(minV+maxV)/2,maxV];
  const xIdxs=[0,...(n>2?[Math.floor((n-1)/2)]:[]),n-1].filter((v,i,a)=>a.indexOf(v)===i);
  return html`
    <div style=${{marginBottom:14}}>
      <div className="fc g8 mb4" style=${{alignItems:'center'}}>
        <span className="txs fw6 tm">价格走势</span>
        <div className="fc g10" style=${{marginLeft:'auto'}}>
          <span className="txs" style=${{color:'#4A90D9'}}>── 现价</span>
          <span className="txs" style=${{color:'rgba(201,160,67,.85)'}}>╌ 均价</span>
        </div>
      </div>
      <svg viewBox="0 0 ${W} ${H}" style=${{width:'100%',height:'auto',display:'block'}}>
        ${yTicks.map(v=>html`<line x1=${PL} y1=${yS(v).toFixed(1)} x2=${W-PR} y2=${yS(v).toFixed(1)} stroke="rgba(128,128,128,.12)" strokeWidth="1"/>`)}
        <path d=${pathOf(points.map(p=>p.cost))} fill="none" stroke="rgba(201,160,67,.75)" strokeWidth="1.5" strokeDasharray="5 3"/>
        <path d=${pathOf(points.map(p=>p.price))} fill="none" stroke="#4A90D9" strokeWidth="2"/>
        ${points.map((p,i)=>html`<circle cx=${xS(i).toFixed(1)} cy=${yS(p.price).toFixed(1)} r="3" fill="#4A90D9" stroke="var(--bg2)" strokeWidth="1.5"/>`)}
        ${yTicks.map(v=>html`<text x=${PL-5} y=${(yS(v)+4).toFixed(1)} textAnchor="end" fontSize="10" fill="var(--muted)">${sym}${fmtNum(v,0)}</text>`)}
        ${xIdxs.map(i=>html`<text x=${xS(i).toFixed(1)} y=${H-4} textAnchor="middle" fontSize="10" fill="var(--muted)">${points[i].date.slice(5)}</text>`)}
      </svg>
    </div>
  `;
}

function TradeModal({inv,onAddTrade,onDeleteTrade,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const [type,setType]=useState('buy');
  const [date,setDate]=useState(today);
  const [qty,setQty]=useState('');
  const [price,setPrice]=useState('');
  const [total,setTotal]=useState('');
  const [autoField,setAutoField]=useState(null);
  const [feeType,setFeeType]=useState('abs'); // 'abs' | 'pct'
  const [feeInput,setFeeInput]=useState('');
  const [note,setNote]=useState('');
  const [err,setErr]=useState('');

  const pos=calcEffectivePosition(inv);
  const sym=CUR_SYM[inv.currency]||'';
  const r8=v=>String(Math.round(v*1e8)/1e8);

  const clearAuto=()=>{
    if(autoField==='qty')setQty('');
    else if(autoField==='price')setPrice('');
    else if(autoField==='total')setTotal('');
    setAutoField(null);
  };

  const onQtyChange=val=>{
    setQty(val);setErr('');
    const q=parseFloat(val);
    if(isNaN(q)||q<=0){clearAuto();return;}
    const p=autoField==='price'?NaN:parseFloat(price);
    const t=autoField==='total'?NaN:parseFloat(total);
    if(!isNaN(p)&&p>0){setTotal(r8(q*p));setAutoField('total');}
    else if(!isNaN(t)&&t>0){setPrice(r8(t/q));setAutoField('price');}
    else setAutoField(null);
  };
  const onPriceChange=val=>{
    setPrice(val);setErr('');
    const p=parseFloat(val);
    if(isNaN(p)||p<=0){clearAuto();return;}
    const q=autoField==='qty'?NaN:parseFloat(qty);
    const t=autoField==='total'?NaN:parseFloat(total);
    if(!isNaN(q)&&q>0){setTotal(r8(q*p));setAutoField('total');}
    else if(!isNaN(t)&&t>0){setQty(r8(t/p));setAutoField('qty');}
    else setAutoField(null);
  };
  const onTotalChange=val=>{
    setTotal(val);setErr('');
    const t=parseFloat(val);
    if(isNaN(t)||t<=0){clearAuto();return;}
    const p=autoField==='price'?NaN:parseFloat(price);
    const q=autoField==='qty'?NaN:parseFloat(qty);
    if(!isNaN(p)&&p>0){setQty(r8(t/p));setAutoField('qty');}
    else if(!isNaN(q)&&q>0){setPrice(r8(t/q));setAutoField('price');}
    else setAutoField(null);
  };
  const resetFields=()=>{setQty('');setPrice('');setTotal('');setAutoField(null);setFeeInput('');setErr('');};

  const qtyN=parseFloat(qty)||0;
  const priceN=parseFloat(price)||0;
  const tradeAmount=qtyN*priceN;
  const feeAbs=feeInput===''?0
    :feeType==='pct'?(tradeAmount*parseFloat(feeInput||0)/100)
    :parseFloat(feeInput||0)||0;
  const preview=useMemo(()=>{
    if(!qtyN||!priceN)return null;
    if(type==='buy'){
      const newCost=pos.totalCost+qtyN*priceN+feeAbs;
      const newQty=pos.effectiveQty+qtyN;
      const newAvg=newQty>0?newCost/newQty:0;
      return{newQty,newAvg,newCost,tradePL:null};
    }else{
      if(qtyN>pos.effectiveQty)return{error:'减仓数量超过持仓'};
      const tradePL=qtyN*(priceN-pos.avgCost)-feeAbs;
      const newQty=pos.effectiveQty-qtyN;
      return{newQty,newAvg:pos.avgCost,newCost:pos.avgCost*newQty,tradePL};
    }
  },[type,qtyN,priceN,feeAbs,pos]);

  const canSave=qtyN>0&&priceN>0&&date&&!(preview&&preview.error);

  const submit=()=>{
    if(!canSave)return;
    if(type==='sell'&&qtyN>pos.effectiveQty){setErr('减仓数量超过当前持仓');return;}
    const feeFields=feeAbs>0?{fee:Math.round(feeAbs*1e8)/1e8,feeType,feePct:feeType==='pct'?parseFloat(feeInput):undefined}:{fee:0};
    onAddTrade({type,date,quantity:qtyN,price:priceN,...feeFields,note:note.trim()});
    resetFields();setNote('');
  };

  const trades=[...(inv.trades||[])].sort((a,b)=>b.date.localeCompare(a.date)||(b.ts||0)-(a.ts||0));
  const fmtDT2=ts=>{const d=new Date(ts);return d.toLocaleDateString('zh-CN')+' '+d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');};

  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:540}}>
        <div className="modal-title">📊 仓位操作 · ${inv.name}</div>

        <div style=${{background:'var(--bg3)',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
          <div><div className="txs tm mb2">初始建仓</div><div className="fn ts">${fmtNum(inv.quantity||0,2)} 股 @ ${sym}${fmtNum(inv.buyPrice,4)}</div></div>
          <div><div className="txs tm mb2">当前持仓量</div><div className="fn ts" style=${{color:'var(--gold)'}}>${fmtNum(pos.effectiveQty,4)} 股</div></div>
          <div><div className="txs tm mb2">加权均价</div><div className="fn ts">${sym}${fmtNum(pos.avgCost,4)}</div></div>
          <div><div className="txs tm mb2">持仓成本</div><div className="fn ts">${sym}${fmtNum(pos.totalCost)}</div></div>
          ${pos.realizedPL!==0&&html`<div><div className="txs tm mb2">已实现盈亏</div>
            <div className=${'fn ts '+(pos.realizedPL>=0?'pl-pos':'pl-neg')}>${pos.realizedPL>=0?'+':''}${sym}${fmtNum(pos.realizedPL)}</div></div>`}
          ${pos.totalFees>0&&html`<div><div className="txs tm mb2">累计手续费</div>
            <div className="fn ts pl-neg">-${sym}${fmtNum(pos.totalFees,4)}</div></div>`}
        </div>

        <div className="fw6 mb12">新增交易</div>
        <div className="fc g8 mb14">
          <button className=${'btn btn-sm '+(type==='buy'?'btn-gold':'btn-ghost')} onClick=${()=>{setType('buy');setErr('');}}>📈 补仓（买入）</button>
          <button className=${'btn btn-sm '+(type==='sell'?'btn-gold':'btn-ghost')} onClick=${()=>{setType('sell');setErr('');}}>📉 减仓（卖出）</button>
        </div>
        <div className="inp-group mb10">
          <div className="inp-label">交易日期 *</div>
          <input className="inp" type="date" value=${date} onChange=${e=>setDate(e.target.value)} style=${{maxWidth:180}}/>
        </div>

        <div className="txs tm mb8" style=${{color:'var(--gold)'}}>
          数量、价格、总金额 — 任意填写两个，第三个自动计算
        </div>
        <div style=${{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
          <div className="inp-group" style=${{margin:0}}>
            <div className="inp-label fc g4">
              ${type==='buy'?'买入':'卖出'}数量
              ${type==='sell'?html`<span className="txs tm">/ ${fmtNum(pos.effectiveQty,4)}</span>`:''}
              ${autoField==='qty'?html`<span style=${{marginLeft:'auto',color:'var(--gold)',fontSize:10,opacity:.8}}>自动</span>`:''}
            </div>
            <input className="inp" type="number" step="any" min="0" placeholder="股数/份数"
              value=${qty}
              style=${{background:autoField==='qty'?'rgba(201,160,67,.06)':undefined}}
              onChange=${e=>onQtyChange(e.target.value)}/>
          </div>
          <div className="inp-group" style=${{margin:0}}>
            <div className="inp-label fc g4">
              ${type==='buy'?'买入':'卖出'}价格
              ${autoField==='price'?html`<span style=${{marginLeft:'auto',color:'var(--gold)',fontSize:10,opacity:.8}}>自动</span>`:''}
            </div>
            <input className="inp" type="number" step="any" min="0" placeholder=${'每股/份 '+sym}
              value=${price}
              style=${{background:autoField==='price'?'rgba(201,160,67,.06)':undefined}}
              onChange=${e=>onPriceChange(e.target.value)}/>
          </div>
          <div className="inp-group" style=${{margin:0}}>
            <div className="inp-label fc g4">
              总金额
              ${autoField==='total'?html`<span style=${{marginLeft:'auto',color:'var(--gold)',fontSize:10,opacity:.8}}>自动</span>`:''}
            </div>
            <input className="inp" type="number" step="any" min="0" placeholder=${'合计 '+sym}
              value=${total}
              style=${{background:autoField==='total'?'rgba(201,160,67,.06)':undefined}}
              onChange=${e=>onTotalChange(e.target.value)}/>
          </div>
        </div>

        <!-- 手续费 -->
        <div className="inp-group">
          <div className="inp-label fc g8">
            手续费（可选）
            <div className="fc g4" style=${{marginLeft:'auto'}}>
              <button className=${'btn btn-xs '+(feeType==='abs'?'btn-gold':'btn-ghost')}
                onClick=${()=>{setFeeType('abs');setFeeInput('');}}>绝对值</button>
              <button className=${'btn btn-xs '+(feeType==='pct'?'btn-gold':'btn-ghost')}
                onClick=${()=>{setFeeType('pct');setFeeInput('');}}>百分比</button>
            </div>
          </div>
          <input className="inp" type="number" step="any" min="0"
            placeholder=${feeType==='pct'?'例：0.03（即0.03%）':'例：5（元）'}
            value=${feeInput} onChange=${e=>setFeeInput(e.target.value)}/>
          ${feeAbs>0?html`
            <div className="txs tm mt4">
              手续费：${sym}${fmtNum(feeAbs,4)}
              ${feeType==='pct'?html`（成交额 ${sym}${fmtNum(tradeAmount)} × ${feeInput}%）`:''}
            </div>
          `:null}
        </div>

        <div className="inp-group">
          <div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder=${type==='buy'?'例：加仓看好Q3业绩':'例：止盈部分仓位'}
            value=${note} onChange=${e=>setNote(e.target.value)}/>
        </div>

        ${preview&&!preview.error&&html`
          <div style=${{background:type==='buy'?'rgba(82,200,122,.07)':'rgba(240,128,128,.07)',
            border:'1px solid '+(type==='buy'?'rgba(82,200,122,.2)':'rgba(240,128,128,.2)'),
            borderRadius:8,padding:'10px 14px',marginBottom:10}}>
            <div className="txs fw6 mb6" style=${{color:type==='buy'?'var(--ok)':'var(--err)'}}>
              ${type==='buy'?'补仓后预览':'减仓后预览'}
            </div>
            <div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
              <div className="fb"><span className="txs tm">新持仓量</span><span className="fn ts">${fmtNum(preview.newQty,4)} 股</span></div>
              <div className="fb"><span className="txs tm">${type==='buy'?'新均价':'均价不变'}</span><span className="fn ts">${sym}${fmtNum(preview.newAvg,4)}</span></div>
              <div className="fb"><span className="txs tm">交易金额</span><span className="fn ts">${sym}${fmtNum(qtyN*priceN)}</span></div>
              ${feeAbs>0?html`<div className="fb"><span className="txs tm">手续费</span><span className="fn ts pl-neg">-${sym}${fmtNum(feeAbs,4)}</span></div>`:''}
              ${type==='sell'&&preview.tradePL!=null&&html`
                <div className="fb"><span className="txs tm">本次盈亏（含手续费）</span>
                  <span className=${'fn ts '+(preview.tradePL>=0?'pl-pos':'pl-neg')}>${preview.tradePL>=0?'+':''}${sym}${fmtNum(preview.tradePL)}</span></div>
              `}
              <div className="fb" style=${{gridColumn:'1/-1',marginTop:4,paddingTop:6,borderTop:'1px solid rgba(128,128,128,.15)'}}>
                <span className="txs tm">${type==='buy'?'账户余额扣除':'账户余额增加'}</span>
                <span className=${'fn ts '+(type==='buy'?'pl-neg':'pl-pos')}>${type==='buy'?'-':'+'}${sym}${fmtNum(qtyN*priceN+(type==='buy'?feeAbs:-feeAbs))}</span>
              </div>
            </div>
          </div>
        `}
        ${(err||(preview&&preview.error))&&html`<div style=${{color:'var(--err)',fontSize:13,marginBottom:8}}>⚠ ${err||preview.error}</div>`}
        <button className="btn btn-gold btn-w mb16" onClick=${submit} disabled=${!canSave}>
          ${type==='buy'?'✅ 确认补仓':'✅ 确认减仓'}
        </button>

        <div style=${{borderTop:'1px solid var(--border)',paddingTop:12,marginBottom:4}}>
          <${PriceHistoryChart} inv=${inv}/>
        </div>

        <div className="txs fw6 tm mb8">交易历史（含初始建仓）</div>
        <div style=${{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
          <div style=${{background:'var(--bg3)',borderRadius:8,padding:'9px 12px',opacity:.8}}>
            <div className="fb" style=${{alignItems:'center'}}>
              <div>
                <div className="fc g6 mb2">
                  <span style=${{background:'rgba(201,160,67,.15)',color:'var(--gold)',fontSize:10,padding:'1px 6px',borderRadius:3}}>初始建仓</span>
                  <span className="txs tm">${fmtDate(inv.buyDate)}</span>
                </div>
                <div className="ts">买入 ${fmtNum(inv.quantity||0,4)} 股 @ ${sym}${fmtNum(inv.buyPrice,4)}
                  <span className="txs tm" style=${{marginLeft:8}}>成本 ${sym}${fmtNum((inv.quantity||0)*inv.buyPrice)}</span>
                </div>
                ${inv.note?html`<div className="txs tm mt2">${inv.note}</div>`:null}
              </div>
            </div>
          </div>
          ${trades.length===0&&html`<div className="txs tm" style=${{textAlign:'center',padding:'10px 0'}}>暂无补仓/减仓记录</div>`}
          ${trades.map(t=>{
            const tQty=Number(t.quantity)||0;
            const tPrice=Number(t.price)||0;
            const isBuy=t.type==='buy';
            return html`
              <div key=${t.id} style=${{background:'var(--bg3)',borderRadius:8,padding:'9px 12px'}}>
                <div className="fb" style=${{alignItems:'center',gap:8}}>
                  <div style=${{flex:1,minWidth:0}}>
                    <div className="fc g6 mb2">
                      <span style=${{
                        background:isBuy?'rgba(82,200,122,.15)':'rgba(240,128,128,.15)',
                        color:isBuy?'var(--ok)':'var(--err)',
                        fontSize:10,padding:'1px 6px',borderRadius:3
                      }}>${isBuy?'补仓':'减仓'}</span>
                      <span className="txs tm">${t.date}</span>
                      ${t.note?html`<span className="txs tm">· ${t.note}</span>`:null}
                    </div>
                    <div className="ts">${isBuy?'买入':'卖出'} ${fmtNum(tQty,4)} 股 @ ${sym}${fmtNum(tPrice,4)}
                      <span className="txs tm" style=${{marginLeft:8}}>合计 ${sym}${fmtNum(tQty*tPrice)}</span>
                      ${t.fee>0?html`<span className="txs pl-neg" style=${{marginLeft:8}}>手续费 ${sym}${fmtNum(t.fee,4)}</span>`:''}
                    </div>
                    ${t.ts?html`<div className="txs tm mt1">记录于 ${fmtDT2(t.ts)}</div>`:null}
                  </div>
                  <button className="btn btn-danger btn-xs shrink0" onClick=${()=>onDeleteTrade(t.id)}>删除</button>
                </div>
              </div>
            `;
          })}
        </div>

        <div className="modal-footer" style=${{marginTop:14}}>
          <button className="btn btn-ghost" onClick=${onClose}>关闭</button>
        </div>
      </div>
    </div>
  `;
}

function DividendModal({inv,onAddDividend,onDeleteDividend,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const [date,setDate]=useState(today);
  const [amount,setAmount]=useState('');
  const [note,setNote]=useState('');
  const [err,setErr]=useState('');
  const sym=CUR_SYM[inv.currency]||'';
  const dividends=[...(inv.dividends||[])].sort((a,b)=>b.date.localeCompare(a.date));
  const totalDiv=dividends.reduce((s,d)=>s+Number(d.amount),0);
  const pos=calcEffectivePosition(inv);
  const yieldPct=pos.totalCost>0?totalDiv/pos.totalCost*100:0;

  const submit=()=>{
    const amt=Number(amount);
    if(!amt||amt<=0){setErr('请输入有效金额');return;}
    if(!date){setErr('请选择日期');return;}
    onAddDividend({date,amount:amt,note:note.trim()});
    setAmount('');setNote('');setErr('');
  };

  return html`
    <div className="modal-overlay" onClick=${e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal-box" style=${{maxWidth:520}}>
        <div className="modal-header">
          <span>💰 分红记录 · ${inv.name}</span>
          <button className="modal-close" onClick=${onClose}>✕</button>
        </div>

        <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px',marginBottom:14,display:'flex',gap:20}}>
          <div><div className="txs tm">累计分红</div>
            <div className="fn" style=${{fontSize:20,color:'var(--ok)'}}>${sym}${fmtNum(totalDiv)}</div></div>
          <div><div className="txs tm">分红收益率</div>
            <div className=${'fn '+(yieldPct>=0?'pl-pos':'pl-neg')} style=${{fontSize:20}}>${yieldPct>=0?'+':''}${fmtNum(yieldPct,2)}%</div></div>
          <div><div className="txs tm">记录笔数</div>
            <div className="fn ts" style=${{fontSize:20}}>${dividends.length}</div></div>
        </div>

        <div style=${{background:'rgba(82,200,122,.06)',border:'1px solid rgba(82,200,122,.2)',borderRadius:8,padding:'12px 14px',marginBottom:14}}>
          <div className="txs fw6 mb8" style=${{color:'var(--ok)'}}>新增分红</div>
          <div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div>
              <div className="txs tm mb4">到账日期</div>
              <input className="inp" type="date" value=${date} onInput=${e=>setDate(e.target.value)}/>
            </div>
            <div>
              <div className="txs tm mb4">金额（${inv.currency}）</div>
              <input className="inp" type="number" min="0" step="0.01" placeholder="0.00"
                value=${amount} onInput=${e=>setAmount(e.target.value)}/>
            </div>
          </div>
          <div className="txs tm mb4">备注</div>
          <input className="inp mb8" type="text" placeholder="如：第一季度派息" value=${note} onInput=${e=>setNote(e.target.value)}/>
          ${err&&html`<div style=${{color:'var(--err)',fontSize:13,marginBottom:6}}>⚠ ${err}</div>`}
          <button className="btn btn-gold btn-w" onClick=${submit}>✅ 确认添加分红</button>
        </div>

        <div className="txs fw6 tm mb8">历史分红记录</div>
        ${dividends.length===0&&html`<div className="ts txs" style=${{textAlign:'center',padding:'16px 0',opacity:.5}}>暂无分红记录</div>`}
        <div style=${{maxHeight:260,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
          ${dividends.map(d=>html`
            <div key=${d.id} style=${{background:'var(--bg3)',borderRadius:8,padding:'9px 12px',display:'flex',alignItems:'center',gap:10}}>
              <div style=${{flex:1}}>
                <div className="fb" style=${{alignItems:'center',gap:8}}>
                  <span className="txs tm">${d.date}</span>
                  <span className="fn ts pl-pos" style=${{fontSize:15}}>${sym}${fmtNum(Number(d.amount))}</span>
                  ${d.note&&html`<span className="txs" style=${{color:'var(--muted)',marginLeft:'auto'}}>${d.note}</span>`}
                </div>
              </div>
              <button onClick=${()=>onDeleteDividend(d.id)}
                style=${{background:'none',border:'none',cursor:'pointer',color:'var(--err)',fontSize:14,padding:'2px 6px',opacity:.7}}>🗑</button>
            </div>
          `)}
        </div>

        <div className="modal-footer" style=${{marginTop:14}}>
          <button className="btn btn-ghost" onClick=${onClose}>关闭</button>
        </div>
      </div>
    </div>
  `;
}
