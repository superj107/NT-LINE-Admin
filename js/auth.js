var authState = {
  sessionToken: localStorage.getItem('sessionToken') || null,
  email:        localStorage.getItem('email')        || null
};

window.onload = function() {
  if (authState.sessionToken) {
    verifyAndEnter();
  }
};

async function login() {
  var email    = document.getElementById('inputEmail').value.trim();
  var password = document.getElementById('inputPassword').value;
  var btn      = document.getElementById('btnLogin');
  var errMsg   = document.getElementById('errorMsg');

  if (!email || !password) { showLoginError('請填入帳號和密碼'); return; }

  btn.disabled = true; btn.textContent = '登入中...';
  errMsg.style.display = 'none';

  var result = await apiCall({ action: 'login', email: email, password: password });

  if (result.success) {
    localStorage.setItem('sessionToken', result.sessionToken);
    localStorage.setItem('email', email);
    authState.sessionToken = result.sessionToken;
    authState.email        = email;
    enterMainPage();
  } else {
    showLoginError(result.message);
  }

  btn.disabled = false; btn.textContent = '登入';
}

async function verifyAndEnter() {
  var result = await apiCall({ action: 'verify' });
  if (result.success) enterMainPage();
  else { localStorage.clear(); showLoginPage(); }
}

async function logout() {
  await apiCall({ action: 'logout' });
  localStorage.clear();
  showLoginPage();
}

function enterMainPage() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainPage').style.display  = 'block';
  document.getElementById('sidebarEmail').textContent = authState.email;
  buildSidebarMenu();
  navigateTo('dashboard');
}

function showLoginPage() {
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('mainPage').style.display  = 'none';
}

function showLoginError(msg) {
  var el = document.getElementById('errorMsg');
  el.textContent = msg; el.style.display = 'block';
}
