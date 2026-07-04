const form = document.getElementById('adminForm');
const addContactBtn = document.getElementById('addContactBtn');
const contactsContainer = document.getElementById('contactsContainer');
const contactTemplate = document.getElementById('contactTemplate');
const qrOutput = document.getElementById('qrOutput');
const downloadQrLink = document.getElementById('downloadQrLink');
const formMessage = document.getElementById('formMessage');
const usersList = document.getElementById('usersList');
const userCountBadge = document.getElementById('userCountBadge');
const userSearchInput = document.getElementById('userSearchInput');
const emergencyPreviewFrame = document.getElementById('emergencyPreviewFrame');
const previewEmptyState = document.getElementById('previewEmptyState');
const logoutBtn = document.getElementById('logoutBtn');

let usersCache = [];
let selectedUserId = '';

async function ensureAdminSession() {
  try {
    const response = await fetch('/api/auth/me');

    if (!response.ok) {
      window.location.href = '/login.html';
      return false;
    }

    return true;
  } catch (error) {
    window.location.href = '/login.html';
    return false;
  }
}

function createContactCard(index) {
  const fragment = contactTemplate.content.cloneNode(true);
  const card = fragment.querySelector('.contact-card');
  card.querySelectorAll('input').forEach((input) => {
    input.name = `${input.name}-${index}`;
  });
  card.querySelector('input[name^="nombre"]').name = `contactoNombre${index}`;
  card.querySelector('input[name^="relacion"]').name = `contactoRelacion${index}`;
  card.querySelector('input[name^="telefono"]').name = `contactoTelefono${index}`;
  return fragment;
}

function renderDefaultContacts() {
  contactsContainer.innerHTML = '';
  contactsContainer.appendChild(createContactCard(0));
  contactsContainer.appendChild(createContactCard(1));
}

function collectContacts(formData) {
  const contacts = [];
  let index = 0;

  while (formData.has(`contactoNombre${index}`) || formData.has(`contactoRelacion${index}`) || formData.has(`contactoTelefono${index}`)) {
    contacts.push({
      nombre: formData.get(`contactoNombre${index}`) || '',
      relacion: formData.get(`contactoRelacion${index}`) || '',
      telefono: formData.get(`contactoTelefono${index}`) || '',
    });
    index += 1;
  }

  return contacts;
}

function refreshContactNames() {
  const cards = contactsContainer.querySelectorAll('.contact-card');
  cards.forEach((card, index) => {
    card.querySelector('input[name^="contactoNombre"]').name = `contactoNombre${index}`;
    card.querySelector('input[name^="contactoRelacion"]').name = `contactoRelacion${index}`;
    card.querySelector('input[name^="contactoTelefono"]').name = `contactoTelefono${index}`;
  });
}

function formatDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function normalizeSearch(value) {
  return value.toLowerCase().trim();
}

function setEmergencyPreview(url, userName) {
  emergencyPreviewFrame.src = url;
  emergencyPreviewFrame.hidden = false;
  previewEmptyState.hidden = true;
  if (userName) {
    previewEmptyState.setAttribute('data-selected-user', userName);
  }
}

function clearEmergencyPreview() {
  emergencyPreviewFrame.removeAttribute('src');
  emergencyPreviewFrame.hidden = true;
  previewEmptyState.hidden = false;
  previewEmptyState.removeAttribute('data-selected-user');
}

