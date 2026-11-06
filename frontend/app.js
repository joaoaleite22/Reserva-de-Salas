const API_BASE_URL = '/api';
const form = document.querySelector('#login-form');
const fields = [
  {
    input: document.querySelector('#email'),
    error: document.querySelector('#email-error'),
  },
  {
    input: document.querySelector('#password'),
    error: document.querySelector('#password-error'),
  },
];

function validateField(field) {
  const isEmpty = field.input.value.trim() === '';
  field.input.setAttribute('aria-invalid', String(isEmpty));
  field.error.textContent = isEmpty ? 'Obrigatório' : '';
  return !isEmpty;
}

function showServerError(message) {
  const emailField = fields.find((field) => field.input.id === 'email');
  if (emailField) {
    emailField.error.textContent = message;
    emailField.input.setAttribute('aria-invalid', 'true');
  }
}

async function submitLogin(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao processar o login.');
  }

  return data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const isValid = fields.map(validateField).every(Boolean);

  if (!isValid) {
    fields.find((field) => field.input.value.trim() === '')?.input.focus();
    return;
  }

  try {
    const payload = {
      email: fields[0].input.value.trim(),
      password: fields[1].input.value.trim(),
    };

    const result = await submitLogin(payload);
    sessionStorage.setItem('authToken', result.token);
    sessionStorage.setItem('authUser', JSON.stringify(result.user));
    alert(result.message);
  } catch (error) {
    showServerError(error.message);
  }
});

fields.forEach((field) => {
  field.input.addEventListener('input', () => {
    if (field.input.value.trim() !== '') {
      validateField(field);
    }
  });
});
