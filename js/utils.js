// ── 全局 React 绑定（所有模块共用）─────────────────────────
const {useState,useMemo,useRef,useEffect,Component}=React;
const html=htm.bind(React.createElement);

// ── 货币常量 ─────────────────────────────────────────────
const CURRENCIES=['USD','EUR','GBP','JPY','CNY','HKD','SGD','AUD','CAD','CHF','KRW','THB','MYR','INR','TWD','NZD'];
const CUR_NAMES={USD:'美元',EUR:'欧元',GBP:'英镑',JPY:'日元',CNY:'人民币',HKD:'港币',SGD:'新加坡元',AUD:'澳元',CAD:'加元',CHF:'瑞士法郎',KRW:'韩元',THB:'泰铢',MYR:'林吉特',INR:'卢比',TWD:'台币',NZD:'纽元'};
const CUR_SYM={USD:'$',EUR:'€',GBP:'£',JPY:'¥',CNY:'¥',HKD:'HK$',SGD:'S$',AUD:'A$',CAD:'C$',CHF:'Fr',KRW:'₩',THB:'฿',MYR:'RM',INR:'₹',TWD:'NT$',NZD:'NZ$'};
// 图表用货币颜色
const CUR_COLORS={USD:'#4A90D9',EUR:'#7B68EE',GBP:'#9B4494',JPY:'#E8913A',CNY:'#E8A040',HKD:'#E86060',SGD:'#52C87A',AUD:'#D47840',CAD:'#A05C3C',CHF:'#78A85A',KRW:'#6080CC',THB:'#C8A048',MYR:'#58B898',INR:'#D88048',TWD:'#9878C8',NZD:'#68B8A8'};

// ── 其他常量 ──────────────────────────────────────────────
const INV_FIXED_TYPES=['债券','定期存款','固定收益理财','结构性产品','货币基金'];
const INV_VARIABLE_TYPES=['股票','ETF','公募基金','私募基金','其他理财'];
const INV_TYPES=[...INV_FIXED_TYPES,...INV_VARIABLE_TYPES]; // 向下兼容
const CARD_COLORS=['#C9A043','#4A7FA5','#3D9070','#8A5BA5','#A84040','#3D8080','#A07030','#4060A0','#608050','#80604A','#607B8B','#B0BCC8','#8B2020'];
const FREQ_LABEL={monthly:'每月',quarterly:'每季度',yearly:'每年',bullet:'到期一次性'};
const EXPENSE_CATEGORIES=['餐饮','购物','交通','住房','生活','医疗','娱乐','教育','旅行','其他'];
const EXPENSE_CAT_COLORS={餐饮:'#E86060',购物:'#E8913A',交通:'#4A90D9',住房:'#C9A043',生活:'#52C87A',医疗:'#7B68EE',娱乐:'#D47840',教育:'#58B898',旅行:'#9B4494',其他:'#607B8B'};
const TABS=[
  {id:'overview',label:'总览',ico:'📊'},
  {id:'accounts',label:'账户',ico:'🏦'},
  {id:'investments',label:'投资',ico:'📈'},
  {id:'analysis',label:'增值',ico:'✨'},
  {id:'fx',label:'汇率',ico:'💱'},
  {id:'transfer',label:'转账',ico:'🔄'},
  {id:'data',label:'数据',ico:'💾'}
];

// ── 数据结构 ──────────────────────────────────────────────
const EMPTY={accounts:[],investments:[],fxHistory:[],transfers:[],snapshots:[],expenses:[],incomePlans:[],benchmarks:[]};
const BENCHMARK_PRESETS=[
  {name:'标普500',   symbol:'^GSPC',     currency:'USD'},
  {name:'纳斯达克100',symbol:'^NDX',     currency:'USD'},
  {name:'恒生指数',  symbol:'^HSI',      currency:'HKD'},
  {name:'沪深300',  symbol:'000300.SS',  currency:'CNY'},
  {name:'日经225',  symbol:'^N225',      currency:'JPY'},
  {name:'富时100',  symbol:'^FTSE',      currency:'GBP'},
  {name:'MSCI全球', symbol:'URTH',       currency:'USD'},
];

