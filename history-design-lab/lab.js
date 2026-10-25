'use strict';
/* Standalone design lab. Fictional fixtures only; no app scripts, storage or network. */
const HistoryLab = (() => {
  const variants = {
    summary: {name:'カード',tag:'要点を表示・詳細は開く',description:'1件を1枚のセッティングカードに。角度と幅をまとめ、細かな調整は必要なときだけ。',tip:'設定を1枚ずつ探すなら。',tradeoff:'ディスク・ヒールカップ・板の形状は「調整の詳細」を開いて確認。'},
    matrix: {name:'詳細一覧',tag:'詳細を常時表示',description:'左右の値を同じ行に。角度からヒールカップまで、詳細を閉じずに確認。',tip:'セッティングを合わせる場面に。',tradeoff:'詳細を常時表示するため、1件の高さは大きめ。'},
    grouped: {name:'板ごとの履歴',tag:'変化をたどる',description:'同じ板の記録をひとまとめに。前回の設定と、何を変えたかを探す。',tip:'複数の板・調整の経過を管理するなら。',tradeoff:'板をまたいだ全体の日付順にはならない。'}
  };
  const choices={shape:{twin:'ツイン',directionalTwin:'ディレクショナルツイン',directional:'ディレクショナル',other:'その他'},nose:{round:'ラウンド',hammer:'ハンマーヘッド',semiHammer:'セミハンマー',other:'その他'},bend:{camber:'キャンバー',rocker:'ロッカー',flat:'フラット',hybrid:'ハイブリッド',other:'その他'},diskType:{holes:'穴位置式',slots:'長穴スライド式',mixed:'穴と長穴の併用',other:'その他・不明'},origin:{near:'手前から',far:'奥から'}};
  const records=[
    {id:'sample-1',board:'ALPINE 156',dateTime:'2026-02-18T10:30:00+09:00',snow:'圧雪',leftAngle:'18',rightAngle:'-6',stance:'duck',stanceWidth:'53',favorite:true,holes:{left:[1,3,7,9],right:[2,4,8,10]},reference:{left:2,right:3},comment:'朝イチの圧雪。前より切り返しがスムーズ。',detail:{shape:'directionalTwin',nose:'round',bend:'camber',bindingName:'DEMO BINDING / M',forwardLeanLeft:'F2',forwardLeanRight:'F1',setback:{basis:'reference',direction:'tail',mm:'10'},diskShift:{left:{type:'slots',longitudinal:{direction:'tail',mm:'3'},lateral:{direction:'toe',mm:'2'}},right:{type:'slots',longitudinal:{direction:'nose',mm:'0'},lateral:{direction:'heel',mm:'1'}}},heelcup:{left:{inner:'0',outer:'1',origin:'near'},right:{inner:'A',outer:'B',origin:'far'}},note:'ヒールカップの基準は左右で異なる。目盛りの向きに注意。'}},
    {id:'sample-2',board:'ALPINE 156',dateTime:'2026-02-16T14:45:00+09:00',snow:'圧雪',leftAngle:'15',rightAngle:'-6',stance:'duck',stanceWidth:'54',favorite:false,holes:{left:[0,2,6,8],right:[2,4,8,10]},reference:{left:2,right:3},comment:'少し幅が広く感じた。次は53cmで試す。',detail:{shape:'directionalTwin',nose:'round',bend:'camber',bindingName:'DEMO BINDING / M',forwardLeanLeft:'F1',forwardLeanRight:'F1',setback:{basis:'reference',direction:'tail',mm:'10'},diskShift:{left:{type:'holes',longitudinal:{direction:'nose',mm:'0'}},right:{type:'holes',longitudinal:{direction:'nose',mm:'0'}}},heelcup:{left:{inner:'0',outer:'0',origin:'near'},right:{inner:'0',outer:'0',origin:'near'}}}},
    {id:'sample-3',board:'HAMMER 160',dateTime:'2026-02-17T09:10:00+09:00',snow:'アイス',leftAngle:'36',rightAngle:'21',stance:'forward',stanceWidth:'50.5',favorite:false,holes:{left:[1,3,7,9],right:[1,3,7,9]},reference:{left:null,right:null},comment:'板に推奨マークなし。中心からのセットバックを記録。',detail:{shape:'directional',nose:'hammer',bend:'camber',bindingName:'DEMO CARVE / L',forwardLeanLeft:'2段目',forwardLeanRight:'1段目',setback:{basis:'center',direction:'tail',mm:'20'},diskShift:{left:{type:'mixed',longitudinal:{direction:'nose',mm:'2'}},right:{type:'mixed',longitudinal:{direction:'tail',mm:'2'}}},heelcup:{left:{inner:'1',outer:'1',origin:'near'},right:{inner:'2',outer:'2',origin:'near'}}}},
    {id:'sample-4',board:'TWIN 148',dateTime:'2026-02-10T12:00:00+09:00',snow:'春雪',leftAngle:'12',rightAngle:'-12',stance:'duck',stanceWidth:'49',favorite:false,holes:{left:[1,3,7,9],right:[1,3,7,9]},reference:{left:2,right:2},disk:{left:'中',right:'中'},comment:'以前の記録。詳細項目は未入力。'}
  ];
  const edges=[
    {id:'edge-1',board:'長い板名のサンプル / LIMITED EDITION 2026 / 158W',dateTime:'2026-02-19T08:05:00+09:00',snow:'パウダー',leftAngle:'0',rightAngle:'',stanceWidth:'0',favorite:false,holes:{left:[0,5,6,11],right:[]},reference:{left:0,right:null},comment:'長いメモや改行も折り返して表示。\nこれは架空のデータで、実際のセッティングの推奨ではありません。',detail:{bindingName:'LONG_BINDING_MODEL_NAME_ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789 / サイズM',forwardLeanLeft:'0',setback:{basis:'reference',direction:'tail',mm:'0'},diskShift:{left:{type:'other',longitudinal:{direction:'',mm:'3'},lateral:{direction:'',mm:'2'}}},heelcup:{left:{inner:'0',outer:'LONG_SCALE_LABEL_WITHOUT_SPACES_123456789',origin:'far'},right:{recorded:true}},note:'記録値の0と、入力していない項目は区別。'}},
    {id:'edge-2',board:'',dateTime:'',leftAngle:'',rightAngle:null,stanceWidth:'',holes:[],reference:{left:null,right:null},comment:'日付も板名も未入力の古い記録。'},
    {id:'edge-3',board:'<script>alert("sample")</script>',dateTime:'invalid-date',leftAngle:'-3',rightAngle:'0',favorite:true,holes:{left:[],right:[]},detail:{shape:'other',heelcup:{left:{origin:'near'},right:{inner:'0',outer:'0'}}},comment:'記号を含む板名も文字として表示。'}
  ];
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const has=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
  const boardName=r=>has(r.board)?String(r.board):'板名なし';
  const amount=v=>has(v)&&Number.isFinite(Number(v))?String(v):'';
  const angle=v=>amount(v)===''?'未入力':`${amount(v)}°`;
  const width=v=>amount(v)===''?'未入力':`${amount(v)} cm`;
  const stance=v=>({duck:'ダック',forward:'前振り',back:'後振り'})[v]||'スタンス未入力';
  const date=r=>{const d=new Date(r.dateTime);return !r.dateTime||!Number.isFinite(d.getTime())?'日時未入力':new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);};
  const timestamp=r=>Number.isFinite(Date.parse(r.dateTime))?Date.parse(r.dateTime):-Infinity;
  const ordered=items=>items.map((r,i)=>({r,i})).sort((a,b)=>timestamp(b.r)-timestamp(a.r)||a.i-b.i).map(x=>x.r);
  const detail=r=>r.detail&&typeof r.detail==='object'?r.detail:{};
  function signed(axis){if(!axis||amount(axis.mm)==='')return '未入力';if(Number(axis.mm)===0)return '0 mm';return `${axis.direction==='tail'?'−':axis.direction==='nose'?'＋':''}${axis.mm} mm${!['tail','nose'].includes(axis.direction)?'（方向未設定）':''}`;}
  function lateral(axis){if(!axis||amount(axis.mm)==='')return '未入力';if(Number(axis.mm)===0)return '0 mm';return `${({toe:'つま先',heel:'かかと'})[axis.direction]||'方向未設定'} ${axis.mm} mm`;}
  function setback(r){const s=detail(r).setback;if(!s||amount(s.mm)==='')return '未入力';return `${({reference:'推奨位置',center:'中心'})[s.basis]||'基準未設定'}から ${signed(s)}`;}
  function settingRows(r,mode='detail'){
    const d=detail(r),row=(label,fn)=>[label,fn('left'),fn('right')];
    if(mode==='simple')return [row('角度',s=>angle(r[`${s}Angle`])),row('ディスク',s=>r.disk?.[s]||'未入力')];
    return [row('角度',s=>angle(r[`${s}Angle`])),row('リーン',s=>d[`forwardLean${s==='left'?'Left':'Right'}`]||'未入力'),row('ディスク形式',s=>choices.diskType[d.diskShift?.[s]?.type]||'未入力'),row('前後ずらし',s=>signed(d.diskShift?.[s]?.longitudinal)),row('横ずらし',s=>lateral(d.diskShift?.[s]?.lateral)),row('ヒールカップ\n内側 / 外側',s=>{const h=d.heelcup?.[s];return `${has(h?.inner)?h.inner:'未入力'} / ${has(h?.outer)?h.outer:'未入力'}${h?.recorded&&!has(h.inner)&&!has(h.outer)?'（旧記録・目盛りなし）':''}`;}),row('数える基準',s=>choices.origin[d.heelcup?.[s]?.origin]||'未入力')];
  }
  function table(r,mode='detail',includeAngles=true){return `<table class="settings"><caption>左右の設定${mode==='simple'?'':'・記録値'}</caption><thead><tr><th scope="col">項目</th><th scope="col">左足</th><th scope="col">右足</th></tr></thead><tbody>${settingRows(r,mode).filter((_,i)=>includeAngles||i!==0).map(([k,l,v],i)=>`<tr><th scope="row">${escape(k)}</th><td${includeAngles&&i===0?' class="table-angle"':''}>${escape(l)}</td><td${includeAngles&&i===0?' class="table-angle"':''}>${escape(v)}</td></tr>`).join('')}</tbody></table>`;}
  function mini(r){return `<div class="mini-pair">${['left','right'].map((s,j)=>{
    const label=j?'右足':'左足',h=Array.isArray(r.holes)?r.holes.slice(j*12,j*12+12).flatMap((v,i)=>v?[i]:[]):(r.holes?.[s]||[]),ref=r.reference?.[s],validRef=Number.isInteger(ref)&&ref>=0&&ref<6;
    const row=start=>`<div class="hole-row" aria-hidden="true">${Array.from({length:6},(_,i)=>`<span class="hole${h.includes(start+i)?' on':''}"></span>`).join('')}</div>`;
    return `<div class="mini" role="img" aria-label="${label}。ビス穴${h.length?'：'+h.map(i=>`${i<6?'上':'下'}段${i%6+1}`).join('、'):'未入力'}。推奨位置${validRef?'：'+(ref+1):'未入力'}"><div class="mini-label">${label}・ビス穴</div>${row(0)}<div class="refs" aria-hidden="true">${Array.from({length:6},(_,i)=>`<span class="ref${validRef&&i===ref?' on':''}">×</span>`).join('')}</div>${row(6)}<div class="hole-note">推奨位置${validRef?' 記録あり':' 未入力'}</div></div>`;
  }).join('')}</div>`;}
  const shapes=r=>{const d=detail(r),values=['shape','nose','bend'].map(k=>choices[k][d[k]]).filter(Boolean);return values.length?`<div class="shapes">${values.map(v=>`<span>${escape(v)}</span>`).join('')}</div>`:'';};
  const gear=r=>`<div class="gear" role="group" aria-label="ビンディング"><span class="value">${escape(detail(r).bindingName||'未入力')}</span></div>`;
  const notes=r=>`${has(r.comment)?`<p class="comment"><span class="memo-label">滑走メモ</span>${escape(r.comment)}</p>`:''}`;
  const detailNotes=r=>`${detail(r).boardNote?`<p class="comment"><span class="memo-label">板の形状メモ</span>${escape(detail(r).boardNote)}</p>`:''}${detail(r).note?`<p class="comment"><span class="memo-label">ギア調整メモ</span>${escape(detail(r).note)}</p>`:''}`;
  function metrics(r,mode){return `<div class="metrics"><span class="stance">${escape(stance(r.stance))}</span><span class="width">${amount(r.stanceWidth)===''?'<span class="missing">幅 未入力</span>':`${escape(r.stanceWidth)}<small>cm</small>`}</span></div>${mode==='detail'?`<p class="setback">セットバック ${escape(setback(r))}</p>`:''}`;}
  function favorite(r){return `<button type="button" class="favorite icon-button" data-favorite="${escape(r.id)}" aria-label="${escape(boardName(r))} ${escape(date(r))} ${r.favorite?'お気に入り解除':'お気に入り登録'}" aria-pressed="${!!r.favorite}"><span aria-hidden="true">${r.favorite?'★':'☆'}</span></button>`;}
  function heading(r,extraClass=''){return `<header class="record-head${extraClass?' '+escape(extraClass):''}"><div class="record-heading"><p class="record-date">${escape(date(r))}</p><h3>${escape(boardName(r))}</h3><p class="meta">${escape(r.snow||'雪質未入力')}</p></div>${favorite(r)}</header>`;}
  function action(r){return `<div class="record-actions"><button class="primary" type="button" data-preview="${escape(r.id)}">この設定を確認<span class="visually-hidden">：${escape(boardName(r))} ${escape(date(r))}</span></button></div>`;}
  function angles(r,mode){return `<div class="angles">${['left','right'].map((s,i)=>`<div class="angle"><div class="angle-label"><span>${i?'右足':'左足'}</span>${mode==='detail'?`<span class="lean">リーン ${escape(detail(r)[i?'forwardLeanRight':'forwardLeanLeft']||'未入力')}</span>`:''}</div><strong class="${amount(r[s+'Angle'])===''?'missing':''}">${escape(angle(r[s+'Angle']))}</strong>${mode==='simple'?`<span class="setback">ディスク ${escape(r.disk?.[s]||'未入力')}</span>`:''}</div>`).join('')}</div>`;}
  function summary(r,mode){
    const stats=['left','right'].map((side,i)=>`<div class="card-stat"><span class="card-stat-label">${i?'右足':'左足'}</span><strong class="${amount(r[side+'Angle'])===''?'missing':''}">${escape(angle(r[side+'Angle']))}</strong><span class="card-stat-note">${mode==='detail'?'リーン '+escape(detail(r)[i?'forwardLeanRight':'forwardLeanLeft']||'未入力'):'ディスク '+escape(r.disk?.[side]||'未入力')}</span></div>`).join('');
    return `<article class="record summary-card" data-record="${escape(r.id)}">
      ${heading(r,'card-top')}
      <div class="card-body"><div class="card-stats" role="group" aria-label="角度とスタンス幅">${stats}<div class="card-stat card-stat-width"><span class="card-stat-label">幅（cm）</span><strong class="${amount(r.stanceWidth)===''?'missing':''}">${escape(amount(r.stanceWidth)===''?'未入力':r.stanceWidth)}</strong><span class="card-stat-note">スタンス幅</span></div></div>
      <div class="card-stance"><span class="stance">${escape(stance(r.stance))}</span>${mode==='detail'?`<span class="setback">${escape(setback(r)==='未入力'?'セットバック未入力':setback(r))}</span>`:''}</div>${mode==='detail'?gear(r):''}${notes(r)}</div>
      <div class="card-bottom"><details class="details"><summary><span>調整の詳細</span><span class="summary-hint">${mode==='detail'?'ディスク・ヒールカップなど':'ビス穴・推奨位置'}</span></summary>${mode==='detail'?shapes(r)+table(r,mode,false)+detailNotes(r):''}${mini(r)}</details>${action(r)}</div>
    </article>`;
  }
  function matrix(r,mode){return `<article class="record matrix-card" data-record="${escape(r.id)}">${heading(r)}${mode==='detail'?shapes(r)+gear(r):''}${metrics(r,mode)}${table(r,mode)}${mini(r)}${notes(r)}${mode==='detail'?detailNotes(r):''}${action(r)}</article>`;}
  function groups(items){const map=new Map();for(const r of ordered(items)){const key=has(r.board)?r.board.trim():'';if(!map.has(key))map.set(key,[]);map.get(key).push(r);}return Array.from(map.values());}
  function changes(r,old){if(!old)return '表示中では、この板のいちばん古い記録';const keys=[['左角度',angle(r.leftAngle),angle(old.leftAngle)],['右角度',angle(r.rightAngle),angle(old.rightAngle)],['幅',width(r.stanceWidth),width(old.stanceWidth)]];const diff=keys.filter(([,a,b])=>a!==b);return diff.length?'表示中の前の記録から：'+diff.map(([k,a,b])=>`${k} ${b} → ${a}`).join(' / '):'表示中の前の記録と角度・幅は同じ';}
  function grouped(items,mode){return groups(items).map(group=>`<section class="group"><header class="group-header"><span class="eyebrow">BOARD HISTORY</span><h3>${escape(boardName(group[0]))}</h3><p>${group.length}件 · 新しい順</p></header><ol class="timeline">${group.map((r,i)=>`<li data-record="${escape(r.id)}"><div class="timeline-head"><p class="record-date">${escape(date(r))} · ${escape(r.snow||'雪質未入力')}</p>${favorite(r)}</div><div class="timeline-metrics"><span class="timeline-angles"><small>左</small>${escape(angle(r.leftAngle))}<small>右</small>${escape(angle(r.rightAngle))}</span><span class="width">${escape(width(r.stanceWidth))}</span></div><p class="setback">${escape(stance(r.stance))}${mode==='detail'?' · '+escape(setback(r)):''}</p>${mode==='detail'?`<p class="setback">${escape(detail(r).bindingName||'未入力')}</p>`:''}<p class="change-note">${escape(changes(r,group[i+1]))}</p>${notes(r)}<details class="group-details"><summary>設定をひらく</summary>${mode==='detail'?shapes(r):''}${table(r,mode)}${mini(r)}${mode==='detail'?detailNotes(r):''}${action(r)}</details></li>`).join('')}</ol></section>`).join('');}
  const match=(r,query)=>[r.board,r.comment,r.snow,detail(r).bindingName].filter(has).join(' ').normalize('NFKC').toLocaleLowerCase('ja-JP').includes(query.normalize('NFKC').trim().toLocaleLowerCase('ja-JP'));
  function filtered(items,filter,query){return ordered(items).filter(r=>(filter==='all'||filter==='fav'&&r.favorite||filter==='board:'+boardName(r))&&match(r,query));}
  return {variants,choices,records,edges,escape,has,boardName,angle,width,date,ordered,signed,lateral,setback,settingRows,table,mini,shapes,gear,notes,detailNotes,metrics,heading,summary,matrix,groups,changes,grouped,filtered};
})();

