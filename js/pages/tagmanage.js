/**
 * pages/tagmanage.js
 * 標籤管理頁面：標籤主檔管理 + 使用者標籤查詢/編輯
 */

var _tagCatalogData = [];
var _selectedTagId = null;

function loadTagManage() {
  var html = ''
    + '<h2 class="page-title">標籤管理</h2>'
    + '<div class="tag-manage-layout">'
    + '  <div class="tag-manage-col">'
    + '    <div class="card-header-row">'
    + '      <h3>標籤主檔</h3>'
    + '      <button class="btn btn-primary" onclick="openCreateTagModal()">+ 新增標籤</button>'
    + '    </div>'
    + '    <input type="text" id="tagCatalogFilter" placeholder="搜尋標籤名稱/分類" oninput="filterTagCatalog()" class="input-search">'
    + '    <div id="tagCatalogList">載入中...</div>'
    + '    <div id="tagUsersPanel"></div>'
    + '  </div>'
    + '  <div class="tag-manage-col">'
    + '    <h3>使用者標籤查詢</h3>'
    + '    <input type="text" id="userSearchInput" placeholder="輸入 UserID 或顯示名稱" oninput="searchTagUsers()" class="input-search">'
    + '    <div id="userSearchResults"></div>'
    + '    <div id="userTagDetail"></div>'
    + '  </div>'
    + '</div>'
    + _buildTagModalHtml()
    + _buildCreateAudienceModalHtml();


function _buildCreateAudienceModalHtml() {
  return ''
    + '<div id="createAudienceModal" class="modal-overlay" style="display:none;">'
    + '  <div class="modal">'
    + '    <h3>建立為受眾</h3>'
    + '    <input type="hidden" id="createAudienceTagId">'
    + '    <p id="createAudienceTagInfo" style="color:#666;font-size:13px;margin-bottom:12px;"></p>'
    + '    <label>受眾名稱</label>'
    + '    <input type="text" id="createAudienceName" class="input-full" placeholder="例如：01.蘆洲區_2026年7月">'
    + '    <div class="modal-footer">'
    + '      <button class="btn-cancel" onclick="closeModal(\'createAudienceModal\')">取消</button>'
    + '      <button class="btn btn-primary" onclick="submitCreateAudienceFromTag()">建立受眾</button>'
    + '    </div>'
    + '  </div>'
    + '</div>';
}  

  setContent(html);
  loadTagCatalogList();
}

function _buildTagModalHtml() {
  return ''
    + '<div id="tagModal" class="modal-overlay" style="display:none;">'
    + '  <div class="modal">'
    + '    <h3 id="tagModalTitle">新增標籤</h3>'
    + '    <input type="hidden" id="tagModalTagId">'
    + '    <label>標籤名稱</label>'
    + '    <input type="text" id="tagModalName" class="input-full">'
    + '    <label>分類</label>'
    + '    <input type="text" id="tagModalCategory" class="input-full" placeholder="如：行政區、社區、電力團隊">'
    + '    <label>狀態</label>'
    + '    <select id="tagModalStatus" class="input-full">'
    + '      <option value="啟用">啟用</option>'
    + '      <option value="停用">停用</option>'
    + '    </select>'
    + '    <label>備註</label>'
    + '    <input type="text" id="tagModalNote" class="input-full">'
    + '    <div class="modal-footer">'
    + '      <button class="btn-cancel" onclick="closeModal(\'tagModal\')">取消</button>'
    + '      <button class="btn btn-primary" onclick="submitTagModal()">儲存</button>'
    + '    </div>'
    + '  </div>'
    + '</div>';
}

function loadTagCatalogList() {
  showLoading();
  apiCall({ action: 'getTagCatalogList' }).then(function (res) {
    hideLoading();
    if (!res.success) {
      showToast('讀取標籤主檔失敗：' + res.message, 'error');
      return;
    }
    _tagCatalogData = res.data.list;
    renderTagCatalogList(_tagCatalogData);
  }).catch(function (err) {
    hideLoading();
    showToast('讀取標籤主檔發生錯誤', 'error');
  });
}

