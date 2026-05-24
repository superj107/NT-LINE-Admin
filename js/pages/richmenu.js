async function loadRichMenu() {
  setContent('<div class="loading">載入中...</div>');
  const res = await apiCall({ action: 'getRichMenuList' });
  if (!res.success) { setContent('<div class="loading">載入失敗</div>'); return; }
  renderRichMenu(res.data);
}

function renderRichMenu(data) {
  const rows = data.map(function(row) {
    const thumb = row.image_url
      ? `<img src="${row.image_url}" style="width:60px;height:30px;object-fit:cover;border-radius:4px">`
      : '-';
    return `<tr>
      <td>${row.name}</td>
      <td>${row.display_text || '-'}</td>
      <td>${row.layout || '-'}</td>
      <td>${thumb}</td>
      <td>${row.is_default ? '✅' : '-'}</td>
      <td style="font-size:11px;color:#888">${row.rich_menu_id || '-'}</td>
      <td>
        <button class="btn btn-edit" onclick="openUploadModal('${row.rich_menu_id}','${row.index}')">上傳圖片</button>
        <button class="btn btn-sync" onclick="setDefault('${row.rich_menu_id}','${row.index}')">設預設</button>
        <button class="btn btn-danger" onclick="deleteRichMenuRow('${row.rich_menu_id}',${row.index})">刪除</button>
      </td>
    </tr>`;
  }).join('');

  setContent(`
    <div class="page-title">圖文選單</div>
    <div class="card">
      <div class="toolbar">
        <button class="btn btn-primary" onclick="openCreateRmModal()">＋ 建立選單</button>
      </div>
      <table>
        <thead><tr>
          <th>名稱</th><th>顯示文字</th><th>版型</th><th>圖片</th><th>預設</th><th>選單ID</th><th>操作</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="7" class="empty">尚無圖文選單</td></tr>'}</tbody>
      </table>
    </div>

    <!-- 建立選單 Modal -->
    <div class="modal-overlay" id="rmCreateModal">
      <div class="modal" style="width:560px;max-height:90vh;overflow-y:auto">
        <h3>建立圖文選單</h3>
        <div class="form-group">
          <label>選單名稱</label>
          <input id="rm-name" type="text" placeholder="例：主選單">
        </div>
        <div class="form-group">
          <label>選單列文字</label>
          <input id="rm-display" type="text" placeholder="例：開啟選單">
        </div>
        <div class="form-group">
          <label>版型</label>
          <select id="rm-layout" onchange="renderRmBtnFields()">
            <option value="small_1">small_1（小版 1格）</option>
            <option value="small_2">small_2（小版 2格）</option>
            <option value="small_3">small_3（小版 3格）</option>
            <option value="large_3">large_3（大版 3格）</option>
            <option value="large_6">large_6（大版 6格）</option>
          </select>
        </div>
        <div id="rm-btn-fields"></div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeRmModal('rmCreateModal')">取消</button>
          <button class="btn btn-primary" onclick="submitCreateRm()">建立</button>
        </div>
      </div>
    </div>

    <!-- 上傳圖片 Modal -->
    <div class="modal-overlay" id="rmUploadModal">
      <div class="modal">
        <h3>上傳圖文選單圖片</h3>
        <p style="color:#888;font-size:13px;margin-bottom:16px">
          圖片需先上傳至 Google Drive，填入分享連結或檔案ID
        </p>
        <div class="form-group">
          <label>Google Drive 圖片網址或檔案ID</label>
          <input id="upload-image-url" type="text" placeholder="https://drive.google.com/file/d/xxxxx/view">
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="closeRmModal('rmUploadModal')">取消</button>
          <button class="btn btn-primary" onclick="submitUpload()">上傳</button>
        </div>
      </div>
    </div>
  `);

  renderRmBtnFields();
}

function renderRmBtnFields() {
  const layout = document.getElementById('rm-layout').value;
  const counts = { small_1: 1, small_2: 2, small_3: 3, large_3: 3, large_6: 6 };
  const count  = counts[layout] || 3;
  let html = '';
  for (let i = 1; i <= count; i++) {
    html += `
      <div style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:8px">
        <div style="font-weight:600;margin-bottom:8px;color:#555">按鈕 ${i}</div>
        <div class="form-row">
          <div class="form-group half">
            <label>文字</label>
            <input id="rm-btn${i}-label" type="text" placeholder="按鈕文字">
          </div>
          <div class="form-group half">
            <label>動作（文字或網址）</label>
            <input id="rm-btn${i}-action" type="text" placeholder="關鍵字 或 https://...">
          </div>
        </div>
      </div>`;
  }
  setContent('rm-btn-fields', html);
}

async function submitCreateRm() {
  const layout  = document.getElementById('rm-layout').value;
  const counts  = { small_1: 1, small_2: 2, small_3: 3, large_3: 3, large_6: 6 };
  const count   = counts[layout] || 3;
  const params  = {
    action:       'createRichMenu',
    name:         document.getElementById('rm-name').value,
    display_text: document.getElementById('rm-display').value,
    layout:       layout
  };
  for (let i = 1; i <= 6; i++) {
    const lEl = document.getElementById('rm-btn' + i + '-label');
    const aEl = document.getElementById('rm-btn' + i + '-action');
    params['btn' + i + '_label']  = lEl ? lEl.value : '';
    params['btn' + i + '_action'] = aEl ? aEl.value : '';
  }
  if (!params.name) return showToast('請填入選單名稱', 'error');

  const res = await apiCall(params);
  if (res.success) {
    showToast('圖文選單建立成功');
    closeRmModal('rmCreateModal');
    loadRichMenu();
  } else {
    showToast(res.message || '建立失敗', 'error');
  }
}

var _uploadRmId    = null;
var _uploadRmIndex = null;

function openUploadModal(richMenuId, index) {
  _uploadRmId    = richMenuId;
  _uploadRmIndex = index;
  document.getElementById('upload-image-url').value = '';
  document.getElementById('rmUploadModal').classList.add('show');
}

async function submitUpload() {
  const imageUrl = document.getElementById('upload-image-url').value.trim();
  if (!imageUrl) return showToast('請填入圖片網址', 'error');

  const res = await apiCall({
    action:       'uploadRichMenuImage',
    rich_menu_id: _uploadRmId,
    image_url:    imageUrl
  });

  if (res.success) {
    showToast('圖片上傳成功');
    closeRmModal('rmUploadModal');
    loadRichMenu();
  } else {
    showToast(res.message || '上傳失敗', 'error');
  }
}

async function setDefault(richMenuId, index) {
  if (!confirmDialog('確定設為預設圖文選單？')) return;
  const res = await apiCall({ action: 'setDefaultRichMenu', rich_menu_id: richMenuId });
  if (res.success) { showToast('已設為預設'); loadRichMenu(); }
  else showToast(res.message || '設定失敗', 'error');
}

async function deleteRichMenuRow(richMenuId, index) {
  if (!confirmDialog('確定刪除此圖文選單？')) return;
  const res = await apiCall({ action: 'deleteRichMenu', rich_menu_id: richMenuId, index });
  if (res.success) { showToast('已刪除'); loadRichMenu(); }
  else showToast(res.message || '刪除失敗', 'error');
}

function openCreateRmModal() {
  document.getElementById('rmCreateModal').classList.add('show');
  renderRmBtnFields();
}

function closeRmModal(id) {
  document.getElementById(id).classList.remove('show');
}
