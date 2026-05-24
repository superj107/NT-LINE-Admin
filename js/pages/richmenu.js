async function loadRichMenu() {
  setContent('<div class="loading">載入中...</div>');
  const res = await apiCall({ action: 'getRichMenuList' });
  if (!res.success) { setContent('<div class="loading">載入失敗</div>'); return; }
  renderRichMenu(res.data);
}

function renderRichMenu(data) {
  const rows = data.map(function(row) {
    return `<tr>
      <td>${row.name}</td>
      <td>${row.display_text || '-'}</td>
      <td>${row.layout || '-'}</td>
      <td>${row.is_default ? '✅ 預設' : '-'}</td>
      <td>${row.rich_menu_id || '-'}</td>
    </tr>`;
  }).join('');

  setContent(`
    <div class="page-title">圖文選單</div>
    <div class="card">
      <table>
        <thead><tr>
          <th>選單名稱</th>
          <th>顯示文字</th>
          <th>版型</th>
          <th>預設</th>
          <th>選單ID</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="empty">尚無資料</td></tr>'}</tbody>
      </table>
    </div>
  `);
}