function renderTagCatalogList(list) {
  if (!list || list.length === 0) {
    document.getElementById('tagCatalogList').innerHTML = '<p class="empty">目前沒有標籤，點右上角新增</p>';
    return;
  }

  var html = '<table><thead><tr>'
    + '<th>標籤名稱</th><th>分類</th><th>狀態</th><th>使用人數</th><th>操作</th>'
    + '</tr></thead><tbody>';

  for (var i = 0; i < list.length; i++) {
    var tag = list[i];
    var statusBadge = tag.status === '啟用'
      ? '<span class="badge badge-green">啟用</span>'
      : '<span class="badge badge-gray">停用</span>';

    var isSelected = (_selectedTagId === tag.tagId);
    html += '<tr class="' + (isSelected ? 'tag-row-selected' : '') + '" onclick="viewTagUsers(\'' + tag.tagId + '\', \'' + escHtml(tag.name) + '\')" style="cursor:pointer">'
      + '<td>' + escHtml(tag.name) + '</td>'
      + '<td>' + escHtml(tag.category || '-') + '</td>'
      + '<td>' + statusBadge + '</td>'
      + '<td>' + tag.userCount + '</td>'
      + '<td>'
      + '<button class="btn-icon" onclick="event.stopPropagation(); openEditTagModal(\'' + tag.tagId + '\')">✏️</button>'
      + (tag.status === '啟用'
          ? '<button class="btn-icon" onclick="event.stopPropagation(); confirmDeactivateTag(\'' + tag.tagId + '\', \'' + escHtml(tag.name) + '\')">🚫</button>'
          : '')
      + (tag.userCount === 0
          ? '<button class="btn-icon" onclick="event.stopPropagation(); confirmDeleteTag(\'' + tag.tagId + '\', \'' + escHtml(tag.name) + '\')">🗑️</button>'
          : '')
      + '</td>'
      + '</tr>';
  }

  html += '</tbody></table>';
  document.getElementById('tagCatalogList').innerHTML = html;
}

function viewTagUsers(tagId, tagName) {
  _selectedTagId = tagId;
  renderTagCatalogList(_tagCatalogData); // 重繪列表，讓選中列高亮

  showLoading();
  apiCall({ action: 'getTagUsers', tagId: tagId }).then(function (res) {
    hideLoading();
    if (!res.success) {
      showToast('讀取失敗：' + res.message, 'error');
      return;
    }
    renderTagUsersPanel(res.data.tagName, res.data.list);
  }).catch(function (err) {
    hideLoading();
    showToast('讀取發生錯誤', 'error');
  });
}

function renderTagUsersPanel(tagName, list) {
  var html = '<div class="tag-users-panel">'
    + '<div class="card-header-row">'
    + '<h4>「' + escHtml(tagName) + '」的使用者（共 ' + list.length + ' 人）</h4>'
    + (list.length > 0
        ? '<button class="btn btn-primary" onclick="openCreateAudienceModal(\'' + _selectedTagId + '\', \'' + escHtml(tagName) + '\', ' + list.length + ')">建立為受眾</button>'
        : '')
    + '</div>';
  

  if (list.length === 0) {
    html += '<p class="empty">目前沒有使用者掛這個標籤</p>';
  } else {
    html += '<ul class="user-search-list">';
    for (var i = 0; i < list.length; i++) {
      var u = list[i];
      html += '<li onclick="loadUserTagDetail(\'' + u.userId + '\')">'
        + escHtml(u.displayName || '(無名稱)')
        + ' <span class="user-id-hint">' + escHtml(u.userId) + '</span>'
        + '</li>';
    }
    html += '</ul>';
  }

  html += '</div>';
  document.getElementById('tagUsersPanel').innerHTML = html;
}

function openCreateAudienceModal(tagId, tagName, userCount) {
  document.getElementById('createAudienceTagId').value = tagId;
  document.getElementById('createAudienceTagInfo').textContent =
    '將把「' + tagName + '」目前的 ' + userCount + ' 位使用者，建立成一個新的受眾（會直接寫入 LINE 平台）';
  document.getElementById('createAudienceName').value = tagName + '_' + formatDate(new Date());
  openModal('createAudienceModal');
}

function submitCreateAudienceFromTag() {
  var tagId = document.getElementById('createAudienceTagId').value;
  var audienceName = document.getElementById('createAudienceName').value.trim();

  if (!audienceName) {
    showToast('請填入受眾名稱', 'error');
    return;
  }

  showLoading();
  apiCall({ action: 'createAudienceFromTag', tagId: tagId, audienceName: audienceName }).then(function (res) {
    hideLoading();
    if (!res.success) {
      showToast('建立失敗：' + res.message, 'error');
      return;
    }
    showToast('受眾建立成功！共匯入 ' + res.data.count + ' 位使用者', 'success');
    closeModal('createAudienceModal');
  }).catch(function (err) {
    hideLoading();
    showToast('建立發生錯誤', 'error');
  });
}

