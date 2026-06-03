// js/pages/broadcast.js

let _broadcastAudienceData = [];

async function loadBroadcast() {
  setContent('main-content', `
    <div class="page-header">
      <h2>📢 推播管理</h2>
      <p class="page-desc">選擇受眾，編輯訊息，批次推播給所有用戶</p>
    </div>

    <div class="broadcast-layout">
      <!-- 左：受眾選擇 -->
      <div class="card" id="audience-select-card">
        <h3>① 選擇受眾</h3>
        <div class="search-bar">
          <input type="text" id="bc-search" placeholder="搜尋關鍵字或受眾ID…" oninput="filterBcAudience()">
        </div>
        <div id="bc-audience-list" class="bc-audience-list">
          <div class="loading-placeholder">載入中…</div>
        </div>
      </div>

      <!-- 右：訊息編輯 + 發送 -->
      <div class="card" id="message-compose-card">
        <h3>② 編輯訊息</h3>

        <div id="bc-messages-container">
          <!-- 訊息區塊由 JS 動態產生 -->
        </div>

        <button class="btn btn-secondary btn-sm" onclick="addBcMessage()" id="add-msg-btn">
          ＋ 新增訊息（最多 5 則）
        </button>

        <div class="bc-target-info" id="bc-target-info">
          請先從左側選擇受眾
        </div>

        <button class="btn btn-primary btn-block" onclick="submitBroadcast()" id="bc-send-btn" disabled>
          🚀 確認推播
        </button>
      </div>
    </div>

    <!-- 推播紀錄 -->
    <div class="card" style="margin-top:20px">
      <div class="card-header-row">
        <h3>📋 推播紀錄</h3>
        <button class="btn btn-secondary btn-sm" onclick="loadBroadcastLog()">重新整理</button>
      </div>
      <div id="bc-log-table">載入中…</div>
    </div>
  `);

  // 初始化訊息區塊
  _bcMessages = [];
  addBcMessage();

  // 載入受眾列表
  const res = await apiCall({ action: 'getAudienceForBroadcast' });
  if (res.success) {
    _broadcastAudienceData = res.list;
    renderBcAudienceList(_broadcastAudienceData);
  }

  // 載入推播紀錄
  loadBroadcastLog();
}

// ── 受眾選擇 ──────────────────────────────────────

let _selectedAudience = null;

function renderBcAudienceList(list) {
  const el = document.getElementById('bc-audience-list');
  if (!list.length) {
    el.innerHTML = '<p class="empty-tip">沒有受眾資料</p>';
    return;
  }
  el.innerHTML = list.map(a => `
    <div class="bc-audience-item" id="bc-aud-${a.audience_id}"
         onclick="selectBcAudience('${a.audience_id}')">
      <div class="bc-aud-name">${a.keyword || '（無關鍵字）'}</div>
      <div class="bc-aud-meta">
        <span class="badge">${a.audience_id}</span>
        <span class="bc-aud-count">👥 ${a.count} 人</span>
      </div>
    </div>
  `).join('');
}

function filterBcAudience() {
  const q = document.getElementById('bc-search').value.trim().toLowerCase();
  const filtered = _broadcastAudienceData.filter(a =>
    a.keyword.toLowerCase().includes(q) || a.audience_id.includes(q)
  );
  renderBcAudienceList(filtered);
}

function selectBcAudience(audience_id) {
  _selectedAudience = _broadcastAudienceData.find(a => a.audience_id === audience_id);

  // 高亮選中
  document.querySelectorAll('.bc-audience-item').forEach(el => el.classList.remove('selected'));
  const item = document.getElementById('bc-aud-' + audience_id);
  if (item) item.classList.add('selected');

  // 更新目標資訊
  const info = document.getElementById('bc-target-info');
  info.innerHTML = `
    <span class="target-label">目標受眾：</span>
    <strong>${_selectedAudience.keyword || audience_id}</strong>
    <span class="target-count">（預計推播 <strong>${_selectedAudience.count}</strong> 人）</span>
  `;
  info.className = 'bc-target-info selected';

  document.getElementById('bc-send-btn').disabled = false;
}

// ── 訊息編輯 ──────────────────────────────────────

let _bcMessages = [];
const BC_MAX_MESSAGES = 5;

function addBcMessage() {
  if (_bcMessages.length >= BC_MAX_MESSAGES) {
    showToast('最多只能加 5 則訊息', 'warning');
    return;
  }
  const id = Date.now();
  _bcMessages.push({ id, type: 'text' });
  renderBcMessages();
}

function removeBcMessage(id) {
  if (_bcMessages.length <= 1) {
    showToast('至少需要 1 則訊息', 'warning');
    return;
  }
  _bcMessages = _bcMessages.filter(m => m.id !== id);
  renderBcMessages();
}