if(typeof module!=='undefined'&&module.exports)module.exports=HistoryLab;
if(typeof document!=='undefined')(() => {
  const H=HistoryLab,$=id=>document.getElementById(id);
  const state={variant:'summary',mode:'detail',scenario:'normal',filter:'all',query:'',gallery:false};
  const items=()=>state.scenario==='empty'?[]:state.scenario==='edge'?H.edges:H.records;
  const descriptions=Object.entries(H.variants);
  function render(){
    const openDetails=new Set(Array.from(document.querySelectorAll('.study details[open]')).map(el=>el.closest('.study').id+':'+el.closest('[data-record]').dataset.record));
    const base=items(),list=H.filtered(base,state.filter,state.query),names=Array.from(new Set(base.map(H.boardName)));
    const studies=$('studies');studies.classList.toggle('gallery',state.gallery);
    studies.innerHTML=descriptions.map(([key,v])=>`<section class="study" id="panel-${key}"${state.gallery?' role="region"':` role="tabpanel" aria-labelledby="tab-${key}" tabindex="0"`}${!state.gallery&&key!==state.variant?' hidden':''} aria-label="${v.name}"><div class="study-label"><h2>${v.name}</h2><span>${v.tag}</span></div><p class="study-description">${v.description}</p><div class="phone"><header class="app-head"><span class="app-title">スタンスメモ</span><span class="app-subtitle">履歴デザイン案 · ${state.mode==='detail'?'詳細':'シンプル'}表示</span></header><div class="app-section"><h3>保存履歴</h3><span class="count">${list.length} / ${base.length}件</span></div><div class="tools"><label class="visually-hidden" for="search-${key}">板名・ビンディング・メモを検索</label><input class="search" id="search-${key}" type="search" value="${H.escape(state.query)}" placeholder="板名・ビンディング・メモを検索" autocomplete="off"><div class="filter-row" role="group" aria-label="履歴の絞り込み">${[['all','すべて'],['fav','★ お気に入り'],...names.map(n=>['board:'+n,n])].map(([value,label])=>`<button type="button" data-filter="${H.escape(value)}" aria-pressed="${value===state.filter}">${H.escape(label)}</button>`).join('')}</div><p class="result-status" role="status">${state.query?`「${H.escape(state.query)}」の検索結果：${list.length}件`:'架空データ · 新しい順'}</p></div><div class="list">${!list.length?`<div class="empty"><h3>${base.length?'一致する記録がありません':'まだ記録がありません'}</h3><p>${base.length?'検索語や絞り込みを変えてみてください。':'保存した設定がここに並びます。'}</p></div>`:key==='grouped'?H.grouped(list,state.mode):list.map(r=>key==='matrix'?H.matrix(r,state.mode):H.summary(r,state.mode)).join('')}</div></div><p class="study-tip"><strong>${v.tip}</strong><br>${v.tradeoff}</p></section>`).join('');
    document.querySelectorAll('[data-variant]').forEach(b=>{const on=b.dataset.variant===state.variant;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
    document.querySelectorAll('.study details').forEach(el=>{el.open=openDetails.has(el.closest('.study').id+':'+el.closest('[data-record]').dataset.record);});
  }
  function updateSearch(input){const position=input.selectionStart,key=input.id;state.query=input.value;render();const replacement=$(key);replacement.focus({preventScroll:true});replacement.setSelectionRange(position,position);}
  $('studies').addEventListener('input',e=>{if(e.target.matches('.search')&&!e.isComposing)updateSearch(e.target);});
  $('studies').addEventListener('compositionend',e=>{if(e.target.matches('.search'))updateSearch(e.target);});
  $('studies').addEventListener('click',e=>{
    const f=e.target.closest('[data-filter]'),star=e.target.closest('[data-favorite]'),preview=e.target.closest('[data-preview]');
    if(f){const key=f.closest('.study').id;state.filter=f.dataset.filter;render();const panel=$(key);Array.from(panel.querySelectorAll('[data-filter]')).find(b=>b.dataset.filter===state.filter)?.focus({preventScroll:true});}
    if(star){const id=star.dataset.favorite,key=star.closest('.study').id;const record=items().find(r=>r.id===id);if(record){record.favorite=!record.favorite;render();const target=$(key).querySelector(`[data-favorite="${id}"]`)||$(key).querySelector('[data-filter="fav"]');target?.focus({preventScroll:true});}}
    if(preview){const record=items().find(r=>r.id===preview.dataset.preview);if(record){$('dialogTitle').textContent=H.boardName(record);$('dialogContent').innerHTML=`<p class="meta">${H.escape(H.date(record))} · ${H.escape(record.snow||'雪質未入力')}</p>${H.matrix(record,state.mode)}`;$('dialogContent').querySelector('.record-actions')?.remove();$('dialogContent').querySelector('.favorite')?.remove();$('recordDialog').showModal();}}
  });
  function selectVariant(value,focus=false){state.variant=value;render();if(focus)$('tab-'+value).focus();}
  document.querySelector('.variant-picker').addEventListener('click',e=>{const b=e.target.closest('[data-variant]');if(b)selectVariant(b.dataset.variant);});
  document.querySelector('.variant-picker').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=descriptions.map(([k])=>k),i=keys.indexOf(state.variant);selectVariant(keys[e.key==='Home'?0:e.key==='End'?keys.length-1:(i+(e.key==='ArrowRight'?1:-1)+keys.length)%keys.length],true);});
  $('theme').addEventListener('change',e=>{document.documentElement.dataset.theme=e.target.value;});
  $('mode').addEventListener('change',e=>{state.mode=e.target.value;render();});
  $('scenario').addEventListener('change',e=>{state.scenario=e.target.value;state.filter='all';state.query='';render();});
  $('gallery').addEventListener('change',e=>{state.gallery=e.target.checked;render();});
  for(const id of ['closeDialog','doneDialog'])$(id).addEventListener('click',()=>{$('recordDialog').close();});
  render();
})();
