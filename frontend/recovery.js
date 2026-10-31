const API_BASE_URL = 'http://localhost:3000/api';
const form = document.querySelector('#recovery-form');
const email = document.querySelector('#email');
const error = document.querySelector('#email-error');

function validateEmail() {
  const isEmpty = email.value.trim() === '';
  email.setAttribute('aria-invalid', String(isEmpty));
  error.textContent = isEmpty ? 'Obrigatório' : '';
  return !isEmpty;
}

async function submitRecovery(emailValue) {
  const response = await fetch(`${API_BASE_URL}/auth/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: emailValue }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erro ao solicitar a recuperação de senha.');
  }

  return data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!validateEmail()) {
    email.focus();
    return;
  }

  try {
    const result = await submitRecovery(email.value.trim());
    alert(result.message);
  } catch (requestError) {
    error.textContent = requestError.message;
    email.setAttribute('aria-invalid', 'true');
  }
});

email.addEventListener('input', () => {
  if (email.value.trim() !== '') {
    validateEmail();
  }
});
