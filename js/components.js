// ══════════════════════════════════════════════════════════
// 存款到期结算 Modal
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

  // 新存款预览
  const newDi=(reinvestN>0&&newRate&&newStart&&newEnd)
    ?calcDepositInterest({depositType:'fixed',amount:reinvestN,interestRate:parseFloat(newRate),startDate:newStart,maturityDate:newEnd})
    :null;

  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:480}}>
        <div className="modal-title">🏦 到期结算 · ${holding.currency}</div>

        <!-- 结算摘要 -->
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

        <!-- 续存设置 -->
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

// ══════════════════════════════════════════════════════════
// 定期收入计划 Modal
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

// ══════════════════════════════════════════════════════════
// 支出 Modal
// ══════════════════════════════════════════════════════════
function ExpenseModal({accounts,defaultAccountId,onSave,onClose}){
  const today=new Date().toISOString().slice(0,10);
  // 初始货币跟随 defaultAccountId 账户的第一种货币，避免硬编码 CNY
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

  // 汇总该账户该币种的所有 holdings（避免 .find 只取第一条）
  const selectedAcc=accounts.find(a=>String(a.id)===String(f.accountId));
  const avail=selectedAcc
    ?(selectedAcc.holdings||[])
      .filter(h=>h.currency===f.currency)
      .reduce((s,h)=>s+Number(h.amount||0),0)
    :null;
  const insufficient=avail!==null&&Number(f.amount)>Number(avail);
  const canSave=f.amount&&Number(f.amount)>0&&f.date&&f.currency&&!insufficient;

  // 切换账户时，自动切到该账户第一种货币
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

// ══════════════════════════════════════════════════════════
// 新增图表组件
// ══════════════════════════════════════════════════════════

// ── 环形图 ────────────────────────────────────────────────
function DonutChart({segments,size,centerLabel,centerSub}){
  size=size||170;
  if(!segments||segments.length===0)return null;
  const total=segments.reduce((s,d)=>s+Math.abs(d.value),0);
  if(!total)return null;
  const cx=size/2,cy=size/2,or=size*0.43,ir=size*0.27;
  let start=-Math.PI/2;
  const paths=[];
  segments.forEach(seg=>{
    const frac=Math.abs(seg.value)/total;
    if(frac<0.005)return;
    const angle=frac*2*Math.PI;
    const end=start+angle;
    const large=angle>Math.PI?1:0;
    const x1=cx+or*Math.cos(start),y1=cy+or*Math.sin(start);
    const x2=cx+or*Math.cos(end),y2=cy+or*Math.sin(end);
    const ix1=cx+ir*Math.cos(end),iy1=cy+ir*Math.sin(end);
    const ix2=cx+ir*Math.cos(start),iy2=cy+ir*Math.sin(start);
    const d=`M${x1.toFixed(1)} ${y1.toFixed(1)} A${or} ${or} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L${ix1.toFixed(1)} ${iy1.toFixed(1)} A${ir} ${ir} 0 ${large} 0 ${ix2.toFixed(1)} ${iy2.toFixed(1)}Z`;
    paths.push({...seg,d,frac});
    start=end;
  });
  return html`
    <svg width=${size} height=${size} viewBox=${'0 0 '+size+' '+size}>
      ${paths.map((p,i)=>html`<path key=${i} d=${p.d} fill=${p.color} stroke="var(--bg2)" strokeWidth="1.5" opacity="0.92"/>`)}
      ${centerLabel&&html`<text x=${cx} y=${cy+(centerSub?-5:3)} textAnchor="middle" dominantBaseline="middle" fill="var(--gold)" fontSize="13" fontFamily="var(--fh)" fontWeight="600">${centerLabel}</text>`}
      ${centerSub&&html`<text x=${cx} y=${cy+12} textAnchor="middle" fill="var(--muted)" fontSize="9">${centerSub}</text>`}
    </svg>
  `;
}

// ── 净资产柱状图 ──────────────────────────────────────────
function BarChart({snapshots}){
  if(!snapshots||snapshots.length<2)return null;
  const sorted=[...snapshots].sort((a,b)=>a.ts-b.ts).slice(-12);
  const vals=sorted.map(s=>s.amount);
  const minV=Math.min(0,...vals),maxV=Math.max(...vals);
  const range=maxV-minV||1;
  const W=360,H=90,n=sorted.length;
  const bw=Math.max(10,Math.floor((W-(n+1)*4)/n));
  const zeroY=H*(1-(0-minV)/range);
  return html`
    <svg width="100%" viewBox=${'0 0 '+W+' '+(H+22)} preserveAspectRatio="none" style=${{display:'block'}}>
      <line x1="0" y1=${zeroY.toFixed(1)} x2=${W} y2=${zeroY.toFixed(1)} stroke="var(--border2)" strokeWidth="1"/>
      ${sorted.map((s,i)=>{
        const isNeg=s.amount<0;
        const h=Math.max(2,(Math.abs(s.amount)/range)*(H*0.9));
        const x=i*(bw+4)+4;
        const y=isNeg?zeroY:H*(1-(s.amount-minV)/range);
        return html`
          <g key=${s.id}>
            <rect x=${x} y=${y.toFixed(1)} width=${bw} height=${h.toFixed(1)} fill=${isNeg?'var(--err)':'var(--gold)'} rx="2" opacity="0.75"/>
            <text x=${(x+bw/2).toFixed(1)} y=${H+15} textAnchor="middle" fill="var(--muted)" fontSize="8">${s.date.slice(5)}</text>
          </g>
        `;
      })}
    </svg>
  `;
}

// ══════════════════════════════════════════════════════════
// 修改用户名 Modal
// ══════════════════════════════════════════════════════════
function ChangeUsernameModal({onClose}){
  const [newUser,setNewUser]=useState('');
  const [pwd,setPwd]=useState('');
  const [err,setErr]=useState('');
  const [ok,setOk]=useState(false);
  const submit=async()=>{
    setErr('');
    if(!newUser.trim()){setErr('请输入新用户名');return;}
    if(newUser.trim().length<2){setErr('用户名至少需要 2 个字符');return;}
    if((await hashPwd(pwd))!==getHash()){setErr('密码错误');return;}
    saveUsername(newUser.trim());
    setOk(true);setTimeout(onClose,1500);
  };
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-title">修改用户名</div>
        <div style=${{fontSize:12,color:'var(--muted)',marginBottom:16}}>
          当前用户名：<span style=${{color:'var(--gold)',fontWeight:600}}>${getUsername()}</span>
        </div>
        ${ok
          ?html`<div className="alert alert-ok">✅ 用户名修改成功</div>`
          :html`<${React.Fragment}>
            <div className="inp-group"><div className="inp-label">新用户名（至少 2 个字符）</div>
              <input className="inp" type="text" value=${newUser} onChange=${e=>{setNewUser(e.target.value);setErr('');}} autoFocus/>
            </div>
            <div className="inp-group"><div className="inp-label">输入密码确认</div>
              <input className="inp" type="password" value=${pwd} onChange=${e=>{setPwd(e.target.value);setErr('');}} onKeyDown=${e=>e.key==='Enter'&&submit()}/>
            </div>
            ${err&&html`<div style=${{color:'var(--err)',fontSize:13,marginBottom:8}}>${err}</div>`}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick=${onClose}>取消</button>
              <button className="btn btn-gold" onClick=${submit} disabled=${!newUser.trim()||!pwd}>保存</button>
            </div>
          </${React.Fragment}>`}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
// 修改密码 Modal
// ══════════════════════════════════════════════════════════
function ChangePasswordModal({onClose}){
  const [cur,setCur]=useState('');
  const [newP,setNewP]=useState('');
  const [conf,setConf]=useState('');
  const [err,setErr]=useState('');
  const [ok,setOk]=useState(false);
  const submit=async()=>{
    setErr('');
    if((await hashPwd(cur))!==getHash()){setErr('当前密码错误');return;}
    if(newP.length<4){setErr('新密码至少需要 4 位');return;}
    if(newP!==conf){setErr('两次输入不一致');return;}
    saveHash(await hashPwd(newP));
    setOk(true);setTimeout(onClose,1500);
  };
  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-title">修改密码</div>
        ${ok
          ?html`<div className="alert alert-ok">✅ 密码修改成功</div>`
          :html`<${React.Fragment}>
            <div className="inp-group"><div className="inp-label">当前密码</div>
              <input className="inp" type="password" value=${cur} onChange=${e=>{setCur(e.target.value);setErr('');}} autoFocus/>
            </div>
            <div className="inp-group"><div className="inp-label">新密码（至少 4 位）</div>
              <input className="inp" type="password" value=${newP} onChange=${e=>{setNewP(e.target.value);setErr('');}}/>
            </div>
            <div className="inp-group"><div className="inp-label">确认新密码</div>
              <input className="inp" type="password" value=${conf} onChange=${e=>{setConf(e.target.value);setErr('');}} onKeyDown=${e=>e.key==='Enter'&&submit()}/>
            </div>
            ${err&&html`<div style=${{color:'var(--err)',fontSize:13,marginBottom:8}}>${err}</div>`}
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick=${onClose}>取消</button>
              <button className="btn btn-gold" onClick=${submit} disabled=${!cur||!newP||!conf}>保存</button>
            </div>
          </${React.Fragment}>`}
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
// 账户 Modal
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// 货币持有 Modal（含活期/定期利率）
// ══════════════════════════════════════════════════════════
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
    if(editHolding&&editHolding.id)h.id=editHolding.id;
    if(f.depositType!=='none'&&f.interestRate&&f.startDate){
      h.depositType=f.depositType;h.interestRate=Number(f.interestRate);h.startDate=f.startDate;
      if(f.depositType==='fixed'&&f.maturityDate)h.maturityDate=f.maturityDate;
    }
    if(f.note.trim())h.note=f.note.trim();
    return h;
  };
  const submit=()=>{
    if(!f.amount||Number(f.amount)<=0)return;
    // 新增时检查重复入账（同日期 + 同金额）
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

// ══════════════════════════════════════════════════════════
// 负债 Modal + 负债行
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

// ── 还款 Modal ────────────────────────────────────────────
function PaymentModal({liab,allAccounts,onSave,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const remaining=calcRemainingPrincipal(liab);
  const calc=calcLiability(liab);
  const suggested=calc.payment?fmtNum(calc.payment,2).replace(/,/g,''):fmtNum(remaining,2).replace(/,/g,'');
  const [date,setDate]=useState(today);
  const [amount,setAmount]=useState(suggested);
  const [fromAccId,setFromAccId]=useState(()=>{
    // 默认选有同币种余额的账户
    const match=allAccounts.find(a=>(a.holdings||[]).some(h=>h.currency===liab.currency&&h.amount>0));
    return match?match.id:'';
  });
  const [note,setNote]=useState('');
  const [err,setErr]=useState('');

  const totalPaid=Number(amount)||0;
  // 自动拆分：利息 = 剩余本金 × 期利率，本金 = 总额 - 利息
  const periodInterest=calcPeriodInterest(remaining,liab.interestRate,liab.paymentFreq);
  const interestPaid=Math.min(periodInterest,totalPaid);
  const principalPaid=Math.max(0,totalPaid-interestPaid);
  const newRemaining=Math.max(0,remaining-principalPaid);

  // 来源账户可用余额
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

// ── 负债行（含还款记录和历史） ────────────────────────────
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

// ══════════════════════════════════════════════════════════
// 投资 Modal（固定收益 / 非固定收益 双模式）
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
    note:inv?inv.note:''
  });
  const set=k=>e=>sf(x=>({...x,[k]:e.target.value}));
  const setCat=cat=>sf(x=>({...x,category:cat,type:cat==='fixed'?INV_FIXED_TYPES[0]:INV_VARIABLE_TYPES[0],quantity:cat==='fixed'?'1':x.quantity}));
  const typeList=f.category==='fixed'?INV_FIXED_TYPES:INV_VARIABLE_TYPES;
  const principal=f.buyPrice&&f.quantity?Number(f.buyPrice)*Number(f.quantity):null;
  // 固定收益预览
  const fixedCalc=(f.category==='fixed'&&f.buyDate&&f.maturityDate&&f.annualRate&&principal)
    ?calcFixedReturn({...f,buyPrice:Number(f.buyPrice),quantity:Number(f.quantity),annualRate:Number(f.annualRate)}):null;
  // 非固定收益预览
  const mv=f.category==='variable'&&f.currentPrice&&f.quantity?Number(f.currentPrice)*Number(f.quantity):null;
  const pl=mv!==null&&principal!==null?mv-principal:null;
  const plPct=pl!==null&&principal?pl/principal*100:null;
  const submit=()=>{
    if(!f.name||!f.buyPrice)return;
    if(f.category==='fixed'&&(!f.maturityDate||!f.annualRate))return;
    if(f.category==='variable'&&!f.quantity)return;
    const cp=f.category==='variable'&&f.currentPrice!==''?Number(f.currentPrice):null;
    const ar=f.category==='fixed'&&f.annualRate?Number(f.annualRate):undefined;
    const md=f.category==='fixed'?f.maturityDate:undefined;
    onSave({...inv,...f,buyPrice:Number(f.buyPrice),quantity:Number(f.quantity||1),annualRate:ar,maturityDate:md,currentPrice:cp});
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
        <div className="inp-group"><div className="inp-label">备注（简短说明）</div><input className="inp" placeholder="备注" value=${f.note} onChange=${set('note')}/></div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick=${onClose}>取消</button>
          <button className="btn btn-gold" onClick=${submit} disabled=${!canSave}>保存</button>
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════════════════════════
// 现价内联编辑组件
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// 投资备注日志 Modal
// ══════════════════════════════════════════════════════════
function InvestmentNotesModal({inv,onAdd,onDelete,onClose}){
  const [text,setText]=useState('');
  // 按时间正序：第1条=最早，第N条=最新
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

// ══════════════════════════════════════════════════════════
// 价格历史走势图
// ══════════════════════════════════════════════════════════
function PriceHistoryChart({inv}){
  const sym=CUR_SYM[inv.currency]||'';
  const priceHistory=[...(inv.priceHistory||[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(priceHistory.length<2){
    return html`<div className="txs tm" style=${{textAlign:'center',padding:'10px 0',opacity:.6}}>
      更新现价后将自动记录走势（已记录 ${priceHistory.length} / 至少需 2 次）
    </div>`;
  }
  // 根据trades逐步推算某日期时的均价成本
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

// ══════════════════════════════════════════════════════════
// 补仓 / 减仓 Modal
// ══════════════════════════════════════════════════════════
function TradeModal({inv,onAddTrade,onDeleteTrade,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const [type,setType]=useState('buy');
  const [date,setDate]=useState(today);
  const [qty,setQty]=useState('');
  const [price,setPrice]=useState('');
  const [total,setTotal]=useState('');
  const [autoField,setAutoField]=useState(null); // 'qty'|'price'|'total'
  const [note,setNote]=useState('');
  const [err,setErr]=useState('');

  const pos=calcEffectivePosition(inv);
  const sym=CUR_SYM[inv.currency]||'';
  const r8=v=>String(Math.round(v*1e8)/1e8);

  // 当某字段变为无效时，清掉由它衍生出来的 auto 字段
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
    // 跳过被自动算出的字段，只用手动输入的字段作为源
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
  const resetFields=()=>{setQty('');setPrice('');setTotal('');setAutoField(null);setErr('');};

  const qtyN=parseFloat(qty)||0;
  const priceN=parseFloat(price)||0;
  const preview=useMemo(()=>{
    if(!qtyN||!priceN)return null;
    if(type==='buy'){
      const newCost=pos.totalCost+qtyN*priceN;
      const newQty=pos.effectiveQty+qtyN;
      const newAvg=newQty>0?newCost/newQty:0;
      return{newQty,newAvg,newCost,tradePL:null};
    }else{
      if(qtyN>pos.effectiveQty)return{error:'减仓数量超过持仓'};
      const tradePL=qtyN*(priceN-pos.avgCost);
      const newQty=pos.effectiveQty-qtyN;
      return{newQty,newAvg:pos.avgCost,newCost:pos.avgCost*newQty,tradePL};
    }
  },[type,qtyN,priceN,pos]);

  const canSave=qtyN>0&&priceN>0&&date&&!(preview&&preview.error);

  const submit=()=>{
    if(!canSave)return;
    if(type==='sell'&&qtyN>pos.effectiveQty){setErr('减仓数量超过当前持仓');return;}
    onAddTrade({type,date,quantity:qtyN,price:priceN,note:note.trim()});
    resetFields();setNote('');
  };

  // 交易历史（按日期降序）
  const trades=[...(inv.trades||[])].sort((a,b)=>b.date.localeCompare(a.date)||(b.ts||0)-(a.ts||0));

  const fmtDT2=ts=>{const d=new Date(ts);return d.toLocaleDateString('zh-CN')+' '+d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');};

  return html`
    <div className="overlay" onClick=${e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style=${{maxWidth:540}}>
        <div className="modal-title">📊 仓位操作 · ${inv.name}</div>

        <!-- 当前仓位摘要 -->
        <div style=${{background:'var(--bg3)',borderRadius:10,padding:'12px 16px',marginBottom:16,display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
          <div><div className="txs tm mb2">初始建仓</div><div className="fn ts">${fmtNum(inv.quantity||0,2)} 股 @ ${sym}${fmtNum(inv.buyPrice,4)}</div></div>
          <div><div className="txs tm mb2">当前持仓量</div><div className="fn ts" style=${{color:'var(--gold)'}}>${fmtNum(pos.effectiveQty,4)} 股</div></div>
          <div><div className="txs tm mb2">加权均价</div><div className="fn ts">${sym}${fmtNum(pos.avgCost,4)}</div></div>
          <div><div className="txs tm mb2">持仓成本</div><div className="fn ts">${sym}${fmtNum(pos.totalCost)}</div></div>
          ${pos.realizedPL!==0&&html`<div><div className="txs tm mb2">已实现盈亏</div>
            <div className=${'fn ts '+(pos.realizedPL>=0?'pl-pos':'pl-neg')}>${pos.realizedPL>=0?'+':''}${sym}${fmtNum(pos.realizedPL)}</div></div>`}
        </div>

        <!-- 新建交易 -->
        <div className="fw6 mb12">新增交易</div>
        <div className="fc g8 mb14">
          <button className=${'btn btn-sm '+(type==='buy'?'btn-gold':'btn-ghost')} onClick=${()=>{setType('buy');setErr('');}}>📈 补仓（买入）</button>
          <button className=${'btn btn-sm '+(type==='sell'?'btn-gold':'btn-ghost')} onClick=${()=>{setType('sell');setErr('');}}>📉 减仓（卖出）</button>
        </div>
        <div className="inp-group mb10">
          <div className="inp-label">交易日期 *</div>
          <input className="inp" type="date" value=${date} onChange=${e=>setDate(e.target.value)} style=${{maxWidth:180}}/>
        </div>

        <!-- 三字段互算 -->
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

        <div className="inp-group">
          <div className="inp-label">备注（可选）</div>
          <input className="inp" placeholder=${type==='buy'?'例：加仓看好Q3业绩':'例：止盈部分仓位'}
            value=${note} onChange=${e=>setNote(e.target.value)}/>
        </div>

        <!-- 操作预览 -->
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
              ${type==='sell'&&preview.tradePL!=null&&html`
                <div className="fb"><span className="txs tm">本次盈亏</span>
                  <span className=${'fn ts '+(preview.tradePL>=0?'pl-pos':'pl-neg')}>${preview.tradePL>=0?'+':''}${sym}${fmtNum(preview.tradePL)}</span></div>
              `}
              <div className="fb" style=${{gridColumn:'1/-1',marginTop:4,paddingTop:6,borderTop:'1px solid rgba(128,128,128,.15)'}}>
                <span className="txs tm">${type==='buy'?'账户余额扣除':'账户余额增加'}</span>
                <span className=${'fn ts '+(type==='buy'?'pl-neg':'pl-pos')}>${type==='buy'?'-':'+'}${sym}${fmtNum(qtyN*priceN)}</span>
              </div>
            </div>
          </div>
        `}
        ${(err||(preview&&preview.error))&&html`<div style=${{color:'var(--err)',fontSize:13,marginBottom:8}}>⚠ ${err||preview.error}</div>`}
        <button className="btn btn-gold btn-w mb16" onClick=${submit} disabled=${!canSave}>
          ${type==='buy'?'✅ 确认补仓':'✅ 确认减仓'}
        </button>

        <!-- 价格历史走势图 -->
        <div style=${{borderTop:'1px solid var(--border)',paddingTop:12,marginBottom:4}}>
          <${PriceHistoryChart} inv=${inv}/>
        </div>

        <!-- 历史记录 -->
        <div className="txs fw6 tm mb8">交易历史（含初始建仓）</div>
        <div style=${{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
          <!-- 初始建仓（固定，不可删除） -->
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
          <!-- 后续 trades -->
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

// ══════════════════════════════════════════════════════════
// 股息 / 分红 Modal
// ══════════════════════════════════════════════════════════
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

        <!-- 累计分红汇总 -->
        <div style=${{background:'var(--bg3)',borderRadius:8,padding:'10px 14px',marginBottom:14,display:'flex',gap:20}}>
          <div><div className="txs tm">累计分红</div>
            <div className="fn" style=${{fontSize:20,color:'var(--ok)'}}>${sym}${fmtNum(totalDiv)}</div></div>
          <div><div className="txs tm">分红收益率</div>
            <div className=${'fn '+(yieldPct>=0?'pl-pos':'pl-neg')} style=${{fontSize:20}}>${yieldPct>=0?'+':''}${fmtNum(yieldPct,2)}%</div></div>
          <div><div className="txs tm">记录笔数</div>
            <div className="fn ts" style=${{fontSize:20}}>${dividends.length}</div></div>
        </div>

        <!-- 新增表单 -->
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

        <!-- 历史记录 -->
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

// ══════════════════════════════════════════════════════════
// 账户流水 Modal
// ══════════════════════════════════════════════════════════
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