// ── 隐私模式 ──────────────────────────────────────────────
// 每次加载页面固定从闭眼开始，不持久化偏好
let _privacyMode=true;
const setPrivacyMode=v=>{_privacyMode=!!v;};

// ── 工具函数 ──────────────────────────────────────────────
const genId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fmtNum=(n,d=2)=>{
  if(_privacyMode)return'***';
  return n==null||isNaN(n)?'—':Number(n).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
};
const fmtDate=s=>s?new Date(s).toLocaleDateString('zh-CN'):'';

// ── 密码认证 ──────────────────────────────────────────────
const AUTH_KEY='pab_auth';
const AUTH_USER_KEY='pab_user';

// Pure-JS SHA-256 fallback for insecure contexts (http:// on LAN)
// where crypto.subtle is unavailable.
function _sha256JS(str){
  function rightRotate(v,a){return(v>>>a)|(v<<(32-a));}
  const data=new TextEncoder().encode(str);
  const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const len=data.length;
  const padded=new Uint8Array(((len+9+63)&~63));
  padded.set(data);padded[len]=0x80;
  const dv=new DataView(padded.buffer);
  dv.setUint32(padded.length-4,(len*8)&0xffffffff,false);
  for(let i=0;i<padded.length;i+=64){
    const w=new Int32Array(64);
    for(let j=0;j<16;j++)w[j]=dv.getInt32(i+j*4,false);
    for(let j=16;j<64;j++){const s0=rightRotate(w[j-15],7)^rightRotate(w[j-15],18)^(w[j-15]>>>3);const s1=rightRotate(w[j-2],17)^rightRotate(w[j-2],19)^(w[j-2]>>>10);w[j]=(w[j-16]+s0+w[j-7]+s1)|0;}
    let[a,b,c,d,e,f,g,h]=[...H];
    for(let j=0;j<64;j++){const S1=rightRotate(e,6)^rightRotate(e,11)^rightRotate(e,25);const ch=(e&f)^(~e&g);const temp1=(h+S1+ch+K[j]+w[j])|0;const S0=rightRotate(a,2)^rightRotate(a,13)^rightRotate(a,22);const maj=(a&b)^(a&c)^(b&c);const temp2=(S0+maj)|0;h=g;g=f;f=e;e=(d+temp1)|0;d=c;c=b;b=a;a=(temp1+temp2)|0;}
    H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
  }
  return H.map(v=>((v>>>0).toString(16)).padStart(8,'0')).join('');
}

const hashPwd=async p=>{
  if(crypto.subtle){
    const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p));
    return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  // Fallback: crypto.subtle is unavailable in insecure HTTP contexts (LAN access)
  return _sha256JS(p);
};

const getHash=()=>localStorage.getItem(AUTH_KEY);
const saveHash=h=>localStorage.setItem(AUTH_KEY,h);
const getUsername=()=>localStorage.getItem(AUTH_USER_KEY)||'';
const saveUsername=u=>localStorage.setItem(AUTH_USER_KEY,u);

// ── 备份提醒 ──────────────────────────────────────────────
const BACKUP_KEY='pab_backup_ts';
const getLastBackup=()=>localStorage.getItem(BACKUP_KEY);
const setLastBackup=()=>localStorage.setItem(BACKUP_KEY,Date.now().toString());
const needsBackup=()=>{const last=getLastBackup();if(!last)return true;const d=new Date(Number(last)),now=new Date();return d.getFullYear()!==now.getFullYear()||d.getMonth()!==now.getMonth();};

