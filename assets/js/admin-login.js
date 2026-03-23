(function () {
  async function checkSession() {
    const response = await fetch('/api/admin/session', {
      credentials: 'same-origin'
    });

    if (response.ok) {
      window.location.href = '/admin.html';
    }
  }

  async function submitLogin(event) {
    event.preventDefault();

    const form = document.getElementById('adminLoginForm');
    const status = document.getElementById('loginStatus');
    const submit = form.querySelector('button[type="submit"]');

    status.textContent = 'Signing in...';
    submit.disabled = true;

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: document.getElementById('adminUsername').value.trim(),
          password: document.getElementById('adminPassword').value
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      status.textContent = 'Access granted. Opening dashboard...';
      window.location.href = '/admin.html';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    checkSession();
    document.getElementById('adminLoginForm').addEventListener('submit', submitLogin);
  });
})();
