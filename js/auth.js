// ── 忘记密码确认弹窗 ─────────────────────────────────────
function ForgotModal({onConfirm, onCancel}){
  return html`
    <div className="overlay" onClick=${onCancel}>
      <div className="modal" style=${{maxWidth:360,textAlign:'center'}} onClick=${e=>e.stopPropagation()}>
        <div style=${{fontSize:36,marginBottom:12}}>🔑</div>
        <div className="modal-title" style=${{fontSize:18,marginBottom:8}}>重置密码</div>
        <div style=${{color:'var(--muted)',fontSize:13,lineHeight:1.7,marginBottom:8}}>
          重置后你可以重新设置用户名和密码。
        </div>
        <div style=${{
          background:'rgba(82,214,138,0.07)',border:'1px solid rgba(82,214,138,0.2)',
          borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--ok)',
          lineHeight:1.6,marginBottom:20,textAlign:'left'
        }}>
          ✅ 你的所有财务数据<strong>不会丢失</strong>，仅重置账户名和密码。
        </div>
        <div style=${{display:'flex',gap:8}}>
          <button className="btn btn-ghost btn-w" onClick=${onCancel}>取消</button>
          <button className="btn btn-danger btn-w" onClick=${onConfirm}>确认重置</button>
        </div>
      </div>
    </div>
  `;
}

// ── 登录页（用户名+密码，含忘记密码、新用户注册入口）─────────
function LockScreen({onUnlock}){
  const savedUser = getUsername();
  const hasSavedUser = !!savedUser;
  const hasHash = !!getHash();

  const [user, setUser] = useState(savedUser);
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState('login'); // always open login first
  const [showForgot, setShowForgot] = useState(false);

  const doShake = msg => { setErr(msg); setShake(true); setTimeout(() => setShake(false), 400); };

  // ── 登录提交 ──
  const submitLogin = async () => {
    if (loading) return;
    if (!hasHash) { setErr('尚未注册，请点击下方"新用户注册"'); return; }
    if (!user.trim()) { setErr('请输入用户名'); return; }
    if (!pwd) { setErr('请输入密码'); return; }
    setLoading(true);
    try {
      const h = await hashPwd(pwd);
      if (h === getHash()) {
        onUnlock();
      } else {
        doShake('用户名或密码错误');
        setPwd('');
      }
    } catch(e) {
      setErr('密码验证失败：' + (e.message || '未知错误'));
    }
    setLoading(false);
  };

  // ── 重置账户 ──
  const doReset = () => {
    localStorage.removeItem('pab_auth');
    localStorage.removeItem('pab_user');
    setShowForgot(false);
    setUser('');
    setPwd('');
    setErr('');
    setPage('register');
  };

  // ── 注册页 ──
  if (page === 'register') {
    return html`<${RegisterPage}
      onDone=${onUnlock}
      onBack=${() => setPage('login')}
    />`;
  }

  // ── 登录页 ──
  return html`
    <div className="lock-wrap">
      ${showForgot ? html`<${ForgotModal} onConfirm=${doReset} onCancel=${() => setShowForgot(false)}/>` : null}
      <div className="lock-box">
        <div className="lock-ico">🔐</div>
        <div className="lock-title">私人账本</div>
        <div className="lock-sub" style=${{marginBottom:20}}>请登录以继续</div>
        <div className=${shake ? 'shake' : ''}>
          <div className="inp-group" style=${{marginBottom:10}}>
            <input className="inp" type="text" placeholder="用户名"
              value=${user}
              onChange=${e => { setUser(e.target.value); setErr(''); }}
              style=${{textAlign:'center'}}
              autoFocus/>
          </div>
          <div className="inp-group" style=${{marginBottom: err ? 8 : 14}}>
            <input className="inp" type="password" placeholder="密码"
              value=${pwd}
              onChange=${e => { setPwd(e.target.value); setErr(''); }}
              onKeyDown=${e => e.key === 'Enter' && submitLogin()}
              style=${{textAlign:'center', fontSize:18, letterSpacing:6}}/>
          </div>
          ${err ? html`<div style=${{color:'var(--err)',fontSize:13,marginBottom:12}}>${err}</div>` : null}
        </div>
        <button className="btn btn-gold btn-w" onClick=${submitLogin}>
          ${loading ? '验证中...' : '登 录'}
        </button>
        <!-- 忘记密码 -->
        <div style=${{marginTop:12,textAlign:'center'}}>
          <button onClick=${() => setShowForgot(true)}
            style=${{background:'none',border:'none',color:'var(--dim)',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)',textDecoration:'underline'}}>
            忘记密码？
          </button>
        </div>
        <!-- 新用户注册 -->
        <div style=${{marginTop:16,borderTop:'1px solid var(--border)',paddingTop:16,textAlign:'center'}}>
          <span style=${{color:'var(--dim)',fontSize:13}}>新设备 / 首次使用？</span>
          <button onClick=${() => setPage('register')}
            style=${{background:'none',border:'none',color:'var(--gold)',fontSize:13,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:600,padding:'0 6px',textDecoration:'underline'}}>
            新用户注册 →
          </button>
        </div>
      </div>
    </div>
  `;
}