// ── 数据持久化（按用户名隔离）────────────────────────────
const LEGACY_KEY='pab_v1'; // 旧版共享 key，用于迁移
const getStoreKey=()=>{
  const user=getUsername();
  if(!user)return LEGACY_KEY;
  // 用户名安全化：转小写，非字母数字替换为下划线
  const safe=user.toLowerCase().replace(/[^a-z0-9]/gi,'_');
  return 'pab_data_'+safe;
};
const loadData=()=>{
  try{
    const key=getStoreKey();
    let s=localStorage.getItem(key);
    // 自动迁移：用户专属 key 为空时，从旧 pab_v1 导入数据
    if(!s&&key!==LEGACY_KEY){
      const legacy=localStorage.getItem(LEGACY_KEY);
      if(legacy){localStorage.setItem(key,legacy);s=legacy;}
    }
    const d=s?JSON.parse(s):EMPTY;
    return{...EMPTY,...d};
  }catch{return EMPTY;}
};
const saveData=d=>{
  const withTs={...d,_ts:Date.now()};
  try{localStorage.setItem(getStoreKey(),JSON.stringify(withTs));}catch{}
  // 后台推送到服务器（静默失败，不阻塞 UI）
  const user=getUsername();
  if(user){
    fetch(`/api/data?user=${encodeURIComponent(user)}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(withTs)
    }).catch(()=>{});
  }
};

// 强制推送本机数据到服务器（手动同步用）
const pushToServer=async data=>{
  const user=getUsername();
  if(!user)return{ok:false,msg:'未登录'};
  const withTs={...data,_ts:Date.now()};
  try{localStorage.setItem(getStoreKey(),JSON.stringify(withTs));}catch{}
  try{
    const resp=await fetch(`/api/data?user=${encodeURIComponent(user)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(withTs)
    });
    if(!resp.ok)return{ok:false,msg:'服务器返回错误 '+resp.status};
    return{ok:true,msg:'已推送到服务器 ✓'};
  }catch{return{ok:false,msg:'连接失败，请检查网络'};}
};

// 强制从服务器拉取数据到本机（手动同步用）
const pullFromServer=async setData=>{
  const user=getUsername();
  if(!user)return{ok:false,msg:'未登录'};
  try{
    const resp=await fetch(`/api/data?user=${encodeURIComponent(user)}`);
    if(resp.status===404)return{ok:false,msg:'服务器暂无数据，请先从另一台设备推送'};
    if(!resp.ok)return{ok:false,msg:'服务器返回错误 '+resp.status};
    const serverData=await resp.json();
    try{localStorage.setItem(getStoreKey(),JSON.stringify(serverData));}catch{}
    setData({...EMPTY,...serverData});
    return{ok:true,msg:'已从服务器拉取最新数据 ✓'};
  }catch(e){return{ok:false,msg:'连接失败，请检查网络'};}
};

