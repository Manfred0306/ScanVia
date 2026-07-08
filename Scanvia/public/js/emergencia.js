const emergencyName = document.getElementById('emergencyName');
const emergencyStatus = document.getElementById('emergencyStatus');
const emergencyContent = document.getElementById('emergencyContent');
const fieldCedula = document.getElementById('fieldCedula');
const fieldBloodType = document.getElementById('fieldBloodType');
const fieldAllergies = document.getElementById('fieldAllergies');
const fieldMedicines = document.getElementById('fieldMedicines');
const contactsList = document.getElementById('contactsList');

function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || params.get('userId') || params.get('usuarioId');
}

function renderError(message) {
  emergencyName.textContent = 'Información no disponible';
  emergencyStatus.textContent = message;
  emergencyStatus.classList.add('error');
  emergencyContent.hidden = true;
}

function renderContact(contact) {
  const article = document.createElement('article');
  article.className = 'emergency-contact-card';
  article.innerHTML = `
    <h3>${contact.nombre || 'Contacto sin nombre'}</h3>
    <p>${contact.relacion || 'Sin relación especificada'}</p>
    <a href="tel:${contact.telefono}">${contact.telefono || 'Sin teléfono'}</a>
  `;
  return article;
}

function renderEmptyContacts() {
  const empty = document.createElement('div');
  empty.className = 'empty-contacts';
  empty.textContent = 'No hay contactos cargados para este perfil.';
  return empty;
}

async function loadEmergencyData() {
  const id = getUserIdFromUrl();

  if (!id) {
    renderError('No se encontró el identificador del perfil en la URL.');
    return;
  }

  try {
    const response = await fetch(`/api/usuarios/${encodeURIComponent(id)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo cargar el perfil.');
    }

    emergencyName.textContent = data.nombre;
    emergencyStatus.textContent = 'Datos médicos cargados correctamente.';
    emergencyStatus.classList.remove('error');
    fieldCedula.textContent = data.cedula || 'No registrado';
    fieldBloodType.textContent = data.tipoSangre || 'No registrado';
    fieldAllergies.textContent = data.alergias || 'No registradas';
    fieldMedicines.textContent = data.medicamentos || 'No registrados';

    contactsList.innerHTML = '';
    if (data.contactos.length) {
      data.contactos.forEach((contact) => {
        contactsList.appendChild(renderContact(contact));
      });
    } else {
      contactsList.appendChild(renderEmptyContacts());
    }

    emergencyContent.hidden = false;
  } catch (error) {
    renderError(error.message);
  }
}

loadEmergencyData();