function renderBcMessages() {
  const container = document.getElementById('bc-messages-container');
  container.innerHTML = _bcMessages.map((m, idx) => `
    <div class="bc-msg-block" id="bc-msg-${m.id}">
      <div class="bc-msg-header">
        <span class="bc-msg-index">訊息 ${idx + 1}</span>
        <div class="bc-msg-type-tabs">
          <button class="type-tab ${m.type==='text'?'active':''}"
            onclick="setBcMsgType(${m.id},'text')">文字</button>
          <button class="type-tab ${m.type==='image'?'active':''}"
            onclick="setBcMsgType(${m.id},'image')">圖片</button>
          <button class="type-tab ${m.type==='flex'?'active':''}"
            onclick="setBcMsgType(${m.id},'flex')">Flex</button>
        </div>
        <button class="bc-msg-remove" onclick="removeBcMessage(${m.id})">✕</button>
      </div>
      <div class="bc-msg-body">
        ${_renderMsgInput(m)}
      </div>
    </div>
  `).join('');

  // 加減按鈕狀態
  const addBtn = document.getElementById('add-msg-btn');
  if (addBtn) addBtn.disabled = _bcMessages.length >= BC_MAX_MESSAGES;
}

function _renderMsgInput(m) {
  if (m.type === 'text') {
    return `<textarea class="bc-textarea" rows="4"
      placeholder="輸入文字訊息…\n支援換行"
      oninput="saveBcMsgValue(${m.id},'text',this.value)"
    >${m.text || ''}</textarea>`;
  }
  if (m.type === 'image') {
    return `
      <div class="bc-input-group">
        <label>原始圖片 URL（需為公開 https）</label>
        <input type="text" class="bc-input" placeholder="https://…/image.jpg"
          value="${m.originalContentUrl || ''}"
          oninput="saveBcMsgValue(${m.id},'originalContentUrl',this.value)">
      </div>
      <div class="bc-input-group">
        <label>縮圖 URL（可與原始相同）</label>
        <input type="text" class="bc-input" placeholder="https://…/thumb.jpg"
          value="${m.previewImageUrl || ''}"
          oninput="saveBcMsgValue(${m.id},'previewImageUrl',this.value)">
      </div>`;
  }
  if (m.type === 'flex') {
    return `
      <label style="font-size:12px;color:var(--text-muted)">Flex Message JSON</label>
      <textarea class="bc-textarea bc-textarea-mono" rows="8"
        placeholder='{"type":"bubble","body":{…}}'
        oninput="saveBcMsgValue(${m.id},'flexJson',this.value)"
      >${m.flexJson || ''}</textarea>
      <div class="flex-hint">貼上 Flex Message Simulator 產生的 JSON</div>`;
  }
}

function setBcMsgType(id, type) {
  const m = _bcMessages.find(m => m.id === id);
  if (m) { m.type = type; renderBcMessages(); }
}

function saveBcMsgValue(id, key, value) {
  const m = _bcMessages.find(m => m.id === id);
  if (m) m[key] = value;
}

// ── 發送推播 ──────────────────────────────────────

async function submitBroadcast() {
  if (!_selectedAudience) {
    showToast('請先選擇受眾', 'warning'); return;
  }

  // 組裝 LINE messages
  const messages = [];
  for (const m of _bcMessages) {
    if (m.type === 'text') {
      const text = (m.text || '').trim();
      if (!text) { showToast('文字訊息不能為空', 'warning'); return; }
      messages.push({ type: 'text', text });
    } else if (m.type === 'image') {
      const orig = (m.originalContentUrl || '').trim();
      const prev = (m.previewImageUrl || '').trim();
      if (!orig || !prev) { showToast('圖片 URL 不能為空', 'warning'); return; }
      messages.push({ type: 'image', originalContentUrl: orig, previewImageUrl: prev });
    } else if (m.type === 'flex') {
      let contents;
      try {
        contents = JSON.parse(m.flexJson || '');
      } catch (e) {
        showToast('Flex JSON 格式錯誤', 'error'); return;
      }
      messages.push({ type: 'flex', altText: '推播訊息', contents });
    }
  }

  if (!messages.length) { showToast('請至少編輯一則訊息', 'warning'); return; }

  const count = _selectedAudience.count;
  const confirmed = await confirmDialog(
    `確定要推播給「${_selectedAudience.keyword}」受眾嗎？\n預計發送 ${count} 人。`
  );
  if (!confirmed) return;

  const res = await apiCall({
    action: 'broadcastToAudience',
    audience_id: _selectedAudience.audience_id,
    messages
  });

  if (res.success) {
    const d = res.data;
    showToast(`✅ 推播完成！成功 ${d.success} 人，失敗 ${d.fail} 人`, 'success');
    loadBroadcastLog();
  }
}

// ── 推播紀錄 ──────────────────────────────────────

async function loadBroadcastLog() {
  const el = document.getElementById('bc-log-table');
  if (!el) return;

  const res = await apiCall({ action: 'getBroadcastLog' });
  if (!res.success || !res.list.length) {
    el.innerHTML = '<p class="empty-tip">尚無推播紀錄</p>';
    return;
  }

  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>時間</th><th>受眾ID</th><th>訊息摘要</th>
          <th>總人數</th><th>成功</th><th>失敗</th>
        </tr>
      </thead>
      <tbody>
        ${res.list.map(r => `
          <tr>
            <td>${r.time}</td>
            <td><span class="badge">${r.audience_id}</span></td>
            <td>${r.msg_summary}</td>
            <td>${r.total}</td>
            <td class="text-success">${r.success}</td>
            <td class="${r.fail > 0 ? 'text-danger' : ''}">${r.fail}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}
