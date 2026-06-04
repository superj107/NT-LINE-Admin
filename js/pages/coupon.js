// js/pages/coupon.js

let _couponActivities = [];
let _selectedActivity = null;
let _couponDetailPage = 1;
const COUPON_PAGE_SIZE = 50;

async function loadCoupon() {
  setContent('mainContent', `
    <div class="page-header">
      <h2>🎟️ 優惠券管理</h2>
      <p class="page-desc">管理一人一碼序號活動，支援主動推播與關鍵字自動發券</p>
    </div>

    <div class="coupon-layout">
      <!-- 左：活動列表 -->
      <div class="card" id="coupon-activity-card">
        <div class="card-header-row">
          <h3>活動列表</h3>
          <button class="btn btn-primary btn-sm" onclick="openCreateActivityModal()">＋ 新增活動</button>
        </div>
        <div id="coupon-activity-list">載入中…</div>
      </div>

      <!-- 右：序號明細 -->
      <div class="card" id="coupon-detail-card">
        <div class="card-header-row">
          <h3 id="coupon-detail-title">請先選擇活動</h3>
          <div id="coupon-detail-actions" style="display:none;gap:8px;display:none">
            <button class="btn btn-secondary btn-sm" onclick="openUploadCodesModal()">📥 上傳序號</button>
            <button class="btn btn-danger btn-sm" onclick="deleteActivity()">🗑️ 刪除活動</button>
          </div>
        </div>
        <div id="coupon-stats" class="coupon-stats" style="display:none"></div>
        <div id="coupon-detail-table">
          <p class="empty-tip">從左側選擇活動以查看序號</p>
        </div>
        <div id="coupon-pagination" class="pagination-bar"></div>
      </div>
    </div>

    <!-- 新增活動 Modal -->
    <div id="create-activity-modal" class="modal-overlay" style="display:none">
      <div class="modal-box">
        <h3>新增活動</h3>
        <div class="form-group">
          <label>活動名稱</label>
          <input type="text" id="new-activity-name" class="form-input" placeholder="例：2026暑假折扣碼">
        </div>
        <div class="form-group">
          <label>序號清單（每行一個）</label>
          <textarea id="new-activity-codes" class="form-textarea" rows="10"
            placeholder="A001&#10;A002&#10;A003"></textarea>
          <div class="form-hint" id="code-count-hint">已輸入 0 個序號</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeCreateActivityModal()">取消</button>
          <button class="btn btn-primary" onclick="submitCreateActivity()">建立活動</button>
        </div>
      </div>
    </div>

    <!-- 上傳序號 Modal -->
    <div id="upload-codes-modal" class="modal-overlay" style="display:none">
      <div class="modal-box">
        <h3>上傳序號 — <span id="upload-activity-name"></span></h3>
        <div class="form-group">
          <label>新增序號（每行一個，已存在的會自動跳過）</label>
          <textarea id="upload-codes-input" class="form-textarea" rows="10"
            placeholder="B001&#10;B002&#10;B003"></textarea>
          <div class="form-hint" id="upload-count-hint">已輸入 0 個序號</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeUploadCodesModal()">取消</button>
          <button class="btn btn-primary" onclick="submitUploadCodes()">上傳</button>
        </div>
      </div>
    </div>
  `);

  // 監聽序號輸入計數
  setTimeout(() => {
    const newCodesEl = document.getElementById('new-activity-codes');
    if (newCodesEl) newCodesEl.addEventListener('input', () => updateCodeCount('new-activity-codes', 'code-count-hint'));
    const uploadEl = document.getElementById('upload-codes-input');
    if (uploadEl) uploadEl.addEventListener('input', () => updateCodeCount('upload-codes-input', 'upload-count-hint'));
  }, 100);

  await refreshCouponActivities();
}

// ── 活動列表 ──────────────────────────────────────

async function refreshCouponActivities() {
  const res = await apiCall({ action: 'getCouponActivities' });
  if (res.success) {
    _couponActivities = res.data.activities;
    renderCouponActivities();
  }
}

