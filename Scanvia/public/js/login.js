const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

async function checkSession() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      window.location.href = '/admin';
    }
  } catch (error) {
    // Ignore and stay on login page.
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginMessage.textContent = '';
  loginMessage.classList.remove('error', 'success');

  const formData = new FormData(loginForm);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password'),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No fue posible iniciar sesión');
    }

    loginMessage.textContent = 'Acceso concedido. Cargando panel...';
    loginMessage.classList.add('success');
    window.location.href = '/admin';
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.classList.add('error');
  }
});

checkSession();