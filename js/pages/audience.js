// js/pages/audience.js

let _allAudienceData = [];
let _currentPage     = 1;
const _pageSize      = 20;
let _sortKey         = '';
let _sortAsc         = true;
let _searchKeyword   = '';
let _tagListCacheForAudience = null;

async function loadAudience() {
  setContent('<div class="loading">載入中...</div>');

  const res   = await apiCall({ action: 'getAudienceList' });
  const rmRes = await apiCall({ action: 'getRichMenuList' });

  if (!res.success) { setContent('<div class="loading">載入失敗</div>'); return; }

  _allAudienceData = res.data || [];
  _currentPage     = 1;
  _searchKeyword   = '';
  _sortKey         = '';

  renderAudiencePage(rmRes.data || []);
}

function renderAudiencePage(richMenus) {
  const rmOptions = '<option value="">不切換圖文選單</option>' +
    richMenus.map(function(rm) {
      return '<option value="' + rm.rich_menu_id + '">' + rm.name + '</option>';
    }).join('');

  setContent(`
    <div class="page-title">受眾管理</div>
    <div class="card">
      <div class="toolbar" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="openCreateAudienceModal()">＋ 建立受眾</button>
        <input id="aud-search" type="text" placeholder="搜尋關鍵字或名稱..."
          style="padding:8px 12px;border:1.5px solid #e0e0e0;border-radius:6px;font-size:14px;width:220px"
          oninput="searchAudience(this.value)">
        <span style="color:#888;font-size:13px" id="aud-count"></span>
      </div>

      <table style="margin-top:16px">
        <thead><tr>
          <th onclick="sortAudience('keyword')" style="cursor:pointer">
            關鍵字 <span id="sort-keyword"></span>
          </th>
          <th onclick="sortAudience('chat_tag')" style="cursor:pointer">
            聊天標籤 <span id="sort-chat_tag"></span>
          </th>
          <th>受眾ID</th>
          <th onclick="sortAudience('count')" style="cursor:pointer">
            人數 <span id="sort-count"></span>
          </th>
          <th>對應圖文選單</th>
          <th>操作</th>
        </tr></thead>
        <tbody id="aud-tbody"></tbody>
      </table>

      <div id="aud-pagination" style="display:flex;gap:8px;justify-content:center;margin-top:16px"></div>
    </div>

    <!-- 建立/編輯受眾 Modal -->
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
        <div class="form-group">
          <label>連結標籤（可複選，選了之後不會自動貼標，只是後台方便管理對應關係）</label>
          <div id="audModalTagLinkSection" style="max-height:160px;overflow-y:auto;border:1px solid #e0e0e0;border-radius:6px;padding:10px;font-size:13px;">載入中...</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeAudienceModal()">取消</button>
          <button class="btn btn-primary" id="aud-save-btn" onclick="saveAudience()">建立</button>
        </div>
      </div>
    </div>

    <!-- 查看受眾成員 Modal -->
    <div class="modal-overlay" id="audienceMembersModal">
      <div class="modal">
        <h3 id="membersModalTitle">受眾成員</h3>
        <div id="membersModalCount" style="color:#888;font-size:13px;margin-bottom:12px"></div>
        <div style="max-height:400px;overflow-y:auto">
          <table>
            <thead><tr><th>UserID</th><th>顯示名稱</th><th>電話</th><th>觸發關鍵字</th></tr></thead>
            <tbody id="membersModalTbody"></tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeAudienceMembersModal()">關閉</button>
        </div>
      </div>
    </div>

    <!-- 匯入 UID Modal -->
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

  renderRichMenusIntoState(richMenus);
  refreshAudienceTable();
}

let _richMenusCache = [];
function renderRichMenusIntoState(richMenus) {
  _richMenusCache = richMenus || [];
}

function getRmName(richMenuId) {
  if (!richMenuId) return '-';
  const found = _richMenusCache.find(function(r) { return r.rich_menu_id === richMenuId; });
  return found ? found.name : '-';
}

function getFilteredData() {
  let data = _allAudienceData.slice();
  if (_searchKeyword) {
    const kw = _searchKeyword.toLowerCase();
    data = data.filter(function(r) {
      return (r.keyword  || '').toLowerCase().includes(kw) ||
             (r.chat_tag || '').toLowerCase().includes(kw);
    });
  }
  if (_sortKey) {
    data.sort(function(a, b) {
      const va = _sortKey === 'count' ? Number(a[_sortKey]) : String(a[_sortKey] || '');
      const vb = _sortKey === 'count' ? Number(b[_sortKey]) : String(b[_sortKey] || '');
      if (va < vb) return _sortAsc ? -1 : 1;
      if (va > vb) return _sortAsc ?  1 : -1;
      return 0;
    });
  }
  return data;
}

function refreshAudienceTable() {
  const filtered = getFilteredData();
  const total    = filtered.length;
  const pages    = Math.ceil(total / _pageSize) || 1;
  if (_currentPage > pages) _currentPage = pages;

  const start  = (_currentPage - 1) * _pageSize;
  const paged  = filtered.slice(start, start + _pageSize);

  // 更新排序指示
  ['keyword','chat_tag','count'].forEach(function(key) {
    const el = document.getElementById('sort-' + key);
    if (el) el.textContent = _sortKey === key ? (_sortAsc ? '▲' : '▼') : '';
  });

  // 更新筆數
  const countEl = document.getElementById('aud-count');
  if (countEl) countEl.textContent = '共 ' + total + ' 筆';

  // 渲染表格
  const rows = paged.map(function(row) {
    const rmName = getRmName(row.rich_menu_id);
    return `<tr>
      <td>${row.keyword || '-'}</td>
      <td>${row.chat_tag || '-'}</td>
      <td style="font-size:12px;color:#888">${row.audience_id}</td>
      <td>${row.count} 人</td>
      <td>${rmName}</td>
      <td>
        <button class="btn btn-edit" onclick="editAudience(${row.index},'${encodeURIComponent(JSON.stringify(row))}')">編輯</button>
        <button class="btn btn-sync" onclick="viewAudienceMembers('${row.audience_id}','${encodeURIComponent(row.chat_tag || row.keyword || '')}')">查看成員</button>
        <button class="btn btn-sync" onclick="syncCount('${row.audience_id}',${row.index})">同步</button>
        <button class="btn btn-primary" onclick="openImportModal('${row.audience_id}','${row.chat_tag || row.keyword}')">匯入UID</button>
        ${row.rich_menu_id ? `<button class="btn btn-sync" style="background:#e8f0fe;color:#3b5bdb" onclick="applyRichMenu('${row.audience_id}','${row.rich_menu_id}')">套用選單</button>` : ''}
        <button class="btn btn-danger" onclick="deleteAudienceRow('${row.audience_id}',${row.index})">刪除</button>
      </td>
    </tr>`;
  }).join('');

  const tbody = document.getElementById('aud-tbody');
  if (tbody) tbody.innerHTML = rows || '<tr><td colspan="6" class="empty">尚無資料</td></tr>';

  // 渲染分頁
  let paginationHtml = '';
  if (pages > 1) {
    paginationHtml += `<button class="btn" onclick="goPage(${_currentPage - 1})" ${_currentPage === 1 ? 'disabled' : ''}>上一頁</button>`;
    for (let p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - _currentPage) <= 2) {
        paginationHtml += `<button class="btn ${p === _currentPage ? 'btn-primary' : ''}" onclick="goPage(${p})">${p}</button>`;
      } else if (Math.abs(p - _currentPage) === 3) {
        paginationHtml += '<span style="padding:8px">...</span>';
      }
    }
    paginationHtml += `<button class="btn" onclick="goPage(${_currentPage + 1})" ${_currentPage === pages ? 'disabled' : ''}>下一頁</button>`;
  }

  const pagEl = document.getElementById('aud-pagination');
  if (pagEl) pagEl.innerHTML = paginationHtml;
}

function goPage(page) {
  const filtered = getFilteredData();
  const pages    = Math.ceil(filtered.length / _pageSize) || 1;
  if (page < 1 || page > pages) return;
  _currentPage = page;
  refreshAudienceTable();
}

function searchAudience(kw) {
  _searchKeyword = kw;
  _currentPage   = 1;
  refreshAudienceTable();
}

function sortAudience(key) {
  if (_sortKey === key) {
    _sortAsc = !_sortAsc;
  } else {
    _sortKey = key;
    _sortAsc = true;
  }
  _currentPage = 1;
  refreshAudienceTable();
}

// ===== 建立 / 編輯 =====
var _audEditIndex = null;
var _audEditId    = null;

function openCreateAudienceModal() {
  _audEditIndex = null;
  _audEditId    = null;
  document.getElementById('audienceModalTitle').textContent = '建立受眾';
  document.getElementById('aud-save-btn').textContent       = '建立';
  document.getElementById('aud-name').value     = '';
  document.getElementById('aud-keyword').value  = '';
  document.getElementById('aud-richmenu').value = '';
  document.getElementById('audienceModal').classList.add('show');
  _renderAudienceTagLinkSection(null);
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
  _renderAudienceTagLinkSection(row.audience_id);
}

/**
 * 渲染「連結標籤」勾選清單
 * currentAudienceId 為 null 時（新增受眾情境）：清單全部不勾選
 * currentAudienceId 有值時（編輯受眾情境）：先查目前已連結的標籤，對應勾選
 */
async function _renderAudienceTagLinkSection(currentAudienceId) {
  const container = document.getElementById('audModalTagLinkSection');
  container.innerHTML = '載入中...';

  if (!_tagListCacheForAudience) {
    const tagRes = await apiCall({ action: 'getTagCatalogList' });
    _tagListCacheForAudience = (tagRes.success ? tagRes.data.list : []) || [];
  }

  if (_tagListCacheForAudience.length === 0) {
    container.innerHTML = '<span style="color:#999">目前沒有任何標籤可連結</span>';
    return;
  }

  let linkedIds = {};
  if (currentAudienceId) {
    const linkRes = await apiCall({ action: 'getAudienceTagLinks', audienceId: currentAudienceId });
    if (linkRes.success) {
      linkRes.data.list.forEach(function(l) { linkedIds[l.tagId] = true; });
    }
  }

  let html = '';
  _tagListCacheForAudience.forEach(function(t) {
    const checked = linkedIds[t.tagId] ? 'checked' : '';
    html += '<label style="display:block;padding:2px 0;cursor:pointer;">'
      + '<input type="checkbox" value="' + t.tagId + '" ' + checked + '> '
      + t.name
      + '</label>';
  });
  container.innerHTML = html;
}

async function saveAudience() {
  const name       = document.getElementById('aud-name').value.trim();
  const keyword    = document.getElementById('aud-keyword').value.trim();
  const richMenuId = document.getElementById('aud-richmenu').value;

  if (!name) return showToast('請填入受眾名稱', 'error');

  let res;
  if (_audEditIndex !== null) {
    res = await apiCall({ action: 'updateAudience', index: _audEditIndex, name, keyword, rich_menu_id: richMenuId });
  } else {
    res = await apiCall({ action: 'createAudience', name, keyword, rich_menu_id: richMenuId });
  }

  if (!res.success) {
    showToast(res.message || '失敗', 'error');
    return;
  }

  const finalAudienceId = _audEditId || res.data.audience_id;
  const checkboxes = document.querySelectorAll('#audModalTagLinkSection input[type=checkbox]:checked');
  const tagIds = Array.prototype.map.call(checkboxes, function(cb) { return cb.value; });
  await apiCall({ action: 'setAudienceTagLinks', audienceId: finalAudienceId, tagIds: tagIds });

  showToast(_audEditIndex !== null ? '更新成功' : '受眾建立成功');
  closeAudienceModal();
  loadAudience();
}

function closeAudienceModal() {
  document.getElementById('audienceModal').classList.remove('show');
  _audEditIndex = null;
  _audEditId    = null;
}

// ===== 匯入 UID =====
var _importAudId = null;

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

// ===== 同步人數 =====
async function syncCount(audienceId, index) {
  const res = await apiCall({ action: 'syncAudienceCount', audience_id: audienceId });
  if (res.success) {
    // 更新本地資料
    const found = _allAudienceData.find(function(r) { return r.audience_id === audienceId; });
    if (found) found.count = res.data.count;
    showToast('已同步：' + res.data.count + ' 人');
    refreshAudienceTable();
  } else {
    showToast(res.message || '同步失敗', 'error');
  }
}

// ===== 套用圖文選單 =====
async function applyRichMenu(audienceId, richMenuId) {
  if (!confirmDialog('確定要對此受眾所有成員套用圖文選單？\n人數較多時需要一些時間。')) return;
  showToast('套用中，請稍候...');
  const res = await apiCall({
    action:       'applyRichMenuToAudience',
    audience_id:  audienceId,
    rich_menu_id: richMenuId
  });
  if (res.success) {
    showToast(res.data.message);
  } else {
    showToast(res.message || '套用失敗', 'error');
  }
}

// ===== 刪除 =====
async function deleteAudienceRow(audienceId, index) {
  if (!confirmDialog('確定要刪除這個受眾？此操作無法復原。')) return;
  const res = await apiCall({ action: 'deleteAudience', audience_id: audienceId, index });
  if (res.success) {
    showToast('已刪除');
    loadAudience();
  } else {
    showToast(res.message || '刪除失敗', 'error');
  }
}

// ===== 查看受眾成員 =====
async function viewAudienceMembers(audienceId, encodedName) {
  const name = decodeURIComponent(encodedName || '') || audienceId;
  document.getElementById('membersModalTitle').textContent = '受眾成員：' + name;
  document.getElementById('membersModalCount').textContent = '載入中...';
  document.getElementById('membersModalTbody').innerHTML = '';
  document.getElementById('audienceMembersModal').classList.add('show');

  const res = await apiCall({ action: 'getAudienceMembers', audience_id: audienceId });
  if (!res.success) {
    document.getElementById('membersModalCount').textContent = '載入失敗：' + res.message;
    return;
  }

  const list = res.data.list || [];
  document.getElementById('membersModalCount').textContent = '共 ' + list.length + ' 人';

  const rows = list.map(function(m) {
    return `<tr>
      <td style="font-size:12px;color:#888">${m.userId}</td>
      <td>${m.displayName || '-'}</td>
      <td>${m.phone || '-'}</td>
      <td>${m.keyword || '-'}</td>
    </tr>`;
  }).join('');

  document.getElementById('membersModalTbody').innerHTML = rows || '<tr><td colspan="4" class="empty">尚無成員</td></tr>';
}

function closeAudienceMembersModal() {
  document.getElementById('audienceMembersModal').classList.remove('show');
}
