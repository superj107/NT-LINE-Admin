/**
 * js/utils/dom.js
 * 全站共用 DOM 工具（依 CODE_STYLE.md 規範）
 * escHtml / openModal / closeModal / confirmAndRun
 * 新頁面一律使用這裡的函式，不要在頁面內另外定義變體
 */

function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function openModal(modalId) {
  var el = document.getElementById(modalId);
  if (el) el.style.display = 'flex';
}

function closeModal(modalId) {
  var el = document.getElementById(modalId);
  if (el) el.style.display = 'none';
}

/**
 * 確認後執行非同步動作，內部已正確 await confirmDialog
 * 依賴 utils.js 既有的 confirmDialog(message) -> Promise<boolean>
 */
async function confirmAndRun(message, actionFn) {
  var confirmed = await confirmDialog(message);
  if (!confirmed) return;
  await actionFn();
}
