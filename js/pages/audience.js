async function loadAudience() {
  setContent('<div class="loading">載入中...</div>');

  const res    = await apiCall({ action: 'getAudienceList' });
  const rmRes  = await apiCall({ action: 'getRichMenuList' });

  if (!res.success) { setContent('<div class="loading">載入失敗</div>'); return; }

  // 自動同步人數
  if (res.data.length > 0) {
    await Promise.all(res.data.map(function(row) {
      return apiCall({ action: 'syncAudienceCount', audience_id: row.audience_id });
    }));
    const res2 = await apiCall({ action: 'getAudienceList' });
    if (res2.success) renderAudience(res2.data, rmRes.data || []);
    else renderAudience(res.data, rmRes.data || []);
  } else {
    renderAudience(res.data, rmRes.data || []);
  }
}

function renderAudience(data, richMenus) {
  const rmOptions = '<option value="">不切換圖文選單</option>' +
    richMenus.map(function(rm) {
      return '<option value="' + rm.rich_menu_id + '">' + rm.name + '</option>';
    }).join('');

  const rows = data.map(function(row) {
    const rmName = row.rich_menu_id
      ? (richMenus.find(function(r) { return r.rich_menu_id === row.rich_menu_id; }) || {}).name || '-'
      : '-';
    return `<tr>
      <td>${row.keyword || '-'}</td>
      <td>${row.chat_tag || '-'}</td>
      <td style="font-size:12px;color:#888">${row.audience_id}</td>
      <td>${row.count} 人</td>
      <td>${rmName}</td>
      <td>
        <button class="btn btn-edit" onclick="editAudience(${row.index},'${encodeURIComponent(JSON.stringify(row))}')">編輯</button>
        <button class="btn btn-sync" onclick="syncCount('${row.audience_id}',${row.index})">同步</button>
        <button class="btn btn-primary" onclick="openImportModal('${row.audience_id}','${row.chat_tag || row.keyword}')">匯入UID</button>
        <button class="btn btn-danger" onclick="deleteAudienceRow('${row.audience_id}',${row.index})">刪除</button>
      </td>
    </tr>`;
  }).join('');

  setContent(`
    <div class="page-title">受眾管理</div>
    <div class="card">
      <div class="toolbar">
        <button class="btn btn-primary" onclick="openCreateAudienceModal()">＋ 建立受眾</button>
      </div>
      <table>
        <thead><tr>
          <th>關鍵字</th><th>聊天標籤</th><th>受眾ID</th><th>人數</th><th>對應圖文選單</th><th>操作</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="empty">尚無受眾</td></tr>'}</tbody>
      </table>
    </div>

    <div class="modal-overlay" id="audienceModal">
      <div class="modal">
        <h3 id="audienceModalTitle">建立受眾</h3>
        <div class="form-group">
          <label>受眾名稱（聊天標籤）</label>
          <input type="text" id="aud-name" placeholder="例：VIP客戶">
        </div>
        <div class="form-group">
          <label>觸發關鍵字</label>
          <input type="text" id="aud-keyword" placeholder="用戶輸入此關鍵字自動加入">
        </div>
        <div class="form-group">
          <label>對應圖文選單</label>
          <select id="aud-richmenu">${rmOptions}</select>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeAudienceModal()">取消</button>
          <button class="btn btn-primary" id="aud-save-btn" onclick="saveAudience()">建立</button>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="importModal">
      <div class="modal">
        <h3>匯入 UID</h3>
        <p id="importModalTitle" style="color:#888;font-size:13px;margin-bottom:12px"></p>
        <div class="form-group">
          <label>UID 清單（每行一個）</label>
          <textarea id="importUids" placeholder="Uxxxxxxxxxx&#10;Uxxxxxxxxxx" style="height:160px"></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeImportModal()">取消</button>
          <button class="btn btn-primary" onclick="submitImport()">匯入</button>
        </div>
      </div>
    </div>
  `);
}

var _audEditIndex = null;
var _audEditId    = null;
var _importAudId  = null;

function openCreateAudienceModal() {
  _audEditIndex = null;
  _audEditId    = null;
  document.getElementById('audienceModalTitle').textContent = '建立受眾';
  document.getElementById('aud-save-btn').textContent       = '建立';
  document.getElementById('aud-name').value     = '';
  document.getElementById('aud-keyword').value  = '';
  document.getElementById('aud-richmenu').value = '';
  document.getElementById('audienceModal').classList.add('show');
}

function editAudience(index, rowJson) {
  const row = JSON.parse(decodeURIComponent(rowJson));
  _audEditIndex = index;
  _audEditId    = row.audience_id;
  document.getElementById('audienceModalTitle').textContent = '編輯受眾';
  document.getElementById('aud-save-btn').textContent       = '儲存';
  document.getElementById('aud-name').value     = row.chat_tag || '';
  document.getElementById('aud-keyword').value  = row.keyword  || '';
  document.getElementById('aud-richmenu').value = row.rich_menu_id || '';
  document.getElementById('audienceModal').classList.add('show');
}

async function saveAudience() {
  const name      = document.getElementById('aud-name').value.trim();
  const keyword   = document.getElementById('aud-keyword').value.trim();
  const richMenuId= document.getElementById('aud-richmenu').value;

  if (!name) return showToast('請填入受眾名稱', 'error');

  let res;
  if (_audEditIndex !== null) {
    res = await apiCall({ action: 'updateAudience', index: _audEditIndex, name, keyword, rich_menu_id: richMenuId });
  } else {
    res = await apiCall({ action: 'createAudience', name, keyword, rich_menu_id: richMenuId });
  }

  if (res.success) {
    showToast(_audEditIndex !== null ? '更新成功' : '受眾建立成功');
    closeAudienceModal();
    loadAudience();
  } else {
    showToast(res.message || '失敗', 'error');
  }
}

function closeAudienceModal() {
  document.getElementById('audienceModal').classList.remove('show');
  _audEditIndex = null; _audEditId = null;
}

function openImportModal(audienceId, name) {
  _importAudId = audienceId;
  document.getElementById('importModalTitle').textContent = '受眾：' + name;
  document.getElementById('importUids').value = '';
  document.getElementById('importModal').classList.add('show');
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('show');
  _importAudId = null;
}

async function submitImport() {
  const raw  = document.getElementById('importUids').value.trim();
  const uids = raw.split('\n').map(function(u) { return u.trim(); }).filter(Boolean);
  if (uids.length === 0) return showToast('請填入至少一筆 UID', 'error');

  const res = await apiCall({ action: 'importAudience', audience_id: _importAudId, uids });
  if (res.success) {
    showToast(res.data.message || '匯入成功');
    closeImportModal();
    loadAudience();
  } else {
    showToast(res.message || '匯入失敗', 'error');
  }
}

async function syncCount(audienceId, index) {
  const res = await apiCall({ action: 'syncAudienceCount', audience_id: audienceId });
  if (res.success) {
    showToast('已同步：' + res.data.count + ' 人');
    loadAudience();
  } else {
    showToast(res.message || '同步失敗', 'error');
  }
}

async function deleteAudienceRow(audienceId, index) {
  if (!confirmDialog('確定要刪除這個受眾？此操作無法復原。')) return;
  const res = await apiCall({ action: 'deleteAudience', audience_id: audienceId, index });
  if (res.success) { showToast('已刪除'); loadAudience(); }
  else showToast(res.message || '刪除失敗', 'error');
}