function renderUsersList() {
  const searchValue = normalizeSearch(userSearchInput.value || '');
  const filteredUsers = usersCache.filter((user) => {
    const haystack = [user.nombre, user.cedula, user.tipoSangre, user.createdAt, formatDate(user.createdAt)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return !searchValue || haystack.includes(searchValue);
  });

  userCountBadge.textContent = `${filteredUsers.length} usuario${filteredUsers.length === 1 ? '' : 's'}`;
  usersList.innerHTML = '';

  if (!filteredUsers.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'users-empty-state';
    emptyState.textContent = 'No hay usuarios que coincidan con la búsqueda.';
    usersList.appendChild(emptyState);
    return;
  }

  filteredUsers.forEach((user) => {
    const card = document.createElement('article');
    card.className = `user-card${user.id === selectedUserId ? ' active' : ''}`;
    card.innerHTML = `
      <div class="user-card-header">
        <div>
          <h3>${user.nombre}</h3>
          <p>${user.cedula}</p>
        </div>
        <span class="user-date">${formatDate(user.createdAt)}</span>
      </div>
      <div class="user-meta-row">
        <span>${user.tipoSangre || 'Sin tipo de sangre'}</span>
        <span>${user.alergias ? 'Con alergias registradas' : 'Sin alergias registradas'}</span>
      </div>
      <div class="user-actions">
        <button type="button" class="secondary-button user-view-button" data-user-id="${user.id}" data-user-url="${user.emergenciaUrl}">Ver vista de emergencia</button>
      </div>
    `;
    usersList.appendChild(card);
  });

  usersList.querySelectorAll('.user-view-button').forEach((button) => {
    button.addEventListener('click', () => {
      selectedUserId = button.dataset.userId || '';
      const userUrl = button.dataset.userUrl || '';
      const user = usersCache.find((entry) => entry.id === selectedUserId);
      renderUsersList();
      if (userUrl) {
        setEmergencyPreview(userUrl, user ? user.nombre : '');
      }
    });
  });
}

async function loadUsers() {
  try {
    const response = await fetch('/api/usuarios');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo cargar el listado de usuarios');
    }

    usersCache = data.usuarios || [];
    if (!selectedUserId && usersCache.length) {
      selectedUserId = usersCache[0].id;
      setEmergencyPreview(usersCache[0].emergenciaUrl, usersCache[0].nombre);
    } else if (!usersCache.length) {
      clearEmergencyPreview();
    }

    renderUsersList();
  } catch (error) {
    usersCache = [];
    renderUsersList();
    userCountBadge.textContent = '0 usuarios';
    console.error(error);
  }
}

userSearchInput.addEventListener('input', renderUsersList);

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login.html';
  }
});

addContactBtn.addEventListener('click', () => {
  const index = contactsContainer.querySelectorAll('.contact-card').length;
  contactsContainer.appendChild(createContactCard(index));
  refreshContactNames();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formMessage.textContent = '';
  formMessage.classList.remove('error', 'success');
  qrOutput.innerHTML = '<span>Generando QR...</span>';
  downloadQrLink.hidden = true;

  const formData = new FormData(form);
  const contactos = collectContacts(formData);

  const payload = {
    cedula: formData.get('cedula'),
    nombre: formData.get('nombre'),
    tipoSangre: formData.get('tipoSangre'),
    alergias: formData.get('alergias'),
    medicamentos: formData.get('medicamentos'),
    contactos,
  };

  try {
    const response = await fetch('/api/usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo generar el QR');
    }

    const qrSrc = data.usuario.qr;
    qrOutput.classList.remove('empty-state');
    qrOutput.innerHTML = `
      <img src="${qrSrc}" alt="Código QR generado" class="qr-image">
      <div class="qr-meta">
        <strong>${data.usuario.nombre}</strong>
        <span>ID: ${data.usuario.id}</span>
      </div>
    `;
    downloadQrLink.href = qrSrc;
    downloadQrLink.hidden = false;
    formMessage.textContent = 'Perfil generado correctamente.';
    formMessage.classList.add('success');
    await loadUsers();
    selectedUserId = data.usuario.id;
    setEmergencyPreview(`/emergencia.html?id=${data.usuario.id}`, data.usuario.nombre);
    renderUsersList();
  } catch (error) {
    qrOutput.classList.add('empty-state');
    qrOutput.innerHTML = '<span>Sin QR generado aún</span>';
    formMessage.textContent = error.message;
    formMessage.classList.add('error');
  }
});

renderDefaultContacts();
ensureAdminSession().then((isAuthorized) => {
  if (isAuthorized) {
    loadUsers();
  }
});
