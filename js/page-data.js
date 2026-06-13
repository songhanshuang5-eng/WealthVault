function DataPage({data,setData,exportData,importFile,loadDemo}){
  const [showChangePwd,setShowChangePwd]=useState(false);
  const [showChangeUser,setShowChangeUser]=useState(false);
  const [importStatus,setImportStatus]=useState(null);
  const [syncStatus,setSyncStatus]=useState(null); // {ok,msg}
  const [syncing,setSyncing]=useState(null);        // 'push' | 'pull' | null
  const fileRef=useRef(null);

  const onPush=async()=>{
    setSyncing('push');setSyncStatus(null);
    const result=await pushToServer(data);
    setSyncStatus(result);setSyncing(null);
  };
  const onPull=async()=>{
    if(!confirm('从服务器拉取数据将覆盖本机当前数据，确认继续？'))return;
    setSyncing('pull');setSyncStatus(null);
    const result=await pullFromServer(setData);
    setSyncStatus(result);setSyncing(null);
  };

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
      <div className="alert alert-ok mb20">✅ 数据自动保存在本机浏览器中。手机与电脑之间可通过下方"多设备同步"手动同步数据。</div>

      <div className="card mb16">
        <div className="fw6 mb4">☁️ 多设备同步</div>
        <div className="ts tm mb14">手机与电脑连接同一 Wi-Fi，通过服务器互传数据。</div>
        <div style=${{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <div style=${{background:'var(--bg3)',borderRadius:10,padding:'14px 16px'}}>
            <div className="ts fw6 mb4">📤 推送到服务器</div>
            <div className="txs tm mb10">把本机数据上传，另一台设备再拉取</div>
            <button className="btn btn-gold btn-w" onClick=${onPush} disabled=${syncing==='push'}>
              ${syncing==='push'?'推送中…':'推送本机数据'}
            </button>
          </div>
          <div style=${{background:'var(--bg3)',borderRadius:10,padding:'14px 16px'}}>
            <div className="ts fw6 mb4">📥 从服务器拉取</div>
            <div className="txs tm mb10">覆盖本机数据为服务器上的版本</div>
            <button className="btn btn-ghost btn-w" onClick=${onPull} disabled=${syncing==='pull'}>
              ${syncing==='pull'?'拉取中…':'拉取最新数据'}
            </button>
          </div>
        </div>
        ${syncStatus&&html`
          <div style=${{
            padding:'8px 12px',borderRadius:7,fontSize:13,
            background:syncStatus.ok?'rgba(82,214,138,.08)':'rgba(240,128,128,.08)',
            color:syncStatus.ok?'var(--ok)':'var(--err)',
            border:syncStatus.ok?'1px solid rgba(82,214,138,.2)':'1px solid rgba(240,128,128,.2)'
          }}>${syncStatus.msg}</div>
        `}
      </div>
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
