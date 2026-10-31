const express = require('express');
const path = require('path');
const defaultRoomsRepository = require('./repositories/roomsRepository');
const defaultReservationsRepository = require('./repositories/reservationsRepository');
const frontendDirectory = path.join(__dirname, '..', '..', 'frontend');
const reservationStatuses = ['pendente', 'aprovada', 'rejeitada', 'cancelada'];

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

function validateReservation(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Informe os dados da reserva em um objeto.' };
  }

  if (!Number.isInteger(body.roomId) || body.roomId < 1) {
    return { error: 'Selecione uma sala válida.' };
  }

  const date = typeof body.date === 'string' ? body.date : '';
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (
    !dateParts
    || Number(dateParts[1]) < 1000
    || new Date(Date.UTC(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3])))
      .toISOString()
      .slice(0, 10) !== date
  ) {
    return { error: 'Informe uma data válida no formato AAAA-MM-DD.' };
  }

  const startTime = typeof body.startTime === 'string' ? body.startTime : '';
  const endTime = typeof body.endTime === 'string' ? body.endTime : '';
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const startParts = timePattern.exec(startTime);
  const endParts = timePattern.exec(endTime);
  if (!startParts || !endParts) {
    return { error: 'Informe os horários no formato HH:MM.' };
  }

  const startMinutes = Number(startParts[1]) * 60 + Number(startParts[2]);
  const endMinutes = Number(endParts[1]) * 60 + Number(endParts[2]);
  if (endMinutes <= startMinutes) {
    return { error: 'O horário de término deve ser posterior ao horário de início.' };
  }

  const responsible = typeof body.responsible === 'string' ? body.responsible.trim() : '';
  if (!responsible || responsible.length > 120) {
    return { error: 'Informe o nome do responsável com até 120 caracteres.' };
  }

  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
  if (!purpose || purpose.length > 500) {
    return { error: 'Informe a finalidade com até 500 caracteres.' };
  }

  const status = body.status === undefined ? 'pendente' : body.status;
  if (!reservationStatuses.includes(status)) {
    return {
      error: 'Situação inválida. Use pendente, aprovada, rejeitada ou cancelada.',
    };
  }

  return {
    value: {
      roomId: body.roomId,
      date,
      startTime,
      endTime,
      responsible,
      purpose,
      status,
    },
  };
}

function createApp({
  roomsRepository = defaultRoomsRepository,
  reservationsRepository = defaultReservationsRepository,
} = {}) {
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

  app.get('/api/reservations', async (_req, res, next) => {
    try {
      const reservations = await reservationsRepository.list();
      res.json({ ok: true, data: reservations });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/reservations', async (req, res, next) => {
    const result = validateReservation(req.body);

    if (result.error) {
      return res.status(400).json({ ok: false, message: result.error });
    }

    try {
      const reservation = await reservationsRepository.create(result.value);
      return res.status(201).json({ ok: true, data: reservation });
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
