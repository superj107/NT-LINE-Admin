var currentPage = null;

const PAGES = {
  dashboard: { label: '儀表板',   icon: '📊', load: loadDashboard },
  audience:  { label: '受眾管理', icon: '👥', load: loadAudience  },
  richmenu:  { label: '圖文選單', icon: '🖼️', load: loadRichMenu  },
  broadcast: { label: '推播管理', icon: '📢', load: loadBroadcast },
};

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.menu-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
  if (PAGES[page]) PAGES[page].load();
}

function buildSidebarMenu() {
  var menuEl = document.querySelector('.sidebar-menu');
  if (!menuEl) return;
  var html = '';
  Object.keys(PAGES).forEach(function(key) {
    var page = PAGES[key];
    html += '<div class="menu-item" data-page="' + key + '" onclick="navigateTo(\'' + key + '\')">' +
      '<span class="menu-icon">' + page.icon + '</span> ' + page.label + '</div>';
  });
  menuEl.innerHTML = html;
}
