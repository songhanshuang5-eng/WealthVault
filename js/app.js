// ── 主应用 ────────────────────────────────────────────────
function App(){
  const [data,setData]=useState(loadData);
  const [tab,setTab]=useState('overview');
  const [baseCur,setBaseCur]=useState('CNY');
  const [rates,setRates]=useState({});
  const [saved,setSaved]=useState(false);
  const [showBanner,setShowBanner]=useState(needsBackup);

  const mut=patch=>setData(prev=>{
    const next={...prev,...patch};
    saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
    return next;
  });

  // ── 账户操作 ──────────────────────────────────────────
  const saveAccount=acc=>{
    if(acc.id)mut({accounts:data.accounts.map(a=>a.id===acc.id?{...a,...acc}:a)});
    else mut({accounts:[...data.accounts,{...acc,id:genId(),holdings:[],liabilities:[]}]});
  };
  const deleteAccount=id=>{if(!confirm('确认删除此账户？'))return;mut({accounts:data.accounts.filter(a=>a.id!==id)});};
  // saveHolding: holdingData 含 id 则编辑，否则新增（支持同币种多笔）
  const saveHolding=(accId,holdingData)=>mut({accounts:data.accounts.map(a=>{
    if(a.id!==accId)return a;
    const holdings=a.holdings||[];
    if(holdingData.id)return{...a,holdings:holdings.map(h=>h.id===holdingData.id?{...holdingData}:h)};
    return{...a,holdings:[...holdings,{...holdingData,id:genId()}]};
  })});
  // deleteHolding: 按 holding 的 id 删除
  const deleteHolding=(accId,holdingId)=>mut({accounts:data.accounts.map(a=>a.id!==accId?a:{...a,holdings:(a.holdings||[]).filter(h=>h.id!==holdingId)})});
  const saveLiability=(accId,liab)=>mut({accounts:data.accounts.map(a=>{
    if(a.id!==accId)return a;
    const ls=a.liabilities||[];
    if(liab.id)return{...a,liabilities:ls.map(l=>l.id===liab.id?{...l,...liab}:l)};
    return{...a,liabilities:[...ls,{...liab,id:genId()}]};
  })});
  const deleteLiability=(accId,liabId)=>{if(!confirm('确认删除此负债项目？'))return;mut({accounts:data.accounts.map(a=>a.id!==accId?a:{...a,liabilities:(a.liabilities||[]).filter(l=>l.id!==liabId)})});};

  // ── 还款操作：记录还款 + 自动从账户余额扣减 ────────────
  const savePayment=(accId,liabId,payment)=>{
    const{fromAccountId,currency,totalPaid}=payment;
    setData(prev=>{
      // 1. 在负债记录中追加还款
      let newAccounts=prev.accounts.map(acc=>{
        if(acc.id!==accId)return acc;
        return{...acc,liabilities:(acc.liabilities||[]).map(l=>{
          if(l.id!==liabId)return l;
          return{...l,payments:[...(l.payments||[]),{...payment,id:genId()}]};
        })};
      });
      // 2. 从来源账户扣减对应余额
      if(fromAccountId&&totalPaid>0){
        newAccounts=newAccounts.map(acc=>{
          if(acc.id!==fromAccountId)return acc;
          let rem=totalPaid;
          const holdings=(acc.holdings||[]).map(h=>{
            if(h.currency!==currency||rem<=0)return h;
            const take=Math.min(h.amount,rem);rem-=take;
            return{...h,amount:h.amount-take};
          });
          return{...acc,holdings};
        });
      }
      const next={...prev,accounts:newAccounts};
      saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
      return next;
    });
  };
  // 删除还款记录（并恢复账户余额）
  const deletePayment=(accId,liabId,paymentId)=>{
    if(!confirm('确认删除此还款记录？账户余额将恢复。'))return;
    setData(prev=>{
      const liab=prev.accounts.find(a=>a.id===accId)?.liabilities?.find(l=>l.id===liabId);
      const pmt=liab?.payments?.find(p=>p.id===paymentId);
      let newAccounts=prev.accounts.map(acc=>{
        if(acc.id!==accId)return acc;
        return{...acc,liabilities:(acc.liabilities||[]).map(l=>{
          if(l.id!==liabId)return l;
          return{...l,payments:(l.payments||[]).filter(p=>p.id!==paymentId)};
        })};
      });
      // 恢复扣款账户余额
      if(pmt?.fromAccountId&&pmt?.totalPaid>0){
        newAccounts=newAccounts.map(acc=>{
          if(acc.id!==pmt.fromAccountId)return acc;
          const hs=acc.holdings||[];
          const idx=hs.findIndex(h=>h.currency===pmt.currency);
          const holdings=idx>=0
            ?hs.map((h,i)=>i===idx?{...h,amount:h.amount+pmt.totalPaid}:h)
            :[...hs,{currency:pmt.currency,amount:pmt.totalPaid,id:genId()}];
          return{...acc,holdings};
        });
      }
      const next={...prev,accounts:newAccounts};
      saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
      return next;
    });
  };

  // ── 投资操作 ──────────────────────────────────────────
  const saveInvestment=inv=>{
    if(inv.id){
      const existing=data.investments.find(i=>i.id===inv.id);
      // 若 currentPrice 有变化，自动追加价格快照
      const updated={...existing,...inv};
      if(existing&&inv.currentPrice!=null&&Number(inv.currentPrice)!==Number(existing.currentPrice)){
        const snap={date:new Date().toISOString().slice(0,10),price:Number(inv.currentPrice),ts:Date.now()};
        const history=[...(existing.priceHistory||[])];
        // 同一天只保留最新的一条
        const todayStr=snap.date;
        const idx=history.findIndex(h=>h.date===todayStr);
        if(idx>=0)history[idx]=snap;else history.push(snap);
        updated.priceHistory=history;
      }
      mut({investments:data.investments.map(i=>i.id===inv.id?updated:i)});
    } else {
      mut({investments:[...data.investments,{...inv,id:genId()}]});
    }
  };
  const deleteInvestment=id=>{if(!confirm('确认删除？'))return;mut({investments:data.investments.filter(i=>i.id!==id)});};
  // 投资备注日志
  const addInvestmentNote=(invId,content)=>mut({investments:data.investments.map(inv=>{
    if(inv.id!==invId)return inv;
    const note={id:genId(),ts:Date.now(),date:new Date().toISOString().slice(0,10),content:content.trim()};
    return{...inv,notes:[...(inv.notes||[]),note]};
  })});
  const deleteInvestmentNote=(invId,noteId)=>mut({investments:data.investments.map(inv=>{
    if(inv.id!==invId)return inv;
    return{...inv,notes:(inv.notes||[]).filter(n=>n.id!==noteId)};
  })});
  // 补仓 / 减仓记录（自动同步关联账户余额）
  const addTrade=(invId,trade)=>{
    const inv=data.investments.find(i=>i.id===invId);
    if(!inv)return;
    const qty=Math.abs(Number(trade.quantity)||0);
    const price=Number(trade.price)||0;
    const cost=Math.round(qty*price*1e8)/1e8;
    const accId=inv.accountId;
    const cur=inv.currency;
    // 买入时检查账户余额是否充足
    if(trade.type==='buy'&&accId){
      const acc=data.accounts.find(a=>String(a.id)===String(accId));
      const holding=acc?(acc.holdings||[]).find(h=>h.currency===cur):null;
      const bal=Number(holding?.amount)||0;
      if(bal<cost){
        alert(`账户余额不足：当前 ${cur} 余额 ${fmtNum(bal)}，需要 ${fmtNum(cost)}`);
        return;
      }
    }
    const t={...trade,id:genId(),ts:Date.now()};
    setData(prev=>{
      const investments=prev.investments.map(i=>{
        if(i.id!==invId)return i;
        return{...i,trades:[...(i.trades||[]),t]};
      });
      const accounts=prev.accounts.map(acc=>{
        if(!accId||String(acc.id)!==String(accId))return acc;
        const hs=acc.holdings||[];
        if(trade.type==='buy'){
          // 买入：从账户扣除买入金额
          let rem=cost;
          const holdings=hs.map(h=>{
            const hAmt=Number(h.amount)||0;
            if(h.currency!==cur||rem<=0)return{...h,amount:hAmt};
            const take=Math.min(hAmt,rem);rem-=take;
            return{...h,amount:Math.round((hAmt-take)*1e8)/1e8};
          });
          return{...acc,holdings};
        } else if(trade.type==='sell'){
          // 卖出：将收款加回账户
          const idx=hs.findIndex(h=>h.currency===cur);
          const holdings=idx>=0
            ?hs.map((h,i)=>i===idx?{...h,amount:Math.round((Number(h.amount)+cost)*1e8)/1e8}:h)
            :[...hs,{currency:cur,amount:cost,id:genId()}];
          return{...acc,holdings};
        }
        return acc;
      });
      const next={...prev,investments,accounts};
      saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
      return next;
    });
  };
  const deleteTrade=(invId,tradeId)=>{
    const inv=data.investments.find(i=>i.id===invId);
    if(!inv)return;
    const trade=(inv.trades||[]).find(t=>t.id===tradeId);
    if(!trade)return;
    if(!confirm('确认删除此交易记录？将同步撤销账户余额变动。'))return;
    const qty=Math.abs(Number(trade.quantity)||0);
    const price=Number(trade.price)||0;
    const cost=Math.round(qty*price*1e8)/1e8;
    const accId=inv.accountId;
    const cur=inv.currency;
    setData(prev=>{
      const investments=prev.investments.map(i=>{
        if(i.id!==invId)return i;
        return{...i,trades:(i.trades||[]).filter(t=>t.id!==tradeId)};
      });
      const accounts=prev.accounts.map(acc=>{
        if(!accId||String(acc.id)!==String(accId))return acc;
        const hs=acc.holdings||[];
        if(trade.type==='buy'){
          // 撤销买入 → 退款回账户
          const idx=hs.findIndex(h=>h.currency===cur);
          const holdings=idx>=0
            ?hs.map((h,i)=>i===idx?{...h,amount:Math.round((Number(h.amount)+cost)*1e8)/1e8}:h)
            :[...hs,{currency:cur,amount:cost,id:genId()}];
          return{...acc,holdings};
        } else if(trade.type==='sell'){
          // 撤销卖出 → 从账户扣回收款
          let rem=cost;
          const holdings=hs.map(h=>{
            const hAmt=Number(h.amount)||0;
            if(h.currency!==cur||rem<=0)return{...h,amount:hAmt};
            const take=Math.min(hAmt,rem);rem-=take;
            return{...h,amount:Math.round((hAmt-take)*1e8)/1e8};
          });
          return{...acc,holdings};
        }
        return acc;
      });
      const next={...prev,investments,accounts};
      saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
      return next;
    });
  };

  // ── 股息 / 分红记录（自动加回关联账户）────────────────
  const addDividend=(invId,dividend)=>{
    const inv=data.investments.find(i=>i.id===invId);
    if(!inv)return;
    const amount=Math.round(Number(dividend.amount)*1e8)/1e8;
    const accId=inv.accountId;
    const cur=inv.currency;
    const d={...dividend,id:genId(),ts:Date.now(),amount};
    setData(prev=>{
      const investments=prev.investments.map(i=>{
        if(i.id!==invId)return i;
        return{...i,dividends:[...(i.dividends||[]),d]};
      });
      const accounts=prev.accounts.map(acc=>{
        if(!accId||String(acc.id)!==String(accId))return acc;
        const hs=acc.holdings||[];
        const idx=hs.findIndex(h=>h.currency===cur);
        const holdings=idx>=0
          ?hs.map((h,i)=>i===idx?{...h,amount:Math.round((Number(h.amount)+amount)*1e8)/1e8}:h)
          :[...hs,{currency:cur,amount,id:genId()}];
        return{...acc,holdings};
      });
      const next={...prev,investments,accounts};
      saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
      return next;
    });
  };
  const deleteDividend=(invId,dividendId)=>{
    const inv=data.investments.find(i=>i.id===invId);
    if(!inv)return;
    const div=(inv.dividends||[]).find(d=>d.id===dividendId);
    if(!div)return;
    if(!confirm('确认删除此分红记录？将同步撤销账户余额变动。'))return;
    const amount=Math.round(Number(div.amount)*1e8)/1e8;
    const accId=inv.accountId;
    const cur=inv.currency;
    setData(prev=>{
      const investments=prev.investments.map(i=>{
        if(i.id!==invId)return i;
        return{...i,dividends:(i.dividends||[]).filter(d=>d.id!==dividendId)};
      });
      const accounts=prev.accounts.map(acc=>{
        if(!accId||String(acc.id)!==String(accId))return acc;
        const hs=acc.holdings||[];
        let rem=amount;
        const holdings=hs.map(h=>{
          const hAmt=Number(h.amount)||0;
          if(h.currency!==cur||rem<=0)return{...h,amount:hAmt};
          const take=Math.min(hAmt,rem);rem-=take;
          return{...h,amount:Math.round((hAmt-take)*1e8)/1e8};
        });
        return{...acc,holdings};
      });
      const next={...prev,investments,accounts};
      saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
      return next;
    });
  };

  // ── 固定收益到期结算 ──────────────────────────────────
  const settleFixedInvestment=(invId)=>{
    const inv=data.investments.find(i=>i.id===invId);
    if(!inv)return;
    const fr=calcFixedReturn(inv);
    if(!fr)return;
    const total=Math.round((fr.principal+fr.totalReturn)*1e8)/1e8;
    const accId=inv.accountId;
    const cur=inv.currency;
    if(!confirm(`确认到期结算？将把本金 ${CUR_SYM[cur]||''}${fmtNum(fr.principal)} + 利息 ${CUR_SYM[cur]||''}${fmtNum(fr.totalReturn)} 共 ${CUR_SYM[cur]||''}${fmtNum(total)} 转入关联账户。`))return;
    setData(prev=>{
      const investments=prev.investments.map(i=>{
        if(i.id!==invId)return i;
        return{...i,settled:true,settledDate:new Date().toISOString().slice(0,10),settledAmount:total};
      });
      const accounts=prev.accounts.map(acc=>{
        if(!accId||String(acc.id)!==String(accId))return acc;
        const hs=acc.holdings||[];
        const idx=hs.findIndex(h=>h.currency===cur);
        const holdings=idx>=0
          ?hs.map((h,i)=>i===idx?{...h,amount:Math.round((Number(h.amount)+total)*1e8)/1e8}:h)
          :[...hs,{currency:cur,amount:total,id:genId()}];
        return{...acc,holdings};
      });
      const next={...prev,investments,accounts};
      saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
      return next;
    });
  };

  // ── 汇率操作 ──────────────────────────────────────────
  const addFx=fx=>mut({fxHistory:[{...fx,id:genId(),ts:Date.now()},...data.fxHistory]});
  const deleteFx=id=>mut({fxHistory:data.fxHistory.filter(f=>f.id!==id)});

  // ── 转账操作 ──────────────────────────────────────────
  const addTransfer=transfer=>{
    const{fromAccountId,toAccountId,currency,amount}=transfer;
    const amt=Number(amount);
    setData(prev=>{
      const newAccounts=prev.accounts.map(acc=>{
        // 用 String() 比较，防止 id 类型不一致（数字 vs 字符串）
        if(String(acc.id)===String(fromAccountId)){
          let rem=amt;
          const holdings=(acc.holdings||[]).map(h=>{
            const hAmt=Number(h.amount)||0;
            if(h.currency!==currency||rem<=0)return{...h,amount:hAmt};
            const take=Math.min(hAmt,rem);rem-=take;
            // 保留 0 余额持仓（不过滤），让用户在账户页能看到扣减结果
            return{...h,amount:Math.round((hAmt-take)*1e8)/1e8};
          });
          return{...acc,holdings};
        }
        if(String(acc.id)===String(toAccountId)){
          const hs=acc.holdings||[];
          const idx=hs.findIndex(h=>h.currency===currency);
          const holdings=idx>=0
            ?hs.map((h,i)=>i===idx?{...h,amount:Math.round((Number(h.amount)+amt)*1e8)/1e8}:h)
            :[...hs,{currency,amount:amt,id:genId()}];
          return{...acc,holdings};
        }
        return acc;
      });
      const next={...prev,accounts:newAccounts,transfers:[{...transfer,id:genId(),ts:Date.now()},...(prev.transfers||[])]};
      saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
      return next;
    });
  };
  const deleteTransfer=id=>{
    const tx=(data.transfers||[]).find(t=>t.id===id);
    if(!tx)return;
    if(!confirm('确认删除此转账记录？将同步撤销账户余额变动。'))return;
    const{fromAccountId,toAccountId,currency,amount}=tx;
    const amt=Number(amount);
    setData(prev=>{
      const newAccounts=prev.accounts.map(acc=>{
        if(String(acc.id)===String(fromAccountId)){
          const hs=acc.holdings||[];
          const idx=hs.findIndex(h=>h.currency===currency);
          const holdings=idx>=0
            ?hs.map((h,i)=>i===idx?{...h,amount:Math.round((Number(h.amount)+amt)*1e8)/1e8}:h)
            :[...hs,{currency,amount:amt,id:genId()}];
          return{...acc,holdings};
        }
        if(String(acc.id)===String(toAccountId)){
          let rem=amt;
          const holdings=(acc.holdings||[]).map(h=>{
            const hAmt=Number(h.amount)||0;
            if(h.currency!==currency||rem<=0)return{...h,amount:hAmt};
            const take=Math.min(hAmt,rem);rem-=take;
            return{...h,amount:Math.round((hAmt-take)*1e8)/1e8};
          }).filter(h=>h.amount>1e-9);
          return{...acc,holdings};
        }
        return acc;
      });
      const next={...prev,accounts:newAccounts,transfers:(prev.transfers||[]).filter(t=>t.id!==id)};
      saveData(next);setSaved(true);setTimeout(()=>setSaved(false),1500);
      return next;
    });
  };

  // ── 净资产快照操作 ────────────────────────────────────
  const addSnapshot=(amount,currency)=>{
    if(amount===null)return;
    mut({snapshots:[{id:genId(),ts:Date.now(),date:new Date().toISOString().slice(0,10),amount,currency},...(data.snapshots||[])]});
  };
  const deleteSnapshot=id=>mut({snapshots:(data.snapshots||[]).filter(s=>s.id!==id)});

  // ── 导入导出 ──────────────────────────────────────────
  const exportData=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='私人账本_'+new Date().toISOString().slice(0,10)+'.json';
    a.click();URL.revokeObjectURL(url);
    setLastBackup();setShowBanner(false);
  };
  const importData=(file,onResult)=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const p=JSON.parse(ev.target.result);
        if(Array.isArray(p.accounts)){const d={...EMPTY,...p};setData(d);saveData(d);onResult({ok:true,msg:'导入成功！数据已恢复。'});}
        else onResult({ok:false,msg:'格式不正确，请选择正确的备份文件。'});
      }catch{onResult({ok:false,msg:'解析失败，文件可能已损坏。'});}
    };
    reader.readAsText(file);
  };

  // ── 汇率计算 ──────────────────────────────────────────
  const getRate=cur=>cur===baseCur?1:(rates[cur]||null);

  // 单项投资的当前市值（本币）
  const getInvValue=inv=>{
    if((inv.category||'variable')==='fixed'){
      const fr=calcFixedReturn(inv);
      return fr?fr.principal+fr.accrued:Number(inv.buyPrice)*Number(inv.quantity||1);
    }
    const price=inv.currentPrice!=null?Number(inv.currentPrice):Number(inv.buyPrice);
    return price*Number(inv.quantity||0);
  };

  // 账户汇总：存款 + 关联投资 - 负债
  const totals=useMemo(()=>data.accounts.map(acc=>{
    let assetTotal=0,liabTotal=0,invTotal=0,ok=true;
    // 跳过 0 余额持仓（转账后保留的零持仓），避免因此需要加载多余汇率
    (acc.holdings||[]).forEach(h=>{if(!Number(h.amount))return;const r=getRate(h.currency);if(r==null){ok=false;return;}assetTotal+=Number(h.amount)*r;});
    (acc.liabilities||[]).forEach(l=>{const r=getRate(l.currency);if(r==null){ok=false;return;}liabTotal+=calcRemainingPrincipal(l)*r;});
    data.investments.filter(inv=>inv.accountId===acc.id).forEach(inv=>{
      const r=getRate(inv.currency);if(r==null){ok=false;return;}
      invTotal+=getInvValue(inv)*r;
    });
    const total=ok?assetTotal+invTotal-liabTotal:null;
    return{...acc,assetTotal:ok?assetTotal+invTotal:null,bankAsset:ok?assetTotal:null,invAsset:ok?invTotal:null,liabTotal:ok?liabTotal:null,total};
  }),[data.accounts,data.investments,rates,baseCur]);

  // 未关联账户的投资
  const unlinkedInvTotal=useMemo(()=>{
    let sum=0,ok=true;
    data.investments.filter(inv=>!inv.accountId).forEach(inv=>{
      const r=getRate(inv.currency);if(r==null){ok=false;return;}
      sum+=getInvValue(inv)*r;
    });
    return ok?sum:null;
  },[data.investments,rates,baseCur]);

  const grandTotal=useMemo(()=>{
    if(!totals.every(a=>a.total!==null))return null;
    const base=totals.reduce((s,a)=>s+(a.total||0),0);
    return unlinkedInvTotal!==null?base+unlinkedInvTotal:base;
  },[totals,unlinkedInvTotal]);
  const grandAsset=useMemo(()=>{
    if(!totals.every(a=>a.assetTotal!==null))return null;
    const base=totals.reduce((s,a)=>s+(a.assetTotal||0),0);
    return unlinkedInvTotal!==null?base+unlinkedInvTotal:base;
  },[totals,unlinkedInvTotal]);
  const grandLiab=useMemo(()=>totals.every(a=>a.liabTotal!==null)?totals.reduce((s,a)=>s+(a.liabTotal||0),0):null,[totals]);

  // 需要汇率的货币（含投资货币）
  const portfolioCurrencies=useMemo(()=>{
    const s=new Set();
    data.accounts.forEach(a=>{
      // 跳过 0 余额持仓，避免因此触发无意义的汇率加载
      (a.holdings||[]).forEach(h=>{if(Number(h.amount)>0)s.add(h.currency);});
      (a.liabilities||[]).forEach(l=>s.add(l.currency));
    });
    data.investments.forEach(inv=>s.add(inv.currency));
    return Array.from(s);
  },[data.accounts,data.investments]);

  const sp={data,saveAccount,deleteAccount,saveHolding,deleteHolding,saveLiability,deleteLiability,savePayment,deletePayment,saveInvestment,deleteInvestment,addInvestmentNote,deleteInvestmentNote,addTrade,deleteTrade,addDividend,deleteDividend,settleFixedInvestment,addFx,deleteFx,addTransfer,deleteTransfer,addSnapshot,deleteSnapshot};

  return html`
    <div className="app">
      <header className="hdr">
        <div className="logo">
          <div className="logo-gem"/>私人账本
          ${getUsername()&&html`<span className="txs tm" style=${{marginLeft:10,fontWeight:400,letterSpacing:0}}>· ${getUsername()}</span>`}
        </div>
        <div className="fc g12">
          ${saved&&html`<div className="fc g4 txs" style=${{color:'var(--ok)'}}><span className="saved-dot"/>已保存</div>`}
          <nav className="hnav">
            ${TABS.map(t=>html`<button key=${t.id} className=${'hnav-btn '+(tab===t.id?'on':'')} onClick=${()=>setTab(t.id)}>${t.ico} ${t.label}</button>`)}
          </nav>
        </div>
      </header>
      ${showBanner&&html`
        <div style=${{background:'rgba(201,160,67,.08)',borderBottom:'1px solid rgba(201,160,67,.2)',padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div className="fc g8"><span>📥</span><span className="ts" style=${{color:'var(--gold)'}}>本月尚未备份数据</span>${getLastBackup()&&html`<span className="txs tm">（上次：${new Date(Number(getLastBackup())).toLocaleDateString('zh-CN')}）</span>`}</div>
          <div className="fc g8">
            <button className="btn btn-gold btn-sm" onClick=${exportData}>立即备份</button>
            <button className="btn btn-ghost btn-xs" onClick=${()=>setShowBanner(false)}>稍后</button>
          </div>
        </div>
      `}
      <main className="main">
        ${tab==='overview'&&html`<${Overview} ...${sp} totals=${totals} grandTotal=${grandTotal} grandAsset=${grandAsset} grandLiab=${grandLiab} unlinkedInvTotal=${unlinkedInvTotal} baseCur=${baseCur} setBaseCur=${c=>{setBaseCur(c);setRates({});}} rates=${rates} setRates=${setRates} portfolioCurrencies=${portfolioCurrencies}/>`}
        ${tab==='accounts'&&html`<${AccountsPage} ...${sp} totals=${totals} baseCur=${baseCur}/>`}
        ${tab==='investments'&&html`<${InvestmentsPage} ...${sp}/>`}
        ${tab==='fx'&&html`<${FxPage} ...${sp}/>`}
        ${tab==='transfer'&&html`<${TransferPage} data=${data} addTransfer=${addTransfer} deleteTransfer=${deleteTransfer}/>`}
        ${tab==='data'&&html`<${DataPage} data=${data} setData=${d=>{setData(d);saveData(d);}} exportData=${exportData} importFile=${importData} loadDemo=${()=>{setData(DEMO);saveData(DEMO);}}/>`}
      </main>
      <nav className="bnav"><div className="bnav-inner">
        ${TABS.map(t=>html`<button key=${t.id} className=${'bnav-btn '+(tab===t.id?'on':'')} onClick=${()=>setTab(t.id)}><span className="bnav-ico">${t.ico}</span><span>${t.label}</span></button>`)}
      </div></nav>
    </div>
  `;
}

// ── 根组件 ────────────────────────────────────────────────
function Root(){
  const [phase,setPhase]=useState('lock'); // always open login/lock screen first
  useEffect(()=>{const el=document.getElementById('app-boot');if(el)el.style.display='none';},[]);
  if(phase==='lock')return html`<${LockScreen} onUnlock=${()=>setPhase('app')}/>`;
  return html`<${App}/>`;
}

// ── 错误边界 ──────────────────────────────────────────────
class ErrBoundary extends Component{
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  render(){
    if(this.state.err){
      const el=document.getElementById('app-boot');
      if(el){el.style.display='flex';document.getElementById('load-msg').innerHTML='<span style="color:#F08080">❌ 渲染错误: '+this.state.err.message+'</span><br><span style="color:#6E7A90;font-size:11px">按 F12 查看详细日志</span>';}
      return null;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  html`<${ErrBoundary}><${Root}/></${ErrBoundary}>`
);
