const API_BASE_URL = '/api';
const form = document.querySelector('#reservation-form');
const studentCountInput = document.querySelector('#student-count');
const roomSelect = document.querySelector('#room');
const roomsStatus = document.querySelector('#rooms-status');
const resourceOptions = document.querySelector('#resource-options');
const resourceStatus = document.querySelector('#resource-status');
const formStatus = document.querySelector('#form-status');
let roomRequestController;
let availableResources = [];

function resetRooms(message) {
  roomSelect.replaceChildren(new Option(message, ''));
  roomSelect.disabled = true;
}

function selectedResourceIds() {
  return [...resourceOptions.querySelectorAll('input:checked')].map((input) => Number(input.value));
}

function formatRoom(room) {
  const resources = room.resources.length
    ? ` · ${room.resources.join(', ')}`
    : '';
  return `${room.name} · ${room.floor} · até ${room.capacity} alunos${resources}`;
}

async function loadResources() {
  try {
    const response = await fetch(`${API_BASE_URL}/resources`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Não foi possível carregar os recursos.');
    }

    availableResources = result.data;
    resourceOptions.replaceChildren();

    for (const resource of availableResources) {
      const label = document.createElement('label');
      label.className = 'resource-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'requiredResourceIds';
      checkbox.value = String(resource.id);
      checkbox.addEventListener('change', loadCompatibleRooms);
      label.append(checkbox, document.createTextNode(resource.name));
      resourceOptions.append(label);
    }

    resourceStatus.textContent = availableResources.length
      ? 'Selecione pelo menos um recurso necessário.'
      : 'Nenhum recurso cadastrado está disponível.';
  } catch (error) {
    resourceStatus.textContent = error.message;
    resetRooms('Não foi possível carregar os recursos');
  }
}

async function loadCompatibleRooms() {
  const count = Number(studentCountInput.value);
  const requiredResourceIds = selectedResourceIds();
  formStatus.textContent = '';

  if (!Number.isInteger(count) || count < 1 || count > 65535) {
    roomRequestController?.abort();
    resetRooms('Informe uma quantidade válida primeiro');
    roomsStatus.textContent = '';
    return;
  }

  if (requiredResourceIds.length === 0) {
    roomRequestController?.abort();
    resetRooms('Selecione pelo menos um recurso necessário');
    roomsStatus.textContent = 'Selecione os recursos necessários para buscar salas.';
    return;
  }

  roomRequestController?.abort();
  roomRequestController = new AbortController();
  const { signal } = roomRequestController;
  resetRooms('Buscando salas compatíveis…');
  roomsStatus.textContent = 'Buscando salas compatíveis…';

  try {
    const response = await fetch(
      `${API_BASE_URL}/rooms?minimumCapacity=${encodeURIComponent(count)}`
        + `&resourceIds=${encodeURIComponent(requiredResourceIds.join(','))}`,
      { signal },
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Não foi possível buscar as salas.');
    }

    if (signal.aborted) {
      return;
    }

    if (result.data.length === 0) {
      resetRooms('Nenhuma sala comporta essa quantidade');
      roomsStatus.textContent = 'Não há salas que atendam à capacidade e aos recursos selecionados.';
      return;
    }

    roomSelect.replaceChildren(new Option('Selecione uma sala', ''));
    for (const room of result.data) {
      const option = new Option(formatRoom(room), String(room.id));
      option.dataset.capacity = String(room.capacity);
      roomSelect.add(option);
    }
    roomSelect.disabled = false;
    roomsStatus.textContent = `${result.data.length} sala(s) compatível(is) encontrada(s). Cada sala possui pelo menos um recurso selecionado.`;
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    resetRooms('Erro ao carregar salas');
    roomsStatus.textContent = error.message;
  }
}

studentCountInput.addEventListener('input', loadCompatibleRooms);
loadResources();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formStatus.textContent = '';

  if (!form.reportValidity()) {
    return;
  }

  const requiredResourceIds = selectedResourceIds();
  if (requiredResourceIds.length === 0) {
    resourceStatus.textContent = 'Selecione pelo menos um recurso necessário.';
    resourceOptions.querySelector('input')?.focus();
    return;
  }

  const selectedRoom = roomSelect.selectedOptions[0];
  if (!selectedRoom || !selectedRoom.value) {
    roomSelect.setCustomValidity('Selecione uma sala compatível.');
    roomSelect.reportValidity();
    roomSelect.setCustomValidity('');
    return;
  }

  if (Number(selectedRoom.dataset.capacity) < Number(studentCountInput.value)) {
    formStatus.textContent = 'A sala selecionada não comporta essa quantidade de alunos.';
    await loadCompatibleRooms();
    return;
  }

  const payload = {
    roomId: Number(roomSelect.value),
    studentCount: Number(studentCountInput.value),
    requiredResourceIds,
    date: form.elements.date.value,
    startTime: form.elements.startTime.value,
    endTime: form.elements.endTime.value,
    responsible: form.elements.responsible.value.trim(),
    purpose: form.elements.purpose.value.trim(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Não foi possível enviar a solicitação.');
    }

    formStatus.textContent = 'Solicitação enviada. A reserva está pendente de aprovação.';
    form.reset();
    resetRooms('Informe a quantidade de alunos e os recursos necessários');
    roomsStatus.textContent = '';
    resourceStatus.textContent = 'Selecione pelo menos um recurso necessário.';
  } catch (error) {
    formStatus.textContent = error.message;
  }
});
