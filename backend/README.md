# Backend

## Banco local

Na raiz do projeto, inicie o MySQL local:

```sh
docker compose up -d database
```

O container cria o banco `reserve_me` e executa
`backend/database/schema.sql` na primeira inicialização. O volume `mysql_data` preserva os dados entre
reinicializações. Para conectar o backend a outro MySQL, configure `DB_HOST`,
`DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no ambiente.

O código executável fica em `src/`; os testes ficam em `test/` e o schema do
banco em `database/`.

## API de salas

Inicie o backend a partir desta pasta:

```sh
npm start
```

- `GET /api/rooms`: lista salas e seus recursos.
- `POST /api/rooms`: cadastra sala. Exemplo:

```json
{
  "name": "Laboratório 01",
  "floor": "Térreo",
  "capacity": 24,
  "resources": ["Projetor", "Computadores"]
}
```

O campo `resources` aceita uma lista de nomes, inclusive vazia. Recursos são
mantidos em catálogo e associados às salas por uma tabela de relacionamento.

## API de reservas

- `GET /api/reservations`: lista reservas com o nome da sala.
- `POST /api/reservations`: cria uma reserva. Exemplo:

```json
{
  "roomId": 1,
  "date": "2026-11-05",
  "startTime": "09:00",
  "endTime": "10:30",
  "responsible": "Ana Souza",
  "purpose": "Reunião pedagógica"
}
```

Uma nova reserva recebe a situação `pendente`. São aceitas as situações
`pendente`, `aprovada`, `rejeitada` e `cancelada`. A sala é vinculada pela
chave estrangeira; uma sala que tenha reservas não pode ser excluída.

## Testes

```sh
npm test
```