// 从服务器拉取最新数据，若服务器更新则覆盖本地
const syncFromServer=async setData=>{
  const user=getUsername();
  if(!user)return;
  try{
    // 读本地时间戳
    let localTs=0;
    try{const loc=JSON.parse(localStorage.getItem(getStoreKey())||'{}');localTs=loc._ts||0;}catch{}

    const resp=await fetch(`/api/data?user=${encodeURIComponent(user)}`);

    if(resp.status===404){
      // 服务器尚无数据 → 把本地数据推上去（首次同步）
      const localData=loadData();
      const withTs={...localData,_ts:Date.now()};
      try{localStorage.setItem(getStoreKey(),JSON.stringify(withTs));}catch{}
      fetch(`/api/data?user=${encodeURIComponent(user)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(withTs)
      }).catch(()=>{});
      return;
    }
    if(!resp.ok)return;
    const serverData=await resp.json();
    const serverTs=serverData._ts||0;
    if(serverTs>localTs){
      // 服务器更新 → 同步到本地
      try{localStorage.setItem(getStoreKey(),JSON.stringify(serverData));}catch{}
      setData({...EMPTY,...serverData});
    }
  }catch{}
};

// ── 负债计算 ──────────────────────────────────────────────
// 计算剩余本金 = 初始本金 - 历史还款中已还本金之和
const calcRemainingPrincipal=liab=>{
  const paid=(liab.payments||[]).reduce((s,p)=>s+(p.principalPaid||0),0);
  return Math.max(0,Number(liab.principal)-paid);
};
// 每期利息（用于还款拆分预览）
const calcPeriodInterest=(remainingPrincipal,annualRate,paymentFreq)=>{
  const r=Number(annualRate)/100;
  const periodRate={monthly:r/12,quarterly:r/4,yearly:r,bullet:r/12}[paymentFreq]||r/12;
  return remainingPrincipal*periodRate;
};
const calcLiability=(liab)=>{
  const {interestRate,startDate,dueDate,paymentFreq}=liab;
  // 使用剩余本金（已还款则为缩减后余额，否则为原始本金）
  const p=calcRemainingPrincipal(liab),r=Number(interestRate)/100;
  const today=new Date();today.setHours(0,0,0,0);
  const start=new Date(startDate),due=new Date(dueDate);
  const daysLeft=Math.ceil((due-today)/86400000);
  if(paymentFreq==='bullet'){
    const years=(due-start)/(365.25*86400000);
    return{payment:null,totalInterest:p*r*years,daysLeft,nextPayDate:dueDate,remainingPeriods:null,totalPeriods:null};
  }
  const ppy={monthly:12,quarterly:4,yearly:1}[paymentFreq]||12;
  const pr=r/ppy,mspp=365.25*86400000/ppy;
  const totalPeriods=Math.max(1,Math.round((due-start)/mspp));
  const passed=Math.max(0,Math.floor((today-start)/mspp));
  const remaining=Math.max(1,totalPeriods-passed);
  const payment=pr===0?p/remaining:p*pr*Math.pow(1+pr,remaining)/(Math.pow(1+pr,remaining)-1);
  const totalInterest=Math.max(0,payment*remaining-p);
  const next=new Date(start);const n=passed+1;
  if(paymentFreq==='monthly')next.setMonth(next.getMonth()+n);
  else if(paymentFreq==='quarterly')next.setMonth(next.getMonth()+n*3);
  else if(paymentFreq==='yearly')next.setFullYear(next.getFullYear()+n);
  return{payment,totalInterest,daysLeft,nextPayDate:next.toISOString().slice(0,10),remainingPeriods:remaining,totalPeriods};
};

// ── 存款利息计算 ──────────────────────────────────────────
const calcDepositInterest=holding=>{
  if(!holding.depositType||holding.depositType==='none'||!holding.interestRate||!holding.startDate)return null;
  const today=new Date();today.setHours(0,0,0,0);
  const start=new Date(holding.startDate);
  const rate=Number(holding.interestRate)/100;
  const amount=Number(holding.amount);
  if(holding.depositType==='demand'){
    const days=Math.max(0,Math.floor((today-start)/86400000));
    return{type:'demand',days,interest:amount*rate*days/365};
  }
  if(holding.depositType==='fixed'&&holding.maturityDate){
    const maturity=new Date(holding.maturityDate);
    const termDays=Math.max(1,Math.ceil((maturity-start)/86400000));
    const daysLeft=Math.ceil((maturity-today)/86400000);
    const elapsed=Math.max(0,Math.min(Math.floor((today-start)/86400000),termDays));
    const totalInterest=amount*rate*termDays/365;
    const accrued=amount*rate*elapsed/365;
    return{type:'fixed',termDays,daysLeft,elapsed,totalInterest,accrued,isMatured:daysLeft<=0};
  }
  return null;
};

// ── 非固定收益：有效仓位计算（加权平均成本法）────────────────
// 以初始建仓为基础，叠加所有 trades 后计算：
//   effectiveQty   当前有效持仓数量
//   avgCost        加权平均成本价
//   realizedPL     已实现盈亏（所有减仓累计收益）
const calcEffectivePosition=inv=>{
  let avgCost=Number(inv.buyPrice)||0;
  let totalQty=Number(inv.quantity)||0;
  // 初始建仓手续费计入成本
  let totalCost=avgCost*totalQty+(Number(inv.buyFee)||0);
  if(totalQty>0)avgCost=totalCost/totalQty;
  let realizedPL=0;
  let totalFees=Number(inv.buyFee)||0;
  const sorted=[...(inv.trades||[])].sort((a,b)=>a.date.localeCompare(b.date)||(a.ts||0)-(b.ts||0));
  sorted.forEach(t=>{
    const qty=Math.abs(Number(t.quantity)||0);
    const price=Number(t.price)||0;
    const fee=Number(t.fee)||0;
    totalFees+=fee;
    if(t.type==='buy'){
      totalCost+=qty*price+fee;totalQty+=qty;
      avgCost=totalQty>0?totalCost/totalQty:avgCost;
    }else if(t.type==='sell'){
      realizedPL+=qty*(price-avgCost)-fee;
      totalQty=Math.max(0,totalQty-qty);
      totalCost=avgCost*totalQty;
    }
  });
  return{effectiveQty:totalQty,avgCost,realizedPL,totalCost,totalFees};
};

// ── 固定收益理财计算 ──────────────────────────────────────
const calcFixedReturn=inv=>{
  if(!inv.maturityDate||!inv.annualRate||!inv.buyDate)return null;
  const today=new Date();today.setHours(0,0,0,0);
  const buy=new Date(inv.buyDate),mat=new Date(inv.maturityDate);
  const principal=Number(inv.buyPrice)*Number(inv.quantity||1);
  const rate=Number(inv.annualRate)/100;
  const termDays=Math.max(1,Math.ceil((mat-buy)/86400000));
  const daysLeft=Math.ceil((mat-today)/86400000);
  const elapsed=Math.max(0,Math.min(Math.floor((today-buy)/86400000),termDays));
  const totalReturn=principal*rate*termDays/365;
  const accrued=principal*rate*elapsed/365;
  return{principal,totalReturn,accrued,termDays,daysLeft,elapsed,isMatured:daysLeft<=0};
};

// ── 示例数据 ──────────────────────────────────────────────
const DEMO={
  accounts:[
    {id:'a1',name:'工行人民币卡',bank:'中国工商银行',number:'1234',color:'#C9A043',note:'',
      holdings:[{currency:'CNY',amount:85000},{currency:'USD',amount:4200}],
      liabilities:[{id:'ll1',name:'消费贷款',currency:'CNY',principal:50000,interestRate:4.35,startDate:'2023-06-01',dueDate:'2026-06-01',paymentFreq:'monthly',note:''}]},
    {id:'a2',name:'汇丰Premier',bank:'汇丰银行',number:'5678',color:'#4A7FA5',note:'',holdings:[{currency:'HKD',amount:120000},{currency:'USD',amount:8000}],liabilities:[]},
    {id:'a3',name:'星展多币种',bank:'星展银行',number:'9012',color:'#3D9070',note:'',holdings:[{currency:'SGD',amount:22000},{currency:'EUR',amount:5000}],liabilities:[]},
  ],
  investments:[
    {id:'i1',name:'腾讯控股',type:'股票',ticker:'00700.HK',accountId:'a2',buyDate:'2023-03-15',buyPrice:285,quantity:200,currency:'HKD',currentPrice:380,note:''},
    {id:'i2',name:'沪深300ETF',type:'ETF',ticker:'510300',accountId:'a1',buyDate:'2022-08-20',buyPrice:4.18,quantity:5000,currency:'CNY',currentPrice:3.95,note:'定投'},
    {id:'i3',name:'标普500指数基金',type:'ETF',ticker:'SPY',accountId:'a2',buyDate:'2024-01-10',buyPrice:468,quantity:12,currency:'USD',currentPrice:542,note:''},
    {id:'i4',name:'工银理财稳享',type:'定期存款',ticker:'',accountId:'a1',buyDate:'2024-06-01',buyPrice:1,quantity:50000,currency:'CNY',currentPrice:null,note:'180天产品'},
  ],
  fxHistory:[
    {id:'f1',from:'USD',to:'CNY',rate:7.24,amount:5000,result:36200,note:'汇入工行',ts:Date.now()-86400000*5},
    {id:'f2',from:'HKD',to:'CNY',rate:0.925,amount:20000,result:18500,note:'',ts:Date.now()-86400000*2},
  ],
  transfers:[
    {id:'t1',fromAccountId:'a2',toAccountId:'a1',currency:'USD',amount:2000,date:'2024-05-10',note:'资金归集',ts:Date.now()-86400000*10},
  ],
  snapshots:[
    {id:'s1',ts:Date.now()-86400000*90,date:'2024-03-01',amount:580000,currency:'CNY'},
    {id:'s2',ts:Date.now()-86400000*60,date:'2024-04-01',amount:612000,currency:'CNY'},
    {id:'s3',ts:Date.now()-86400000*30,date:'2024-05-01',amount:645000,currency:'CNY'},
  ]
};