function renderCouponActivities() {
  const el = document.getElementById('coupon-activity-list');
  if (!el) return;

  if (!_couponActivities.length) {
    el.innerHTML = '<p class="empty-tip">尚無活動，請新增</p>';
    return;
  }

  el.innerHTML = _couponActivities.map(function(a) {
    var isSelected = _selectedActivity === a.name;
    var isFull     = a.remaining === 0;

    var badgeHtml = '';
    if (isFull) {
      badgeHtml = '<span style="font-size:11px;background:#FCEBEB;color:#791F1F;padding:3px 10px;border-radius:20px;font-weight:500;white-space:nowrap">已發完</span>';
    } else if (a.used === 0) {
      badgeHtml = '<span style="font-size:11px;background:#EAF3DE;color:#27500A;padding:3px 10px;border-radius:20px;font-weight:500;white-space:nowrap">未開始</span>';
    } else {
      badgeHtml = '<span style="font-size:11px;background:#EEEDFE;color:#3C3489;padding:3px 10px;border-radius:20px;font-weight:500;white-space:nowrap">進行中</span>';
    }

    var remainColor = isFull ? '#A32D2D' : '#27500A';
    var remainBg    = isFull ? '#FCEBEB' : '#EAF3DE';
    var remainLabel = isFull ? '#A32D2D' : '#3B6D11';
    var borderLeft  = isSelected ? '3px solid #534AB7' : '0.5px solid var(--color-border-tertiary)';

    return '<div id="ca-' + encodeURIComponent(a.name) + '"' +
      ' onclick="selectCouponActivity(\'' + escapeAttr(a.name) + '\')"' +
      ' style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-left:' + borderLeft + ';border-radius:12px;padding:14px 16px;cursor:pointer;margin-bottom:10px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
        '<div style="font-size:15px;font-weight:500;color:var(--color-text-primary)">' + a.name + '</div>' +
        badgeHtml +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<div style="flex:1;background:var(--color-background-secondary);border-radius:8px;padding:8px 0;text-align:center">' +
          '<div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:2px">總計</div>' +
          '<div style="font-size:20px;font-weight:500;color:var(--color-text-primary)">' + a.total + '</div>' +
        '</div>' +
        '<div style="flex:1;background:#E6F1FB;border-radius:8px;padding:8px 0;text-align:center">' +
          '<div style="font-size:11px;color:#185FA5;margin-bottom:2px">已發送</div>' +
          '<div style="font-size:20px;font-weight:500;color:#0C447C">' + a.used + '</div>' +
        '</div>' +
        '<div style="flex:1;background:' + remainBg + ';border-radius:8px;padding:8px 0;text-align:center">' +
          '<div style="font-size:11px;color:' + remainLabel + ';margin-bottom:2px">剩餘</div>' +
          '<div style="font-size:20px;font-weight:500;color:' + remainColor + '">' + a.remaining + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function selectCouponActivity(name) {
  _selectedActivity = name;
  _couponDetailPage = 1;
  renderCouponActivities();

  document.getElementById('coupon-detail-title').textContent = name;
  document.getElementById('coupon-detail-actions').style.display = 'flex';
  document.getElementById('upload-activity-name').textContent = name;

  loadCouponDetail();
}

// ── 序號明細 ──────────────────────────────────────

async function loadCouponDetail() {
  const tableEl = document.getElementById('coupon-detail-table');
  if (!tableEl) return;
  tableEl.innerHTML = '載入中…';

  const res = await apiCall({
    action: 'getCouponDetail',
    activity_name: _selectedActivity,
    page: _couponDetailPage,
    pageSize: COUPON_PAGE_SIZE
  });

  if (!res.success) {
    tableEl.innerHTML = '<p class="empty-tip">載入失敗</p>';
    return;
  }

  const { list, total } = res.data;

  // 統計卡
  const act = _couponActivities.find(a => a.name === _selectedActivity);
  if (act) {
    const statsEl = document.getElementById('coupon-stats');
    statsEl.style.display = 'flex';
    statsEl.innerHTML = `
      <div class="stat-chip">總計 <strong>${act.total}</strong></div>
      <div class="stat-chip used">已發送 <strong>${act.used}</strong></div>
      <div class="stat-chip remaining ${act.remaining === 0 ? 'empty' : ''}">剩餘 <strong>${act.remaining}</strong></div>
    `;
  }

  if (!list.length) {
    tableEl.innerHTML = '<p class="empty-tip">尚無序號</p>';
    document.getElementById('coupon-pagination').innerHTML = '';
    return;
  }

  tableEl.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>序號</th>
          <th>狀態</th>
          <th>發送對象</th>
          <th>發送時間</th>
        </tr>
      </thead>
      <tbody>
        ${list.map((r, i) => `
          <tr class="${r.status === '已發送' ? 'row-used' : ''}">
            <td>${(_couponDetailPage - 1) * COUPON_PAGE_SIZE + i + 1}</td>
            <td><code>${r.code}</code></td>
            <td><span class="status-badge ${r.status === '已發送' ? 'used' : 'unused'}">${r.status}</span></td>
            <td>${r.uid ? `<small>${r.uid}</small>` : '-'}</td>
            <td>${r.sent_time || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // 分頁
  renderCouponPagination(total);
}

function renderCouponPagination(total) {
  const el = document.getElementById('coupon-pagination');
  if (!el) return;
  const totalPages = Math.ceil(total / COUPON_PAGE_SIZE);
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let html = `<span class="page-info">第 ${_couponDetailPage} / ${totalPages} 頁，共 ${total} 筆</span>`;
  if (_couponDetailPage > 1) html += `<button class="btn btn-secondary btn-sm" onclick="goCouponPage(${_couponDetailPage - 1})">上一頁</button>`;
  if (_couponDetailPage < totalPages) html += `<button class="btn btn-secondary btn-sm" onclick="goCouponPage(${_couponDetailPage + 1})">下一頁</button>`;
  el.innerHTML = html;
}

function goCouponPage(page) {
  _couponDetailPage = page;
  loadCouponDetail();
}

// ── 新增活動 Modal ──────────────────────────────────────

function openCreateActivityModal() {
  document.getElementById('new-activity-name').value = '';
  document.getElementById('new-activity-codes').value = '';
  document.getElementById('code-count-hint').textContent = '已輸入 0 個序號';
  document.getElementById('create-activity-modal').style.display = 'flex';
}

function closeCreateActivityModal() {
  document.getElementById('create-activity-modal').style.display = 'none';
}

async function submitCreateActivity() {
  const name = (document.getElementById('new-activity-name').value || '').trim();
  const raw = document.getElementById('new-activity-codes').value || '';
  const codes = raw.split('\n').map(c => c.trim()).filter(c => c);

  if (!name) { showToast('請輸入活動名稱', 'warning'); return; }
  if (!codes.length) { showToast('請輸入至少一個序號', 'warning'); return; }

  const res = await apiCall({ action: 'uploadCoupons', activity_name: name, codes });
  if (res.success) {
    const d = res.data;
    showToast(`✅ 新增成功！加入 ${d.added} 個，跳過重複 ${d.skipped} 個`, 'success');
    closeCreateActivityModal();
    await refreshCouponActivities();
    selectCouponActivity(name);
  }
}

// ── 上傳序號 Modal ──────────────────────────────────────

function openUploadCodesModal() {
  if (!_selectedActivity) { showToast('請先選擇活動', 'warning'); return; }
  document.getElementById('upload-codes-input').value = '';
  document.getElementById('upload-count-hint').textContent = '已輸入 0 個序號';
  document.getElementById('upload-codes-modal').style.display = 'flex';
}

function closeUploadCodesModal() {
  document.getElementById('upload-codes-modal').style.display = 'none';
}

async function submitUploadCodes() {
  const raw = document.getElementById('upload-codes-input').value || '';
  const codes = raw.split('\n').map(c => c.trim()).filter(c => c);

  if (!codes.length) { showToast('請輸入至少一個序號', 'warning'); return; }

  const res = await apiCall({ action: 'uploadCoupons', activity_name: _selectedActivity, codes });
  if (res.success) {
    const d = res.data;
    showToast(`✅ 上傳成功！加入 ${d.added} 個，跳過重複 ${d.skipped} 個`, 'success');
    closeUploadCodesModal();
    await refreshCouponActivities();
    loadCouponDetail();
  }
}

// ── 刪除活動 ──────────────────────────────────────

async function deleteActivity() {
  if (!_selectedActivity) return;
  const confirmed = await confirmDialog(`確定要刪除活動「${_selectedActivity}」及所有序號嗎？\n此操作無法復原。`);
  if (!confirmed) return;

  const res = await apiCall({ action: 'deleteCouponActivity', activity_name: _selectedActivity });
  if (res.success) {
    showToast('已刪除活動', 'success');
    _selectedActivity = null;
    document.getElementById('coupon-detail-title').textContent = '請先選擇活動';
    document.getElementById('coupon-detail-actions').style.display = 'none';
    document.getElementById('coupon-stats').style.display = 'none';
    document.getElementById('coupon-detail-table').innerHTML = '<p class="empty-tip">從左側選擇活動以查看序號</p>';
    document.getElementById('coupon-pagination').innerHTML = '';
    await refreshCouponActivities();
  }
}

// ── 工具函式 ──────────────────────────────────────

function updateCodeCount(inputId, hintId) {
  const raw = document.getElementById(inputId).value || '';
  const count = raw.split('\n').map(c => c.trim()).filter(c => c).length;
  document.getElementById(hintId).textContent = `已輸入 ${count} 個序號`;
}

function escapeAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
