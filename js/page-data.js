function DataPage({data,setData,exportData,importFile,loadDemo}){
  const [showChangePwd,setShowChangePwd]=useState(false);
  const [showChangeUser,setShowChangeUser]=useState(false);
  const [importStatus,setImportStatus]=useState(null);
  const fileRef=useRef(null);

  const onFileChange=e=>{
    const file=e.target.files?.[0];if(!file)return;
    setImportStatus(null);
    importFile(file,result=>setImportStatus(result));
    e.target.value='';
  };
  const stats=[
    {label:'银行账户',val:data.accounts.length},
    {label:'货币持有项',val:data.accounts.reduce((s,a)=>s+(a.holdings||[]).length,0)},
    {label:'负债项目',val:data.accounts.reduce((s,a)=>s+(a.liabilities||[]).length,0)},
    {label:'投资持仓',val:data.investments.length},
    {label:'换算记录',val:data.fxHistory.length},
    {label:'转账记录',val:(data.transfers||[]).length},
    {label:'净资产快照',val:(data.snapshots||[]).length},
  ];
  return html`
    <div>
      <div className="mb20"><div className="pg-title">数据管理</div><div className="pg-sub">数据自动保存在本地浏览器中</div></div>
      <div className="alert alert-ok mb20">✅ 数据自动保存在本机浏览器（localStorage）中，关闭页面后依然保留。建议定期导出 JSON 作为备份。</div>
      <div className="g2 mb16">
        ${stats.map(s=>html`<div key=${s.label} className="stat-box"><div className="stat-lbl">${s.label}</div><div className="stat-val">${s.val}</div></div>`)}
      </div>
      <div className="card">
        <div className="fw6 mb16">数据操作</div>
        <div style=${{display:'flex',flexDirection:'column',gap:18}}>
          <div>
            <div className="ts fw6 mb4">📥 导出备份</div>
            <div className="ts tm mb10">将全部数据导出为 JSON 文件</div>
            <button className="btn btn-gold" onClick=${exportData}>下载 JSON 文件</button>
          </div>
          <div className="divider" style=${{margin:'0'}}/>
          <div>
            <div className="ts fw6 mb4">📤 从备份恢复</div>
            <div className="ts tm mb10">从 JSON 文件恢复数据（将覆盖当前数据）</div>
            <button className="btn btn-ghost" onClick=${()=>{setImportStatus(null);fileRef.current&&fileRef.current.click();}}>选择 JSON 文件</button>
            <input ref=${fileRef} type="file" accept=".json" style=${{display:'none'}} onChange=${onFileChange}/>
            ${importStatus&&html`<div style=${{
              marginTop:8,padding:'7px 10px',borderRadius:6,fontSize:12,lineHeight:1.5,
              background:importStatus.ok?'rgba(82,214,138,0.08)':'rgba(240,128,128,0.08)',
              color:importStatus.ok?'var(--ok)':'var(--err)',
              border:importStatus.ok?'1px solid rgba(82,214,138,0.2)':'1px solid rgba(240,128,128,0.2)'
            }}>${importStatus.ok?'✅ ':'❌ '}${importStatus.msg}</div>`}
          </div>
          <div className="divider" style=${{margin:'0'}}/>
          <div>
            <div className="ts fw6 mb4">🧪 加载示例数据</div>
            <div className="ts tm mb10">加载演示数据体验功能</div>
            <button className="btn btn-ghost" onClick=${()=>{if(confirm('确认加载示例数据？'))loadDemo();}}>加载示例</button>
          </div>
          <div className="divider" style=${{margin:'0'}}/>
          <div>
            <div className="ts fw6 mb4">👤 修改用户名</div>
            <div className="ts tm mb10">当前用户名：<span style=${{color:'var(--gold)',fontWeight:600}}>${getUsername()}</span></div>
            <button className="btn btn-ghost" onClick=${()=>setShowChangeUser(true)}>修改用户名</button>
          </div>
          <div className="divider" style=${{margin:'0'}}/>
          <div>
            <div className="ts fw6 mb4">🔐 修改密码</div>
            <div className="ts tm mb10">修改应用访问密码</div>
            <button className="btn btn-ghost" onClick=${()=>setShowChangePwd(true)}>修改密码</button>
          </div>
          <div className="divider" style=${{margin:'0'}}/>
          <div>
            <div className="ts fw6 mb4">🗑️ 清空所有数据</div>
            <div className="ts tm mb10">清除全部数据（不可撤销）</div>
            <button className="btn btn-danger" onClick=${()=>{if(confirm('确认清空所有数据？'))setData(EMPTY);}}>清空数据</button>
          </div>
        </div>
      </div>
      ${showChangePwd&&html`<${ChangePasswordModal} onClose=${()=>setShowChangePwd(false)}/>`}
      ${showChangeUser&&html`<${ChangeUsernameModal} onClose=${()=>setShowChangeUser(false)}/>`}
    </div>
  `;
}
