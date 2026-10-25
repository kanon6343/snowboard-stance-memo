/* Device-local unfinished input; never writes the saved-history key. */
const DraftGuard = (() => {
  const key='haru-detail:editor-draft-v1',byId=id=>document.getElementById(id);
  const panel=byId('setupCard'),recovery=byId('draftRecovery'),status=byId('draftStatus');
  let baseline=signature(captureEditorDraft()),pending=null,timer=null,restoring=false,ownedRaw=null;
  function signature(editor){const {mode,...data}=editor;return JSON.stringify(data);}
  const context=()=>typeof HistoryEditor!=='undefined'?HistoryEditor.draftContext():null;
  const dirty=()=>signature(captureEditorDraft())!==baseline;
  function message(value,error=false){if(status.textContent!==value)status.textContent=value;status.dataset.error=String(error);}
  function remove(){try{if(localStorage.getItem(key)!==ownedRaw)throw Error('Draft changed in another tab');localStorage.removeItem(key);ownedRaw=null;return true;}catch{message('下書きの保存場所にアクセスできないか、別の画面で更新されています。入力内容を控えてください。',true);return false;}}
  function checkpoint(){
    clearTimeout(timer);timer=null;
    if(restoring||pending)return true;
    if(!dirty()&&!context()){const removed=remove();if(removed)message('入力途中の内容は、この端末に一時保存されます');return true;}
    try{
      if(localStorage.getItem(key)!==ownedRaw)throw Error('Draft changed in another tab');
      const raw=JSON.stringify({version:1,updatedAt:new Date().toISOString(),editor:captureEditorDraft(),context:context()});
      localStorage.setItem(key,raw);ownedRaw=raw;
      message('下書きをこの端末に一時保存中 · 履歴への保存はまだです');return true;
    }catch{message('下書きを一時保存できません。画面の入力内容は残っています。',true);return false;}
  }
  function changed(){clearTimeout(timer);timer=setTimeout(checkpoint,180);}
  function reset(){clearTimeout(timer);timer=null;baseline=signature(captureEditorDraft());if(remove())message('入力途中の内容は、この端末に一時保存されます');}
  function beforeReplace(){
    if(pending){showView('input');byId('resumeDraft').focus();showToast('先に前回の下書きを再開するか、破棄するか選んでください。','info');return false;}
    return !dirty()||confirm('入力途中の内容を入れ替えますか？この下書きは破棄されます。保存済みの履歴は変わりません。');
  }
  function release(){pending=null;recovery.hidden=true;panel.inert=false;}
  function resume(){
    if(!pending)return;
    const draft=pending;restoring=true;release();
    try{
      restoreEditorDraft(draft.editor);
      const editing=draft.context&&HistoryEditor.restoreContext(draft.context);
      if(draft.context&&!editing)showToast('元の履歴が変わっているため、新規入力の下書きとして戻しました。保存しても元の履歴は上書きしません。','info');
      else showToast(editing?'編集中の下書きを再開しました。保存時に変更を確認します。':'下書きを再開しました。','info');
      byId('inputTab').focus();
    }finally{restoring=false;}
    checkpoint();
  }
  byId('resumeDraft').addEventListener('click',resume);
  byId('discardDraft').addEventListener('click',()=>{if(!remove())return;release();baseline=signature(captureEditorDraft());message('前回の下書きを破棄しました');});
  for(const event of ['input','change','click'])panel.addEventListener(event,changed);
  window.addEventListener('pagehide',checkpoint);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')checkpoint();});
  window.addEventListener('beforeunload',event=>{if(!checkpoint()){event.preventDefault();event.returnValue='';}});
  try{
    const raw=localStorage.getItem(key);ownedRaw=raw;
    if(raw!==null){
      const value=JSON.parse(raw);
      if(value?.version!==1||!value.editor||!value.editor.fields||typeof value.editor.fields!=='object'||Array.isArray(value.editor.fields))throw Error('Invalid draft');
      pending=value;recovery.hidden=false;panel.inert=true;
      byId('draftRecoveryLabel').textContent=value.context?'履歴編集中の下書きがあります':'前回の入力の下書きがあります';
      byId('draftRecoveryBoard').textContent=String(value.editor.fields.board||'板名未入力').slice(0,128);
    }
  }catch{message('前回の下書きを読み込めませんでした。保存済みの履歴は変更していません。',true);}
  return {changed,reset,beforeReplace,checkpoint,isPending:()=>!!pending,isDirty:dirty};
})();
