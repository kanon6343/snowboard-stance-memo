/* Read-only guided tour. Only guide preferences are persisted. */
const TutorialData = (() => {
  const basic=[
    {title:'まずは板名とスタンス',text:'板名・スタンス・幅を記録します。\n以前保存した板名は、入力候補から選べます。',note:'わかる項目だけで大丈夫。使わない欄は空けておけます。',view:'input',target:'#board',example:{fields:[['板名','サンプルボード 156'],['雪質','圧雪'],['スタンス','ダック'],['幅','53 cm']]}},
    {title:'足の角度を記録する',text:'実物の目盛りに合わせて、角度を記録します。\n左足・右足に、それぞれ別の値を残せます。',note:'数値は入力例です。自分のセッティングを記録してください。',view:'input',foot:'left',target:'#leftFootPanel .side-row',example:{fields:[['左足の角度','18°'],['右足の角度','−6°']]}},
    {title:'板の推奨位置を×でメモ',text:'丸の＋はビス位置、中央の×は板の推奨位置です。\n板に付いている印に合わせて、中央の枠を選びます。',note:'推奨位置の印がない板は、×を付けずに残せます。図は説明用です。',view:'input',foot:'left',target:'.holes[data-side="left"]',example:{type:'holes',chosen:[1,3,7,9],reference:2}},
    {title:'左右の足を切り替えて入力',text:'「左足／右足」で入力する足を切り替えます。\n反対の足も同じように記録できます。今は右足を表示しています。',note:'切り替えても、もう片方の入力は残ります。案内中は値を変えません。',view:'input',foot:'right',target:'#footDock'},
    {title:'入力した設定を保存する',text:'左右の入力ができたら、「この設定を保存」で記録を残します。\n保存した設定は「保存履歴」で確認できます。',note:'今はボタンの場所を確認する案内です。実際の入力や履歴は保存・変更しません。',view:'input',foot:'right',target:'#saveBtn'},
    {title:'保存した履歴を見る',text:'保存すると、板名・日時・左右の設定をまとめたカードが「保存履歴」に追加されます。\nこんなふうに、過去の設定を見返せます。',note:'表示中は説明用サンプルです。実際の履歴は増えず、案内を離れると元の一覧に戻ります。',view:'history',sample:'intro',focusHeight:200,target:'#tutorialHistoryRecords .history-card, #tutorialHistoryRecords .dh-card'},
    {title:'保存した設定を呼び出す',text:'「この設定を使う」で、履歴の設定を入力画面へ呼び出せます。\nその設定をもとに、次のセッティングを記録できます。',note:'呼び出すだけでは元の履歴は変わりません。詳細入力の「編集」は、元の履歴を更新します。',view:'history',sample:'recall',target:'#tutorialHistoryRecords .btn-load, #tutorialHistoryRecords .dh-load'},
    {title:'履歴を絞り込んで探す',text:'「絞り込み」でスタンスや角度などから探せます。\n上の帯で件数と条件を確認し、条件の×で解除できます。',note:'板名のタブでも探せます。「すべて解除」しても並び順は変わりません。',view:'history',target:'#historyDock'},
    {title:'バックアップをファイルに残す',text:'「バックアップを書き出す」で履歴をファイルに残します。\n端末の変更や、ブラウザーのデータを消す前に保存しておきましょう。',note:'下書きは含まれません。残したい入力は先に履歴へ保存してください。',menu:'data',backup:true,target:'#btnExport'},
    {title:'ファイルから履歴を復元する',text:'JSONファイルを選ぶと、件数の確認画面が開きます。\n復元方法を選び、内容を確認してから実行します。',note:'重複除外は、同じ日時なら今の履歴を優先します。日時不明は追加します。上書きは今の履歴を置き換えます。',menu:'data',backup:true,target:'#importFile',example:{layout:'list',fields:[['日時の重複を除いて追加','同じ日時は追加しない'],['追加して復元','今の履歴を残して追加'],['上書きして復元','今の履歴を置き換える']]}},
    {title:'入力モードを選べます',text:'普段の記録には「簡易入力」。\nギアの細かな調整は「詳細入力」で残せます。',note:'簡易入力へ戻しても、入力した詳細データは消えません。',menu:'display',target:'#inputMode'},
    {title:'使い方はいつでも見直せます',text:'メニューの「表示」→「使い方ガイド」から、いつでも見直せます。\n詳細入力や履歴の見方も、ここから確認できます。',note:'「完了」を押すと、このガイド欄を開いたまま案内を終えます。',menu:'display',focusHeight:64,target:'#tutorialGuideCard'},
  ];
  const detail=[
    {title:'板の形状を記録する',text:'シェイプ・ノーズ形状・ベンドを記録できます。\n板名の候補を選ぶと、保存済みの形状を空欄へ呼び出せます。',note:'すでに入力した形状を、自動で上書きすることはありません。',view:'input',target:'#detailNose',example:{fields:[['シェイプ','ディレクショナル'],['ノーズ形状','ハンマーヘッド'],['ベンド','キャンバー']]}},
    {title:'同じ板名の履歴へ形状を反映',text:'「同じ板の履歴へ反映…」で、過去の記録にも形状をそろえられます。\n対象件数と変更内容を確認してから反映します。',note:'角度・ビス位置・日時は変わりません。空欄は反映せず、履歴の編集中は使えません。',view:'input',target:'#applyBoardShapeHistory',example:{fields:[['対象の例','同じ板名の履歴 3件'],['反映する内容','入力済みの形状・補足'],['そのまま残す','角度・ビス位置・日時']]}},
    {title:'セットバックの基準と符号',text:'「推奨位置から／中心から」を選び、移動量をmmで記録します。\n＋はノーズ側、−はテール側。0はずらしなしです。',note:'基準を変えても数値は自動換算しません。わからない場合は空欄で残せます。',view:'input',target:'.setback-row',example:{fields:[['基準','推奨位置から'],['移動量','−20 mm（テール側）']]}},
    {title:'ビンディング名から設定を呼び出す',text:'ビンディング名の候補を選ぶと、最新の記録からディスク形式とヒールカップを呼び出せます。',note:'該当する設定は入れ替わります。角度やビス位置はそのまま。名前の手入力だけでは呼び出しません。',view:'input',target:'#detailBindingName',example:{fields:[['候補を選ぶ','サンプルビンディング / M'],['呼び出す内容','ディスク形式・ヒールカップ']]}},
    {title:'フォワードリーンを左右別に',text:'ビンディングの目盛りやメーカーの表記を、そのまま記録します。\n左足・右足で別の値を残せます。',note:'「F2」「1段目」など自由に書けます。角度への換算はしません。',view:'input',foot:'left',target:'#detailLeanLeft',example:{fields:[['左足のリーン','F2'],['右足のリーン','1段目']]}},
    {title:'ディスクの形式を選ぶ',text:'穴位置式・長穴スライド式など、実物に近い方式を選びます。\n左右で違う形式も記録できます。',note:'図は方式の見本です。寸法や取り付けの互換性は表していません。',view:'input',foot:'left',target:'#detailDisk-left .disk-type-picker',example:{fields:[['左足の形式','長穴スライド式'],['右足の形式','穴位置式']]}},
    {title:'ディスクのずらし量を残す',text:'前後は＋ノーズ側／−テール側で記録します。\n横はつま先側・かかと側を選び、移動量をmmで残します。',note:'0はずらしなし、空欄は未入力。形式を選んでも移動量は自動入力しません。',view:'input',foot:'left',target:'#detailDisk-left .detail-offset-grid',example:{fields:[['前後','−3 mm'],['横','つま先側 2 mm']]}},
    {title:'ヒールカップの目盛り',text:'内側（親指側）と外側（小指側）の目盛りを、足ごとに記録します。\n「手前から／奥から」で数える基準も残せます。',note:'目盛りはmmへ換算しません。数える基準を変えても、入力した値は反転しません。',view:'input',foot:'left',target:'#detailDisk-left .heelcup-layout',example:{fields:[['数える基準','奥から'],['内側（親指側）','1'],['外側（小指側）','2']]}},
    {title:'感想とギア調整メモを分ける',text:'コメントを開くと、滑った感想とギアの調整メモを別々に残せます。\n消すボタンも、それぞれの欄だけに働きます。',note:'履歴を編集中でも「変更を保存」するまで元の記録は変わりません。',view:'input',comment:true,target:'#detailNote',example:{fields:[['滑った感想','少し幅が広く感じた'],['ギア調整メモ','ヒールカップを1目盛り調整']]}},
    {title:'履歴① カードで要点を見る',text:'上にスタンスと幅、その下に左右の角度を表示します。\n必要なときは「調整の詳細」で細かな設定も確認できます。',note:'表示中は説明用サンプルです。実際の履歴と表示設定は、案内を終えると元に戻ります。',view:'history',layout:'summary',focusHeight:200,target:'#tutorialHistoryRecords .dh-card-body'},
    {title:'履歴② 詳細一覧で左右を確認',text:'詳細一覧は、左右の設定を常に表示します。\nリーン・ディスク・ヒールカップを項目ごとに見比べられます。',note:'同じサンプルを表示しています。表示方法を変えても、記録の内容は変わりません。',view:'history',layout:'matrix',focusHeight:180,target:'#tutorialHistoryRecords .dh-settings'},
    {title:'履歴③ 板ごとに変化を追う',text:'同じ板の記録をまとめて表示します。\n過去の記録と比べて、角度や幅の変化を確認できます。',note:'比較するのは表示中の記録です。日時不明や同じ日時の記録は、前後を推測しません。',view:'history',layout:'grouped',focusHeight:200,target:'#tutorialHistoryRecords .dh-record-overview'},
  ];
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function cardWidth(rect,viewport){const w=viewport.width,x=viewport.x||0,side=Math.max(rect.left-x-28,x+w-rect.right-28);return Math.min(420,w-24,w>=760&&side>=320?side:Infinity);}
  function place(rect,viewport,card){
    const margin=12,gap=16,vx=viewport.x||0,vy=viewport.y||0,w=viewport.width,h=viewport.height;
    const width=Math.min(card.width,w-margin*2),height=Math.min(card.height,h-margin*2);
    const x=clamp(rect.left+(rect.width-width)/2,vx+margin,vx+w-width-margin);
    const leftRoom=rect.left-vx-margin-gap,rightRoom=vx+w-margin-rect.right-gap;
    if(w>=760&&Math.max(leftRoom,rightRoom)>=width)return {left:rightRoom>=leftRoom?rect.right+gap:rect.left-width-gap,top:clamp(rect.top+(rect.height-height)/2,vy+margin,vy+h-height-margin)};
    let y=rect.bottom+gap;
    if(y+height>vy+h-margin)y=rect.top-height-gap;
    if(y<vy+margin)y=vy+h-height-margin;
    return {left:x,top:clamp(y,vy+margin,vy+h-height-margin)};
  }
  function cardHeight(rect,viewport){const top=viewport.y||0,x=viewport.x||0,side=Math.max(rect.left-x-28,x+viewport.width-rect.right-28);const room=viewport.width>=760&&side>=320?viewport.height-24:Math.max(rect.top-top-28,top+viewport.height-rect.bottom-28);return Math.min(520,viewport.height-24,Math.max(180,room));}
  const samples=[
    {id:'tutorial-sample-new',board:'サンプルボード 156',dateTime:'2026-02-18T01:30:00Z',snow:'圧雪',leftAngle:'18',rightAngle:'-6',stance:'duck',stanceWidth:'53',holes:{left:[1,3,7,9],right:[2,4,8,10]},reference:{left:2,right:3},comment:'説明用のサンプルです。',detail:{shape:'directionalTwin',nose:'round',bend:'camber',bindingName:'サンプルビンディング / M',forwardLeanLeft:'F2',forwardLeanRight:'F1',setback:{basis:'reference',direction:'tail',mm:'10'},diskShift:{left:{type:'slots',longitudinal:{direction:'tail',mm:'3'},lateral:{direction:'toe',mm:'2'}},right:{type:'holes',longitudinal:{direction:'nose',mm:'0'}}},heelcup:{left:{inner:'0',outer:'1',origin:'near'},right:{inner:'1',outer:'2',origin:'far'}},note:'サンプルの調整メモ。'}},
    {id:'tutorial-sample-old',board:'サンプルボード 156',dateTime:'2026-02-16T05:45:00Z',snow:'圧雪',leftAngle:'15',rightAngle:'-6',stance:'duck',stanceWidth:'54',holes:{left:[0,2,6,8],right:[2,4,8,10]},reference:{left:2,right:3},detail:{bindingName:'サンプルビンディング / M',forwardLeanLeft:'F1',forwardLeanRight:'F1'}}
  ];
  function renderSamples(mode,layout){
    if(mode==='detail')return DetailHistoryData.render(samples,layout);
    const item=samples[0];
    return `<section class="card history-card"><header class="history-card-head"><div class="history-card-heading"><h3 class="history-board">${item.board}</h3><p class="history-meta history-meta-compact"><span>${DetailHistoryData.date(item)}</span><span>圧雪</span><span class="history-stance-pair"><span class="stance-tag">ダック</span><span class="stance-width-tag">幅 53 cm</span></span></p></div></header><div class="history-settings"><div class="history-setting"><span>左足</span><strong>18°</strong></div><div class="history-setting"><span>右足</span><strong>−6°</strong></div></div>${DetailHistoryData.mini(item)}<div class="history-actions"><button type="button" class="btn-load">この設定を使う</button><button type="button" class="btn-del">削除</button></div></section>`;
  }
  return {basic,detail,place,cardWidth,cardHeight,renderSamples};
})();