function filterTagCatalog() {
  var keyword = document.getElementById('tagCatalogFilter').value.trim();
  if (!keyword) {
    renderTagCatalogList(_tagCatalogData);
    return;
  }
  var filtered = _tagCatalogData.filter(function (tag) {
    return tag.name.indexOf(keyword) !== -1 || (tag.category && tag.category.indexOf(keyword) !== -1);
  });
  renderTagCatalogList(filtered);
}

function openCreateTagModal() {
  document.getElementById('tagModalTitle').textContent = '新增標籤';
  document.getElementById('tagModalTagId').value = '';
  document.getElementById('tagModalName').value = '';
  document.getElementById('tagModalCategory').value = '';
  document.getElementById('tagModalStatus').value = '啟用';
  document.getElementById('tagModalNote').value = '';
  openModal('tagModal');
}

function openEditTagModal(tagId) {
  var tag = null;
  for (var i = 0; i < _tagCatalogData.length; i++) {
    if (_tagCatalogData[i].tagId === tagId) { tag = _tagCatalogData[i]; break; }
  }
  if (!tag) return;
  document.getElementById('tagModalTitle').textContent = '編輯標籤';
  document.getElementById('tagModalTagId').value = tag.tagId;
  document.getElementById('tagModalName').value = tag.name;
  document.getElementById('tagModalCategory').value = tag.category || '';
  document.getElementById('tagModalStatus').value = tag.status;
  document.getElementById('tagModalNote').value = tag.note || '';
  openModal('tagModal');
}

function submitTagModal() {
  var tagId = document.getElementById('tagModalTagId').value;
  var name = document.getElementById('tagModalName').value.trim();
  var category = document.getElementById('tagModalCategory').value.trim();
  var status = document.getElementById('tagModalStatus').value;
  var note = document.getElementById('tagModalNote').value.trim();

  if (!name) {
    showToast('標籤名稱為必填', 'error');
    return;
  }

  var actionName = tagId ? 'updateTag' : 'createTag';
  var params = { action: actionName, name: name, category: category, status: status, note: note };
  if (tagId) params.tagId = tagId;

  showLoading();
  apiCall(params).then(function (res) {
    hideLoading();
    if (!res.success) {
      showToast('儲存失敗：' + res.message, 'error');
      return;
    }
    showToast('儲存成功', 'success');
    closeModal('tagModal');
    loadTagCatalogList();
  }).catch(function (err) {
    hideLoading();
    showToast('儲存發生錯誤', 'error');
  });
}

function confirmDeactivateTag(tagId, tagName) {
  confirmAndRun('確定要停用標籤「' + tagName + '」嗎？已經貼過這個標籤的使用者不會受影響，只是無法再新增。', async function () {
    showLoading();
    try {
      var res = await apiCall({ action: 'deactivateTag', tagId: tagId });
      hideLoading();
      if (!res.success) {
        showToast('停用失敗：' + res.message, 'error');
        return;
      }
      showToast('已停用', 'success');
      loadTagCatalogList();
    } catch (err) {
      hideLoading();
      showToast('停用發生錯誤', 'error');
    }
  });
}

function confirmDeleteTag(tagId, tagName) {
  confirmAndRun('確定要「永久刪除」標籤「' + tagName + '」嗎？這個動作無法復原（僅限無人使用的標籤才能刪除）。', async function () {
    showLoading();
    try {
      var res = await apiCall({ action: 'deleteTag', tagId: tagId });
      hideLoading();
      if (!res.success) {
        showToast('刪除失敗：' + res.message, 'error');
        return;
      }
      showToast('已刪除', 'success');
      loadTagCatalogList();
    } catch (err) {
      hideLoading();
      showToast('刪除發生錯誤', 'error');
    }
  });
}

// ===== 使用者標籤查詢區 =====

var _userSearchTimer = null;

