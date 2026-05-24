async function loadAudience() {
  setContent('<div class="loading">載入中...</div>');
  const res = await apiCall({ action: 'getAudienceList' });
  if (!res.success) { setContent('<div class="loading">載入失敗</div>'); return; }

  // 自動同步人數
  if (res.data.length > 0) {
    await Promise.all(res.data.map(function(row) {
      return apiCall({ action: 'syncAudienceCount', audience_id: row.audience_id });
    }));
    const res2 = await apiCall({ action: 'getAudienceList' });
    if (res2.success) renderAudience(res2.data);
    else renderAudience(res.data);
  } else {
    renderAudience(res.data);
  }
}

function renderAudience(data) {
  const rows = data.map(function(row) {
    return `<tr>
      <td>${row.keyword}</td>
      <td>${row.chat_tag || '-'}</td>
      <td>${row.audience_id}</td>
      <td>${row.count} 人</td>
    </tr>`;
  }).join('');

  setContent(`
    <div class="page-title">受眾管理</div>
    <div class="card">
      <table>
        <thead><tr>
          <th>關鍵字</th>
          <th>聊天標籤</th>
          <th>受眾ID</th>
          <th>人數</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="empty">尚無資料</td></tr>'}</tbody>
      </table>
    </div>
  `);
}