const AppTutorial = (() => {
  const byId=id=>document.getElementById(id),dialog=byId('tutorialDialog'),card=byId('tutorialCard'),spot=byId('tutorialSpotlight');
  const key='haru-detail:tutorial-v1';let preference={},state=null,index=0,kind='basic',frame=0,pendingReveal=false;
  try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))preference={dismissed:saved.dismissed===true,basic:saved.basic===true,detail:saved.detail===true};}catch{}
  byId('tutorialInvite').hidden=preference.dismissed===true;
  function persist(){try{localStorage.setItem(key,JSON.stringify(preference));}catch{showToast('使い方ガイドの表示設定を保存できませんでした。案内はそのまま使えます。','info');}}
  function dismiss(){preference.dismissed=true;byId('tutorialInvite').hidden=true;persist();}
  const steps=()=>TutorialData[kind];
  function make(tag,className,text){const el=document.createElement(tag);el.className=className;if(text!==undefined)el.textContent=text;return el;}
  function example(value){
    const root=byId('tutorialExample');root.replaceChildren();root.hidden=!value;if(!value)return;
    root.appendChild(make('h3','tutorial-example-label','説明用の入力例'));
    if(value.type==='holes'){
      const grid=make('div','tutorial-demo-holes');grid.setAttribute('role','img');grid.setAttribute('aria-label','説明用：オレンジの丸4個がビス位置、中央の×1個が板の推奨位置です');
      grid.appendChild(make('div','tutorial-demo-toe','つま先 ↑'));
      for(const row of [0,1,2]){const line=make('div','tutorial-demo-hole-row');line.setAttribute('aria-hidden','true');for(let i=0;i<6;i++){const isReference=row===1,on=isReference?i===value.reference:value.chosen.includes((row===0?0:6)+i);line.appendChild(make('span',(isReference?'tutorial-demo-ref':'tutorial-demo-hole')+(on?' is-on':'')));}grid.appendChild(line);}
      root.appendChild(grid);root.appendChild(make('p','tutorial-demo-legend','＋ ビス位置　× 板の推奨位置'));return;
    }
    if(value.type==='matrix'){
      const table=make('table','tutorial-demo-table'),head=make('thead',''),body=make('tbody','');
      value.rows.forEach((row,i)=>{const tr=make('tr','');row.forEach((text,j)=>{const cell=make(i===0||j===0?'th':'td','',text);if(i===0||j===0)cell.setAttribute('scope',i===0?'col':'row');tr.appendChild(cell);});(i===0?head:body).appendChild(tr);});table.appendChild(head);table.appendChild(body);root.appendChild(table);return;
    }
    if(value.type==='timeline'){
      root.appendChild(make('strong','tutorial-demo-board','サンプルボード 156'));const list=make('ol','tutorial-demo-timeline');for(const [date,text]of value.rows){const item=make('li','');item.appendChild(make('strong','',date));item.appendChild(make('span','',text));list.appendChild(item);}root.appendChild(list);root.appendChild(make('p','tutorial-demo-change',value.change));return;
    }
    if(value.type==='card')root.appendChild(make('strong','tutorial-demo-board','サンプルボード 156'));
    const fields=make('dl','tutorial-example-fields'+(value.type==='card'?' tutorial-demo-card':'')+(value.layout==='list'?' is-list':''));
    for(const [label,text]of value.fields){const cell=make('div','tutorial-example-field');cell.appendChild(make('dt','',label));cell.appendChild(make('dd','',text));fields.appendChild(cell);}root.appendChild(fields);
  }
  const resolve=selector=>Array.from(document.querySelectorAll(selector)).find(el=>el.getClientRects().length>0&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY'));
  let originalHistoryHidden=null,sampleRecallLayout=null;
  function sampleHistory(step){
    const root=byId('tutorialHistory'),records=byId('tutorialHistoryRecords'),history=byId('history');
    if(step?.sample||step?.layout){
      if(originalHistoryHidden===null)originalHistoryHidden=history.hidden;
      const mode=document.documentElement.dataset.inputMode;
      if(step.sample&&mode==='detail'){sampleRecallLayout=DetailHistoryView.currentLayout();DetailHistoryView.previewLayout('summary',false);}
      records.className=mode==='detail'?'dh-history':'tutorial-simple-history dh-history';
      records.innerHTML=TutorialData.renderSamples(mode,step.sample?'summary':step.layout);
      root.hidden=false;history.hidden=true;
    }else{
      root.hidden=true;records.replaceChildren();
      if(originalHistoryHidden!==null){history.hidden=originalHistoryHidden;originalHistoryHidden=null;}
      if(sampleRecallLayout!==null){DetailHistoryView.previewLayout(sampleRecallLayout,false);sampleRecallLayout=null;}
    }
  }
  function menu(open,page){if(page)MenuPresentation.choose(page,false,false);const current=byId('menuPanel').classList.contains('open');if(open!==current){if(open)MenuControls.open({preservePage:true});else MenuControls.close();}}
  const targetFor=step=>resolve(step.target)||(step.empty?null:resolve(step.fallback||'#inputTab'));
  function paint(){
    frame=0;if(!state)return;
    const step=steps()[index],target=targetFor(step);
    if(pendingReveal){pendingReveal=false;reveal(target);}
    const vv=window.visualViewport,viewport={x:vv?.offsetLeft||0,y:vv?.offsetTop||0,width:vv?.width||window.innerWidth,height:vv?.height||window.innerHeight};
    let rect=target?.getBoundingClientRect();
    const focusHeight=Math.min(step.focusHeight||Infinity,viewport.height<500?Math.max(44,viewport.height*.2):Infinity);
    if(rect&&Number.isFinite(focusHeight))rect={left:rect.left,right:rect.right,top:rect.top,width:rect.width,height:Math.min(rect.height,focusHeight),bottom:rect.top+Math.min(rect.height,focusHeight)};
    if(rect&&rect.width&&rect.height){
      const left=Math.max(viewport.x+6,rect.left-6),top=Math.max(viewport.y+6,rect.top-6),right=Math.min(viewport.x+viewport.width-6,rect.right+6),bottom=Math.min(viewport.y+viewport.height-6,rect.bottom+6);
      spot.hidden=right<=left||bottom<=top;byId('tutorialShade').hidden=!spot.hidden;
      Object.assign(spot.style,{left:left+'px',top:top+'px',width:Math.max(0,right-left)+'px',height:Math.max(0,bottom-top)+'px'});
    }else{spot.hidden=true;byId('tutorialShade').hidden=false;}
    const anchor=spot.hidden?{left:viewport.x,top:viewport.y,width:viewport.width,bottom:viewport.y}:spot.getBoundingClientRect();
    card.style.width=TutorialData.cardWidth(anchor,viewport)+'px';
    card.style.maxHeight=TutorialData.cardHeight(anchor,viewport)+'px';
    const box=card.getBoundingClientRect();
    const pos=TutorialData.place(anchor,viewport,box);card.style.left=pos.left+'px';card.style.top=pos.top+'px';
  }
  function schedule(){if(state&&!frame)frame=requestAnimationFrame(paint);}
  function reveal(target){
    if(!target)return;
    target.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'});
    if(target.closest('#menuPanel')){const body=document.querySelector('#menuPanel .menu-body');body.scrollTop=Math.max(0,body.scrollTop+target.getBoundingClientRect().top-body.getBoundingClientRect().top-12);}
    else{const dock=byId(byId('historyView').hidden?'footDock':'historyDock');const short=(window.visualViewport?.height||window.innerHeight)<500;const clearance=short?18:dock?.getClientRects().length?dock.getBoundingClientRect().height+20:20;const top=(window.visualViewport?.offsetTop||0)+clearance;window.scrollBy({left:0,top:target.getBoundingClientRect().top-top,behavior:'instant'});}
  }
  function show(){
    sampleHistory(null);
    const step=steps()[index];
    state.visited.add(index);
    menu(!!step.menu,step.menu);
    if(step.layout){state.layoutTouched=true;DetailHistoryView.previewLayout(step.layout,false);}
    if(step.view)showView(step.view,false);
    if(step.foot)showFoot(step.foot);
    if(step.backup)byId('menuBackup').open=true;
    if(step.comment)byId('commentDetails').open=true;
    sampleHistory(step);
    byId('tutorialStepLabel').textContent=`${kind==='basic'?'基本編':'詳細入力編'} · ${index+1} / ${steps().length}`;
    const content=step.empty&&!resolve(step.target)?step.empty:step;
    byId('tutorialTitle').textContent=step.title;byId('tutorialText').textContent=content.text;byId('tutorialNote').textContent=content.note;
    example(content.example);
    byId('tutorialCopy').scrollTop=0;
    byId('previousTutorial').disabled=index===0;byId('nextTutorial').textContent=index===steps().length-1?'完了':'次へ';
    const progress=byId('tutorialProgress');progress.replaceChildren();steps().forEach((_,i)=>{const dot=document.createElement('span');dot.className=i===index?'is-current':i<index?'is-complete':'';progress.appendChild(dot);});
    const target=targetFor(step);reveal(target);pendingReveal=true;
    schedule();
  }
  function start(next='basic',startAt=0){
    if(state||document.querySelector('dialog[open]'))return false;
    kind=next==='detail'?'detail':'basic';index=Number.isInteger(startAt)?Math.max(0,Math.min(steps().length-1,startAt)):0;
    state={mode:document.documentElement.dataset.inputMode,view:byId('historyView').hidden?'input':'history',foot:byId('rightFootTab').getAttribute('aria-selected')==='true'?'right':'left',menuOpen:byId('menuPanel').classList.contains('open'),menuPage:document.querySelector('[data-menu-page][aria-selected="true"]')?.dataset.menuPage||'display',menuScroll:document.querySelector('#menuPanel .menu-body').scrollTop,menuReturnFocus:MenuControls.returnFocus(),backupOpen:byId('menuBackup').open,commentOpen:byId('commentDetails').open,historyLayout:DetailHistoryView.currentLayout(),historyExpanded:DetailHistoryView.capture(),visited:new Set(),modeStatus:byId('inputModeStatus').textContent,focus:document.activeElement,x:window.scrollX,y:window.scrollY};
    document.documentElement.dataset.tutorialActive='true';
    dismiss();if(kind==='detail')DetailEditor.setMode('detail',false);
    show();dialog.showModal();byId('nextTutorial').focus({preventScroll:true});schedule();return true;
  }
  function finish(completed=false){
    if(!state)return;
    const before=state;state=null;if(frame)cancelAnimationFrame(frame);frame=0;pendingReveal=false;
    delete document.documentElement.dataset.tutorialActive;
    if(dialog.open)dialog.close();
    DetailEditor.setMode(before.mode,false);byId('inputModeStatus').textContent=before.modeStatus;
    sampleHistory(null);
    if(before.layoutTouched){DetailHistoryView.previewLayout(before.historyLayout,false);DetailHistoryView.restore(before.historyExpanded);}
    byId('menuBackup').open=before.backupOpen;byId('commentDetails').open=before.commentOpen;showView(before.view,false);showFoot(before.foot);
    const completedBasic=completed&&kind==='basic';
    menu(completedBasic||before.menuOpen,completedBasic?'display':before.menuPage);MenuControls.restoreReturnFocus(before.menuReturnFocus);
    if(!completedBasic)document.querySelector('#menuPanel .menu-body').scrollTop=before.menuScroll;
    window.scrollTo({left:before.x,top:before.y,behavior:'auto'});
    if(completedBasic){byId('tutorialMenuStatus').textContent='基本編は完了です。ここからいつでも使い方を見直せます。';const guide=byId('tutorialGuideCard');reveal(guide);guide.focus({preventScroll:true});}
    else{const focus=before.focus?.isConnected&&before.focus.getClientRects().length?before.focus:byId(before.view==='history'?'historyTab':'inputTab');focus.focus({preventScroll:true});}
    if(completed){if(before.visited.size===steps().length){preference[kind]=true;persist();}if(!completedBasic)showToast(before.visited.size===steps().length?'詳細入力編を見終えました。':'履歴の使い方案内を終了しました。','success');}
  }
  byId('startBasicInvite').addEventListener('click',()=>start('basic'));byId('dismissTutorialInvite').addEventListener('click',dismiss);
  byId('startBasicTutorial').addEventListener('click',()=>start('basic'));byId('startDetailTutorial').addEventListener('click',()=>start('detail'));
  byId('startHistoryTutorial').addEventListener('click',()=>start('detail',TutorialData.detail.findIndex(step=>step.layout)));
  byId('nextTutorial').addEventListener('click',()=>{if(index===steps().length-1)finish(true);else{index++;show();}});
  byId('previousTutorial').addEventListener('click',()=>{if(index>0){index--;show();}});
  for(const id of ['closeTutorial','skipTutorial'])byId(id).addEventListener('click',()=>finish(false));
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});dialog.addEventListener('close',()=>{if(state)finish(false);});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false);}});
  for(const event of ['click','touchstart','touchend'])dialog.addEventListener(event,e=>e.stopPropagation());
  for(const event of ['wheel','touchmove'])dialog.addEventListener(event,e=>{e.stopPropagation();if(!card.contains(e.target))e.preventDefault();},{passive:false});
  window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  byId('menuPanel').addEventListener('transitionend',schedule);
  return {start,finish,isActive:()=>!!state};
})();