// ── 注册页（新用户：设置账户 + 可直接导入数据）──────────────
function RegisterPage({onDone, onBack}){
  const [user, setUser] = useState('');
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) return;
    if (!user.trim()) { setErr('请输入用户名'); return; }
    if (user.trim().length < 2) { setErr('用户名至少需要 2 个字符'); return; }
    if (pwd.length < 4) { setErr('密码至少需要 4 位'); return; }
    if (pwd !== confirm) { setErr('两次输入的密码不一致'); return; }
    setLoading(true);
    try {
      saveUsername(user.trim());
      saveHash(await hashPwd(pwd));
      onDone();
    } catch(e) {
      setErr('注册失败：' + (e.message || '未知错误'));
      setLoading(false);
    }
  };

  return html`
    <div className="lock-wrap">
      <div style=${{width:'100%',maxWidth:320}}>
        <div className="lock-box" style=${{marginBottom:24}}>
          <div className="lock-ico">🔐</div>
          <div className="lock-title">私人账本</div>
          <div className="lock-sub">新用户注册</div>
        </div>

        <div className="inp-group">
          <div className="inp-label">用户名（至少 2 个字符）</div>
          <input className="inp" type="text" placeholder="输入用户名" value=${user}
            onChange=${e => { setUser(e.target.value); setErr(''); }} autoFocus/>
        </div>
        <div className="inp-group">
          <div className="inp-label">设置密码（至少 4 位）</div>
          <input className="inp" type="password" placeholder="输入密码" value=${pwd}
            onChange=${e => { setPwd(e.target.value); setErr(''); }}/>
        </div>
        <div className="inp-group">
          <div className="inp-label">确认密码</div>
          <input className="inp" type="password" placeholder="再次输入" value=${confirm}
            onChange=${e => { setConfirm(e.target.value); setErr(''); }}
            onKeyDown=${e => e.key === 'Enter' && submit()}/>
        </div>
        ${err ? html`<div style=${{color:'var(--err)',fontSize:13,marginBottom:12}}>${err}</div>` : null}

        <button className="btn btn-gold btn-w" onClick=${submit} disabled=${loading}>
          ${loading ? '创建中...' : '创建账户并进入'}
        </button>

        ${onBack ? html`
          <div style=${{marginTop:14,textAlign:'center'}}>
            <button onClick=${onBack}
              style=${{background:'none',border:'none',color:'var(--muted)',fontSize:12,cursor:'pointer',textDecoration:'underline',fontFamily:'var(--fb)'}}>
              ← 返回登录
            </button>
          </div>
        ` : null}
      </div>
    </div>
  `;
}
