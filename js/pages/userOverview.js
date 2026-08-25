/** userOverview.js, GitHub Pages前端 */
/**
 * pages/userOverview.js
 * 用戶總覽：列出所有用戶與其標籤/人工註記，支援搜尋、人工貼標/移除標籤、編輯人工註記
 * 自動貼標由 Webhook 端的 autoTagByKeyword 負責，這裡只處理人工操作
 * ★2026-08-13：貼標籤Modal改為複選（原本為單選）
 * ★2026-08-18：搜尋比對範圍加入UserID（原本只比對顯示名稱/標籤名稱，用UID搜尋一律查不到）
 */
var _userOverviewData = [];
var _userOverviewPage = 1;
var _userOverviewPageSize = 20;
var _userOverviewSearch = '';
var _userOverviewTagOptions = [];
var _addTagSelectedIds = [];
function loadUserOverview() {
  _userOverviewSearch = '';
  _userOverviewPage = 1;   // ★新增：只在真正「重新進入這個頁面」時重置
  var html = ''
    + '<h2 class="page-title">用戶總覽</h2>'
    + '<div class="card">'
    + '  <input type="text" id="userOverviewSearch" placeholder="搜尋顯示名稱、UID或標籤..." class="input-search" value="" oninput="filterUserOverview()">'
    + '  <span id="userOverviewCount" style="color:#888;font-size:13px;margin-left:8px;"></span>'
    + '  <table style="margin-top:16px"><thead><tr>'
    + '    <th>顯示名稱</th><th>最後互動</th><th>標籤</th><th>人工註記</th><th>操作</th>'
    + '  </tr></thead><tbody id="userOverviewTbody"></tbody></table>'
    + '  <div id="userOverviewPagination" style="display:flex;gap:8px;justify-content:center;margin-top:16px"></div>'
    + '</div>'
    + _buildAddTagModalHtml()
    + _buildEditNoteModalHtml();
  setContent(html);
  loadUserOverviewData();
}
function _buildAddTagModalHtml() {
  return ''
    + '<div id="addTagToUserModal" class="modal-overlay" style="display:none;">'
    + '  <div class="modal">'
    + '    <h3>貼標籤</h3>'
    + '    <input type="hidden" id="addTagUserId">'
    + '    <p id="addTagUserName" style="color:#666;font-size:13px;margin-bottom:12px;"></p>'
    + '    <label>選擇標籤（可複選）</label>'
    + '    <input type="text" id="addTagSearchInput" placeholder="搜尋標籤..." class="input-search" oninput="filterAddTagOptions()">'
    + '    <div id="addTagOptionsList" style="max-height:200px;overflow-y:auto;border:1px solid #e0e0e0;border-radius:8px;padding:8px;margin-bottom:12px;font-size:14px;">載入中...</div>'
    + '    <div class="modal-footer">'
    + '      <button class="btn-cancel" onclick="closeModal(\'addTagToUserModal\')">取消</button>'
    + '      <button class="btn btn-primary" onclick="submitAddTagToUser()">新增</button>'
    + '    </div>'
    + '  </div>'
    + '</div>';
}
function _buildEditNoteModalHtml() {
  return ''
    + '<div id="editNoteModal" class="modal-overlay" style="display:none;">'
    + '  <div class="modal">'
    + '    <h3>編輯人工註記</h3>'
    + '    <input type="hidden" id="editNoteUserId">'
    + '    <p id="editNoteUserName" style="color:#666;font-size:13px;margin-bottom:12px;"></p>'
    + '    <label>人工註記（自由文字，多筆建議用、或,分隔，僅供人工篩選用，不影響正式標籤系統）</label>'
    + '    <textarea id="editNoteTextarea" class="input-full" style="min-height:80px;resize:vertical;"></textarea>'
    + '    <div class="modal-footer">'
    + '      <button class="btn-cancel" onclick="closeModal(\'editNoteModal\')">取消</button>'
    + '      <button class="btn btn-primary" onclick="submitEditNote()">儲存</button>'
    + '    </div>'
    + '  </div>'
    + '</div>';
}
function loadUserOverviewData() {
  showLoading();
  apiCall({ action: 'getUserOverview' }).then(function (res) {
    hideLoading();
    if (!res.success) {
      showToast('讀取失敗：' + res.message, 'error');
      return;
    }
    _userOverviewData = res.data.list;
    // ★移除：_userOverviewPage = 1;  不要在這裡重置頁碼
    renderUserOverviewTable();
  }).catch(function (err) {
    hideLoading();
    showToast('讀取發生錯誤', 'error');
  });
}
function getFilteredUserOverview() {
  if (!_userOverviewSearch) return _userOverviewData;
  var kw = _userOverviewSearch.toLowerCase();
  return _userOverviewData.filter(function (u) {
    if (String(u.displayName || '').toLowerCase().indexOf(kw) !== -1) return true;
    // ★新增：UserID也納入搜尋比對範圍，原本只比對顯示名稱/標籤名稱，導致用UID搜尋永遠查不到
    if (String(u.userId || '').toLowerCase().indexOf(kw) !== -1) return true;
    var tags = u.tags || [];
    for (var i = 0; i < tags.length; i++) {
      if (String(tags[i].name || '').toLowerCase().indexOf(kw) !== -1) return true;
    }
    return false;
  });
}
function filterUserOverview() {
  _userOverviewSearch = document.getElementById('userOverviewSearch').value.trim();
  _userOverviewPage = 1;
  renderUserOverviewTable();
}
function renderUserOverviewTable() {
  var filtered = getFilteredUserOverview();
  var total = filtered.length;
  var pages = Math.ceil(total / _userOverviewPageSize) || 1;
  if (_userOverviewPage > pages) _userOverviewPage = pages;
  document.getElementById('userOverviewCount').textContent = '共 ' + total + ' 位用戶';
  var start = (_userOverviewPage - 1) * _userOverviewPageSize;
  var paged = filtered.slice(start, start + _userOverviewPageSize);
  var html = '';
  for (var i = 0; i < paged.length; i++) {
    var u = paged[i];
    var lastActiveText = u.lastActive ? formatDate(new Date(u.lastActive)) : '-';
    var tags = u.tags || [];
    var chips = '';
    for (var j = 0; j < tags.length; j++) {
      var t = tags[j];
      chips += '<span class="tag-chip">' + escHtml(t.name)
        + ' <a href="#" onclick="removeUserTagFromOverview(\'' + u.userId + '\', \'' + t.tagId + '\', \'' + escHtml(t.name) + '\'); return false;">×</a>'
        + '</span> ';
    }
    if (tags.length === 0) chips = '<span style="color:#bbb">無標籤</span>';
    var noteDisplay = u.note ? escHtml(u.note) : '<span style="color:#bbb">（無）</span>';
    html += '<tr>'
      + '<td>' + escHtml(u.displayName || '(無名稱)') + '<br><span class="user-id-hint">' + escHtml(u.userId) + '</span></td>'
      + '<td>' + lastActiveText + '</td>'
      + '<td>' + chips + '</td>'
      + '<td style="max-width:200px;">' + noteDisplay
      + ' <a href="#" onclick="openEditNoteModal(\'' + u.userId + '\', \'' + escHtml(u.displayName || '') + '\', \'' + escHtml(u.note || '').replace(/'/g, '&#39;') + '\'); return false;">✏️</a>'
      + '</td>'
      + '<td><button class="btn btn-primary" onclick="openAddTagToUserModal(\'' + u.userId + '\', \'' + escHtml(u.displayName || '') + '\')">+ 貼標籤</button></td>'
      + '</tr>';
  }
  document.getElementById('userOverviewTbody').innerHTML = html || '<tr><td colspan="5" class="empty">找不到符合的用戶</td></tr>';
  var paginationHtml = '';
  if (pages > 1) {
    paginationHtml += '<button class="btn" onclick="goUserOverviewPage(' + (_userOverviewPage - 1) + ')" ' + (_userOverviewPage === 1 ? 'disabled' : '') + '>上一頁</button>';
    for (var p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - _userOverviewPage) <= 2) {
        paginationHtml += '<button class="btn ' + (p === _userOverviewPage ? 'btn-primary' : '') + '" onclick="goUserOverviewPage(' + p + ')">' + p + '</button>';
      } else if (Math.abs(p - _userOverviewPage) === 3) {
        paginationHtml += '<span style="padding:8px">...</span>';
      }
    }
    paginationHtml += '<button class="btn" onclick="goUserOverviewPage(' + (_userOverviewPage + 1) + ')" ' + (_userOverviewPage === pages ? 'disabled' : '') + '>下一頁</button>';
  }
  document.getElementById('userOverviewPagination').innerHTML = paginationHtml;
}
function goUserOverviewPage(page) {
  var filtered = getFilteredUserOverview();
  var pages = Math.ceil(filtered.length / _userOverviewPageSize) || 1;
  if (page < 1 || page > pages) return;
  _userOverviewPage = page;
  renderUserOverviewTable();
}
// ===== 貼標籤 Modal（複選） =====
async function openAddTagToUserModal(userId, displayName) {
  document.getElementById('addTagUserId').value = userId;
  _addTagSelectedIds = [];
  document.getElementById('addTagUserName').textContent = '對象：' + (displayName || userId);
  document.getElementById('addTagSearchInput').value = '';
  var container = document.getElementById('addTagOptionsList');
  container.innerHTML = '載入中...';
  openModal('addTagToUserModal');
  if (_userOverviewTagOptions.length === 0) {
    var res = await apiCall({ action: 'getTagCatalogList' });
    if (res.success) {
      _userOverviewTagOptions = res.data.list.filter(function (t) { return t.status === '啟用'; });
    }
  }
  _renderAddTagOptions();
}
function _renderAddTagOptions() {
  var container = document.getElementById('addTagOptionsList');
  if (_userOverviewTagOptions.length === 0) {
    container.innerHTML = '<span style="color:#999">目前沒有可用的標籤</span>';
    return;
  }
  var html = '';
  for (var i = 0; i < _userOverviewTagOptions.length; i++) {
    var t = _userOverviewTagOptions[i];
    var label = (t.name || '').toLowerCase();
    var checked = _addTagSelectedIds.indexOf(t.tagId) !== -1;
    html += '<label class="tag-option-item" data-label="' + escHtml(label) + '" '
      + 'style="display:flex;align-items:center;gap:8px;padding:6px 8px;cursor:pointer;border-radius:6px;">'
      + '<input type="checkbox" value="' + t.tagId + '" style="width:auto;margin:0;" '
      + (checked ? 'checked' : '') + ' onchange="selectAddTagOption(\'' + t.tagId + '\', this)"> '
      + escHtml(t.name)
      + '</label>';
  }
  container.innerHTML = html;
}
function filterAddTagOptions() {
  var keyword = document.getElementById('addTagSearchInput').value.trim().toLowerCase();
  var items = document.querySelectorAll('#addTagOptionsList .tag-option-item');
  for (var i = 0; i < items.length; i++) {
    var label = items[i].getAttribute('data-label') || '';
    items[i].style.display = (!keyword || label.indexOf(keyword) !== -1) ? 'flex' : 'none';
  }
}
// ★改為勾選框切換勾選狀態（原本是點整列切換底色）
function selectAddTagOption(tagId, checkboxEl) {
  var idx = _addTagSelectedIds.indexOf(tagId);
  if (checkboxEl.checked) {
    if (idx === -1) _addTagSelectedIds.push(tagId);
  } else {
    if (idx !== -1) _addTagSelectedIds.splice(idx, 1);
  }
}
// ★改為依序新增每一個選中的標籤，並統計成功/失敗數量
async function submitAddTagToUser() {
  var userId = document.getElementById('addTagUserId').value;
  if (_addTagSelectedIds.length === 0) {
    showToast('請選擇至少一個標籤', 'error');
    return;
  }
  showLoading();
  try {
    var successCount = 0;
    var failMessages = [];
    for (var i = 0; i < _addTagSelectedIds.length; i++) {
      var res = await apiCall({
        action: 'addUserTag',
        userId: userId,
        tagId: _addTagSelectedIds[i],
        operator: (authState && authState.email) || '後台管理員'
      });
      if (res.success) {
        successCount++;
      } else {
        failMessages.push(res.message);
      }
    }
    hideLoading();
    if (failMessages.length > 0) {
      showToast(
        '成功新增 ' + successCount + ' 個，' + failMessages.length + ' 個失敗：' + failMessages.join('；'),
        successCount > 0 ? 'success' : 'error'
      );
    } else {
      showToast('已新增 ' + successCount + ' 個標籤', 'success');
    }
    closeModal('addTagToUserModal');
    loadUserOverviewData();
  } catch (err) {
    hideLoading();
    showToast('新增發生錯誤', 'error');
  }
}
function removeUserTagFromOverview(userId, tagId, tagName) {
  confirmAndRun('確定要移除「' + tagName + '」這個標籤嗎？', async function () {
    showLoading();
    try {
      var res = await apiCall({ action: 'removeUserTag', userId: userId, tagId: tagId });
      hideLoading();
      if (!res.success) {
        showToast('移除失敗：' + res.message, 'error');
        return;
      }
      showToast('已移除', 'success');
      loadUserOverviewData();
    } catch (err) {
      hideLoading();
      showToast('移除發生錯誤', 'error');
    }
  });
}
// ===== 人工註記編輯 =====
function openEditNoteModal(userId, displayName, currentNote) {
  document.getElementById('editNoteUserId').value = userId;
  document.getElementById('editNoteUserName').textContent = '對象：' + (displayName || userId);
  document.getElementById('editNoteTextarea').value = currentNote || '';
  openModal('editNoteModal');
}
async function submitEditNote() {
  var userId = document.getElementById('editNoteUserId').value;
  var note = document.getElementById('editNoteTextarea').value.trim();
  showLoading();
  try {
    var res = await apiCall({ action: 'updateUserNote', userId: userId, note: note });
    hideLoading();
    if (!res.success) {
      showToast('儲存失敗：' + res.message, 'error');
      return;
    }
    showToast('已儲存', 'success');
    closeModal('editNoteModal');
    loadUserOverviewData();
  } catch (err) {
    hideLoading();
    showToast('儲存發生錯誤', 'error');
  }
}