function searchTagUsers() {
  var keyword = document.getElementById('userSearchInput').value.trim();
  clearTimeout(_userSearchTimer);
  if (!keyword) {
    document.getElementById('userSearchResults').innerHTML = '';
    return;
  }
  _userSearchTimer = setTimeout(function () {
    apiCall({ action: 'searchTagUsers', keyword: keyword }).then(function (res) {
      if (!res.success) return;
      renderUserSearchResults(res.data.list);
    });
  }, 300);
}

function renderUserSearchResults(list) {
  if (!list || list.length === 0) {
    document.getElementById('userSearchResults').innerHTML = '<p class="empty">找不到符合的使用者</p>';
    return;
  }
  var html = '<ul class="user-search-list">';
  for (var i = 0; i < list.length; i++) {
    var u = list[i];
    html += '<li onclick="loadUserTagDetail(\'' + u.userId + '\')">'
      + escHtml(u.displayName || '(無名稱)') + ' <span class="user-id-hint">' + escHtml(u.userId) + '</span>'
      + '</li>';
  }
  html += '</ul>';
  document.getElementById('userSearchResults').innerHTML = html;
}

function loadUserTagDetail(userId) {
  showLoading();
  apiCall({ action: 'getUserTags', userId: userId }).then(function (res) {
    hideLoading();
    if (!res.success) {
      showToast('讀取失敗：' + res.message, 'error');
      return;
    }
    renderUserTagDetail(res.data.user, res.data.tags);
  }).catch(function (err) {
    hideLoading();
    showToast('讀取發生錯誤', 'error');
  });
}

function renderUserTagDetail(user, tags) {
  var tagChips = '';
  if (tags.length === 0) {
    tagChips = '<p class="empty">目前沒有任何標籤</p>';
  } else {
    tagChips = '<div class="tag-chips">';
    for (var i = 0; i < tags.length; i++) {
      var t = tags[i];
      tagChips += '<span class="tag-chip">' + escHtml(t.name)
        + ' <a href="#" onclick="removeUserTagConfirm(\'' + user.userId + '\', \'' + t.tagId + '\', \'' + escHtml(t.name) + '\'); return false;">×</a>'
        + '</span>';
    }
    tagChips += '</div>';
  }

  var tagOptions = '<option value="">-- 選擇要新增的標籤 --</option>';
  for (var j = 0; j < _tagCatalogData.length; j++) {
    if (_tagCatalogData[j].status === '啟用') {
      tagOptions += '<option value="' + _tagCatalogData[j].tagId + '">' + escHtml(_tagCatalogData[j].name) + '</option>';
    }
  }

  var html = '<div class="user-tag-detail-box">'
    + '<h4>' + escHtml(user.displayName || '(無名稱)') + '</h4>'
    + '<p class="user-id-hint">' + escHtml(user.userId) + ' ｜ 狀態：' + escHtml(user.status) + '</p>'
    + tagChips
    + '<div class="add-tag-row">'
    + '<select id="addTagSelect_' + user.userId + '" class="input-full">' + tagOptions + '</select>'
    + '<button class="btn btn-primary" onclick="addUserTagFromDetail(\'' + user.userId + '\')">新增標籤</button>'
    + '</div>'
    + '</div>';

  document.getElementById('userTagDetail').innerHTML = html;
}

function addUserTagFromDetail(userId) {
  var select = document.getElementById('addTagSelect_' + userId);
  var tagId = select.value;
  if (!tagId) {
    showToast('請先選擇標籤', 'error');
    return;
  }
  showLoading();
  apiCall({ action: 'addUserTag', userId: userId, tagId: tagId, operator: (authState && authState.email) || '後台管理員' }).then(function (res) {
    hideLoading();
    if (!res.success) {
      showToast('新增失敗：' + res.message, 'error');
      return;
    }
    showToast('已新增標籤', 'success');
    loadUserTagDetail(userId);
  }).catch(function (err) {
    hideLoading();
    showToast('新增發生錯誤', 'error');
  });
}

function removeUserTagConfirm(userId, tagId, tagName) {
  confirmAndRun('確定要移除標籤「' + tagName + '」嗎？', async function () {
    showLoading();
    try {
      var res = await apiCall({ action: 'removeUserTag', userId: userId, tagId: tagId });
      hideLoading();
      if (!res.success) {
        showToast('移除失敗：' + res.message, 'error');
        return;
      }
      showToast('已移除', 'success');
      loadUserTagDetail(userId);
    } catch (err) {
      hideLoading();
      showToast('移除發生錯誤', 'error');
    }
  });
}
