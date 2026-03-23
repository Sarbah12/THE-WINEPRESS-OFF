(function () {
  async function checkSession() {
    window.location.href = '/admin.html';
  }

  async function submitLogin(event) {
    event.preventDefault();
    window.location.href = '/admin.html';
  }

  document.addEventListener('DOMContentLoaded', function () {
    checkSession();
    const form = document.getElementById('adminLoginForm');
    if (form) {
      form.addEventListener('submit', submitLogin);
    }
  });
})();
