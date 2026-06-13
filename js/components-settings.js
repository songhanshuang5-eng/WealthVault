// ══════════════════════════════════════════════════════════
// 设置相关 Modal：修改用户名、修改密码
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
