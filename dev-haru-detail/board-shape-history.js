/* Optional, confirmed board metadata updates. Riding settings stay record-specific. */
const BoardShapeHistory = (() => {
  const fields = {shape:'シェイプ',nose:'ノーズ形状',bend:'ベンド',boardNote:'形状の補足'};
  const ids = {shape:'detailShape',nose:'detailNose',bend:'detailBend',boardNote:'detailBoardNote'};
  const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

  function plan(items, board, source) {
    const name = typeof board === 'string' ? board.trim() : '';
    const normalized = DetailData.normalize(source);
    const patch = Object.fromEntries(Object.keys(fields).filter(key => normalized[key] !== '').map(key => [key, normalized[key]]));
    const result = {board:name,patch,matched:0,changed:0,overwritten:0,favorites:0,items};
    if (!Array.isArray(items) || !name || !Object.keys(patch).length) return result;
    result.items = items.map(item => {
      if (typeof item?.board !== 'string' || item.board.trim() !== name) return item;
      result.matched++;
      const detail = object(item.detail);
      const changed = Object.keys(patch).filter(key => detail[key] !== patch[key]);
      if (!changed.length) return item;
      result.changed++;
      if (changed.some(key => detail[key] != null && String(detail[key]).trim() !== '')) result.overwritten++;
      if (item.favorite === true) result.favorites++;
      // Merge only the provided board fields; preserve even unknown record/detail properties.
      return {...item, detail:{...detail, ...patch}};
    });
    return result;
  }

  const byId = id => document.getElementById(id);
  function snapshot() {
    const raw = localStorage.getItem(KEY);
    const items = JSON.parse(raw === null ? '[]' : raw);
    if (!Array.isArray(items)) throw new Error('Invalid history');
    return {raw,items};
  }
  function apply() {
    if (typeof HistoryEditor !== 'undefined' && HistoryEditor.isEditing()) {showToast('履歴の編集を保存してから、形状をまとめて反映してください。','info');return;}
    const board = byId('board').value.trim();
    if (!board) {showToast('反映する板名を入力してください。','info');byId('board').focus();return;}
    const source = Object.fromEntries(Object.entries(ids).map(([key,id]) => [key,byId(id).value]));
    let before, next;
    try {before = snapshot();next = plan(before.items, board, source);}
    catch {showToast('保存履歴を読み込めませんでした。反映していません。','error');return;}
    if (!Object.keys(next.patch).length) {showToast('反映する板の形状か補足を入力してください。','info');byId('detailShape').focus();return;}
    if (!next.changed) {showToast(next.matched ? 'この板の履歴はすべて同じ形状です。' : 'この板名と一致する保存履歴はありません。','info');return;}
    const values = Object.entries(next.patch).map(([key,value]) => `${fields[key]}：${key === 'boardNote' ? value : DetailData.choices[key][value]}`);
    const message = [
      `「${next.board}」の保存履歴へ反映しますか？`,
      ...values,
      '',
      `変更する履歴：${next.changed}件（お気に入り${next.favorites}件を含む）`,
      `入力済みの違う値を上書き：${next.overwritten}件`,
      `同じ内容で変更しない履歴：${next.matched-next.changed}件`,
      '',
      '絞り込みに関係なく、同じ板名の履歴すべてが対象です。空欄の項目は変更しません。',
      '角度・ビス位置・日時など、形状以外の記録はそのままです。',
    ].join('\n');
    if (!confirm(message)) return;
    try {
      // Another tab can change history while the confirmation is open.
      if (localStorage.getItem(KEY) !== before.raw) {showToast('確認中に履歴が変わりました。もう一度内容を確認してください。','info');return;}
      localStorage.setItem(KEY, JSON.stringify(next.items));
    } catch {showToast('履歴を保存できませんでした。反映していません。','error');return;}
    render();
    showToast(`${next.changed}件の履歴に板の形状を反映しました。`,'success');
  }
  byId('applyBoardShapeHistory')?.addEventListener('click', apply);
  return {plan,apply};
})();
