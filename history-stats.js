/* Local, read-only statistics. A record is a saved setting, not a riding day. */
const HistoryStats = (() => {
  const text = value => typeof value === 'string' ? value.trim() : '';
  const number = value => ['string','number'].includes(typeof value) && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  const anglePair = item => {
    const left = number(item.leftAngle), right = number(item.rightAngle);
    return left === null || right === null ? null : `${left}° / ${right}°`;
  };
  const width = item => {const n=number(item.stanceWidth);return n !== null && n > 0 ? `${n} cm` : null;};
  const add = (map,label) => {if(label !== null)map.set(label,(map.get(label)||0)+1);};
  const rank = map => [...map].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'ja'));
  function summarize(items) {
    const records = Array.isArray(items) ? items.filter(item=>item && typeof item==='object' && !Array.isArray(item)) : [];
    const boards=new Map(),angles=new Map(),widths=new Map(),snow=new Map(),stance=new Map();
    const stances={duck:'ダック',forward:'前振り',back:'後振り'};
    let favorites=0;
    for(const item of records){
      const name=text(item.board),pair=anglePair(item),span=width(item);
      if(!boards.has(name))boards.set(name,{name,count:0,angles:new Map(),widths:new Map()});
      const board=boards.get(name);board.count++;add(board.angles,pair);add(board.widths,span);
      add(angles,pair);add(widths,span);add(snow,text(item.snow)||'雪質未入力');
      add(stance,Object.hasOwn(stances,item.stance)?stances[item.stance]:'スタンス未設定');
      if(item.favorite === true)favorites++;
    }
    return {total:records.length,boardCount:[...boards.keys()].filter(Boolean).length,favorites,
      boards:[...boards.values()].map(b=>({...b,angles:rank(b.angles),widths:rank(b.widths)})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ja')),
      angles:rank(angles),widths:rank(widths),snow:rank(snow),stance:rank(stance)};
  }
  const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ranking(rows,limit=5){
    if(!rows.length)return '<p class="stats-note">集計できる入力がありません。</p>';
    return `<ol class="stats-ranking">${rows.slice(0,limit).map(row=>`<li><span>${escape(row.label)}</span><b>${row.count}<small>件</small></b></li>`).join('')}</ol>`;
  }
  function bars(rows,total){
    return `<ul class="stats-bars">${rows.map(row=>`<li><div><span>${escape(row.label)}</span><b>${row.count}件 <small>(${total?Math.round(row.count/total*100):0}%)</small></b></div><span class="stats-bar" aria-hidden="true"><i style="width:${total?row.count/total*100:0}%"></i></span></li>`).join('')}</ul>`;
  }
  function popular(rows){
    if(!rows.length)return '入力なし';
    const first=rows[0],tied=rows.filter(row=>row.count===first.count).length;
    return `${escape(first.label)} <small>(${first.count}件${tied>1?`・ほか同数${tied-1}設定`:''})</small>`;
  }
  function markup(s){
    if(!s.total)return '<p class="stats-empty">まだ保存履歴がありません。記録を保存すると統計を表示できます。</p>';
    return `<div class="stats-totals"><div><span>記録数</span><strong>${s.total}<small>件</small></strong></div><div><span>板の数</span><strong>${s.boardCount}<small>種類</small></strong></div><div><span>お気に入り</span><strong>${s.favorites}<small>件</small></strong></div></div>
      <section class="stats-section"><h3>板ごとの記録と設定</h3><p class="stats-note">件数順。各板で多く記録した設定を表示します。</p><div class="stats-boards">${s.boards.map(board=>`<article><header><h4>${escape(board.name||'板名未入力')}</h4><b>${board.count}<small>件</small></b></header><dl><div><dt>角度 左 / 右</dt><dd>${popular(board.angles)}</dd></div><div><dt>スタンス幅</dt><dd>${popular(board.widths)}</dd></div></dl></article>`).join('')}</div></section>
      <div class="stats-setting-grid"><section class="stats-section"><h3>よく記録した角度</h3><p class="stats-note">左足 / 右足・上位5設定</p>${ranking(s.angles)}</section><section class="stats-section"><h3>よく記録した幅</h3><p class="stats-note">上位5設定</p>${ranking(s.widths)}</section></div>
      <section class="stats-section"><h3>スタンスの割合</h3>${bars(s.stance,s.total)}</section><section class="stats-section"><h3>雪質の割合</h3>${bars(s.snow,s.total)}</section>
      <p class="stats-note">すべての保存履歴を、画面の絞り込みに関係なく集計します。角度は左右両方、幅は正の数値が入った記録だけが対象です。板名未入力は板の数に含めません。</p>`;
  }
  const byId=id=>document.getElementById(id),dialog=byId('historyStatsDialog');
  function draw(){
    try{
      const raw=localStorage.getItem(KEY),items=JSON.parse(raw===null?'[]':raw);
      if(!Array.isArray(items))throw new Error('Invalid history');
      byId('historyStatsContent').innerHTML=markup(summarize(items));
    }catch{byId('historyStatsContent').textContent='保存履歴を読み込めませんでした。履歴は変更していません。';}
  }
  function open(){byId('menuCloseBtn')?.click();draw();dialog.showModal();dialog.scrollTop=0;}
  byId('openHistoryStats')?.addEventListener('click',open);
  byId('closeHistoryStats')?.addEventListener('click',()=>dialog.close());
  byId('refreshHistoryStats')?.addEventListener('click',draw);
  dialog?.addEventListener('close',()=>byId('menuBtn')?.focus());
  return {summarize,markup,open,draw};
})();
