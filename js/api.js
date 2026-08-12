/** 檔名: api.js | 所屬: GitHub Pages前端 */

function showLoading() {
  var el = document.getElementById('global-loading');
  if (el) el.style.display = 'flex';
}
function hideLoading() {
  var el = document.getElementById('global-loading');
  if (el) el.style.display = 'none';
}

// 內部工具：等待指定毫秒數
function _apiDelay(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// 內部工具：實際發送一次請求（不含重試邏輯）
async function _apiCallOnce(params) {
  var response = await fetch(CONFIG.API_URL, {
    method: 'POST',
    body:   JSON.stringify(params)
  });
  // GAS Web App 代理層偶爾會在內容尚未就緒時回404，此時body通常不是合法JSON，
  // 讓下面 response.json() 丟例外，統一交給外層 apiCall 的重試邏輯處理
  return await response.json();
}

async function apiCall(params) {
  showLoading();

  var MAX_RETRIES = 2;       // 最多重試2次（含第一次共打3次）
  var RETRY_DELAY_MS = 600;  // 重試間隔，逐次遞增

  try {
    var token = localStorage.getItem('sessionToken');
    if (token && params.action !== 'login') params.sessionToken = token;

    var lastErr = null;
    for (var attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        var result = await _apiCallOnce(params);

        if (!result.success && result.message === '請重新登入') {
          localStorage.clear();
          location.reload();
        }
        return result; // 成功拿到有效回應，直接返回，不再重試

      } catch (err) {
        lastErr = err;
        // 還有重試機會才等待重打；已是最後一次就跳出迴圈往下丟錯誤
        if (attempt < MAX_RETRIES) {
          await _apiDelay(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
      }
    }

    // 重試次數用盡，統一在這裡處理失敗
    throw lastErr;

  } catch (err) {
    showToast('連線失敗，請稍後再試', 'error');
    return { success: false, message: '連線失敗' };
  } finally {
    hideLoading();
  }
}
