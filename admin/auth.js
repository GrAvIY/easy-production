/**
 * Easy Production — Admin Authentication
 * Change ADMIN_PASSWORD to secure the panel.
 */
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const SESSION_KEY    = 'ep_admin_auth';

const Auth = {
  doLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const err  = document.getElementById('loginError');

    if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1');
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('adminApp').style.display = 'flex';
      Admin.init();
    } else {
      err.textContent = 'Неверный логин или пароль';
      document.getElementById('loginPass').value = '';
      setTimeout(() => { err.textContent = ''; }, 3000);
    }
  },

  isAuthenticated() {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  },

  logout() {
    if (!confirm('Выйти из админ-панели?')) return;
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  },
};
