const express = require('express');
const path = require('path');
const defaultRoomsRepository = require('./repositories/roomsRepository');
const frontendDirectory = path.join(__dirname, '..', '..', 'frontend');

function validateRoom(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Informe os dados da sala em um objeto.' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 120) {
    return { error: 'Informe o nome da sala com até 120 caracteres.' };
  }

  const floor = typeof body.floor === 'string' ? body.floor.trim() : '';
  if (!floor || floor.length > 60) {
    return { error: 'Informe o andar da sala com até 60 caracteres.' };
  }

  if (!Number.isInteger(body.capacity) || body.capacity < 1 || body.capacity > 65535) {
    return { error: 'A capacidade deve ser um número inteiro maior que zero.' };
  }

  if (
    !Array.isArray(body.resources)
    || body.resources.some(
      (resource) => typeof resource !== 'string' || !resource.trim() || resource.trim().length > 80,
    )
  ) {
    return { error: 'Os recursos devem ser informados em uma lista de nomes.' };
  }

  const resources = [...new Map(
    body.resources.map((resource) => {
      const trimmedResource = resource.trim();
      return [trimmedResource.toLocaleLowerCase('pt-BR'), trimmedResource];
    }),
  ).values()];

  return {
    value: { name, floor, capacity: body.capacity, resources },
  };
}

function createApp({ roomsRepository = defaultRoomsRepository } = {}) {
  const app = express();

  app.use(express.json());
  app.use(express.static(frontendDirectory));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, message: 'API do reserve.me funcionando.' });
  });

  app.get('/api/rooms', async (_req, res, next) => {
    try {
      const rooms = await roomsRepository.list();
      res.json({ ok: true, data: rooms });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/rooms', async (req, res, next) => {
    const result = validateRoom(req.body);

    if (result.error) {
      return res.status(400).json({ ok: false, message: result.error });
    }

    try {
      const room = await roomsRepository.create(result.value);
      return res.status(201).json({ ok: true, data: room });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'E-mail e senha são obrigatórios.',
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        ok: false,
        message: 'Informe um e-mail válido.',
      });
    }

    return res.json({
      ok: true,
      message: 'Login realizado com sucesso.',
      user: { email },
    });
  });

  app.post('/api/auth/recover', (req, res) => {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        ok: false,
        message: 'E-mail obrigatório para recuperar a senha.',
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        ok: false,
        message: 'Informe um e-mail válido.',
      });
    }

    return res.json({
      ok: true,
      message: 'Instruções de recuperação enviadas para o e-mail informado.',
    });
  });

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ ok: false, message: 'Endpoint não encontrado.' });
    }

    return res.sendFile(path.join(frontendDirectory, 'index.html'), (error) => {
      if (error) {
        next(error);
      }
    });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: 'Erro interno ao processar a solicitação.',
    });
  });

  return app;
}

module.exports = { createApp };
