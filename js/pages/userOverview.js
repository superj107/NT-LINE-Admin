/** 檔名: userOverview.js | 所屬: GitHub Pages前端 */
/**
 * pages/userOverview.js
 * 用戶總覽：列出所有用戶與其標籤，支援搜尋、人工貼標/移除標籤
 * 自動貼標由 Webhook 端的 autoTagByKeyword 負責，這裡只處理人工操作
 */

var _userOverviewData = [];
var _userOverviewPage = 1;
var _userOverviewPageSize = 20;
var _userOverviewSearch = '';
var _userOverviewTagOptions = [];

function loadUserOverview() {
  _userOverviewSearch = '';
  var html = ''
    + '<h2 class="page-title">用戶總覽</h2>'
    + '<div class="card">'
    + '  <input type="text" id="userOverviewSearch" placeholder="搜尋顯示名稱或標籤..." class="input-search" oninput="filterUserOverview()">'
    + '  <span id="userOverviewCount" style="color:#888;font-size:13px;margin-left:8px;"></span>'
    + '  <table style="margin-top:16px"><thead><tr>'
    + '    <th>顯示名稱</th><th>最後互動</th><th>標籤</th><th>操作</th>'
    + '  </tr></thead><tbody id="userOverviewTbody"></tbody></table>'
    + '  <div id="userOverviewPagination" style="display:flex;gap:8px;justify-content:center;margin-top:16px"></div>'
    + '</div>'
    + _buildAddTagModalHtml();

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
    + '    <label>選擇標籤</label>'
    + '    <select id="addTagSelectModal" class="input-full"></select>'
    + '    <div class="modal-footer">'
    + '      <button class="btn-cancel" onclick="closeModal(\'addTagToUserModal\')">取消</button>'
    + '      <button class="btn btn-primary" onclick="submitAddTagToUser()">新增</button>'
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
    _userOverviewPage = 1;
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
    if ((u.displayName || '').toLowerCase().indexOf(kw) !== -1) return true;
    for (var i = 0; i < u.tags.length; i++) {
      if ((u.tags[i].name || '').toLowerCase().indexOf(kw) !== -1) return true;
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

    var chips = '';
    for (var j = 0; j < u.tags.length; j++) {
      var t = u.tags[j];
      chips += '<span class="tag-chip">' + escHtml(t.name)
        + ' <a href="#" onclick="removeUserTagFromOverview(\'' + u.userId + '\', \'' + t.tagId + '\', \'' + escHtml(t.name) + '\'); return false;">×</a>'
        + '</span> ';
    }
    if (u.tags.length === 0) chips = '<span style="color:#bbb">無標籤</span>';

    html += '<tr>'
      + '<td>' + escHtml(u.displayName || '(無名稱)') + '<br><span class="user-id-hint">' + escHtml(u.userId) + '</span></td>'
      + '<td>' + lastActiveText + '</td>'
      + '<td>' + chips + '</td>'
      + '<td><button class="btn btn-primary" onclick="openAddTagToUserModal(\'' + u.userId + '\', \'' + escHtml(u.displayName || '') + '\')">+ 貼標籤</button></td>'
      + '</tr>';
  }

  document.getElementById('userOverviewTbody').innerHTML = html || '<tr><td colspan="4" class="empty">找不到符合的用戶</td></tr>';

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

async function openAddTagToUserModal(userId, displayName) {
  document.getElementById('addTagUserId').value = userId;
  document.getElementById('addTagUserName').textContent = '對象：' + (displayName || userId);

  var select = document.getElementById('addTagSelectModal');
  select.innerHTML = '<option value="">載入中...</option>';
  openModal('addTagToUserModal');

  if (_userOverviewTagOptions.length === 0) {
    var res = await apiCall({ action: 'getTagCatalogList' });
    if (res.success) {
      _userOverviewTagOptions = res.data.list.filter(function (t) { return t.status === '啟用'; });
    }
  }

  var options = '<option value="">-- 選擇標籤 --</option>';
  for (var i = 0; i < _userOverviewTagOptions.length; i++) {
    options += '<option value="' + _userOverviewTagOptions[i].tagId + '">' + escHtml(_userOverviewTagOptions[i].name) + '</option>';
  }
  select.innerHTML = options;
}

async function submitAddTagToUser() {
  var userId = document.getElementById('addTagUserId').value;
  var tagId = document.getElementById('addTagSelectModal').value;
  if (!tagId) {
    showToast('請選擇標籤', 'error');
    return;
  }

  showLoading();
  try {
    var res = await apiCall({ action: 'addUserTag', userId: userId, tagId: tagId, operator: (authState && authState.email) || '後台管理員' });
    hideLoading();
    if (!res.success) {
      showToast('新增失敗：' + res.message, 'error');
      return;
    }
    showToast('已新增標籤', 'success');
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
