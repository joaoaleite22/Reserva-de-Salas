# Backend

## Banco local

Na raiz do projeto, inicie o MySQL local:

```sh
docker compose up -d database
```

O container cria o banco `reserve_me` e executa
`backend/database/schema.sql` na primeira inicialização. O volume `mysql_data`
preserva os dados entre reinicializações. Para conectar o backend a outro MySQL,
configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no ambiente.

O código executável fica em `src/`; os testes ficam em `test/` e o schema do
banco em `database/`.

## Modelo do banco

Os nomes das tabelas e colunas do banco são em português:

- `salas`: `nome`, `andar` e `capacidade`.
- `recursos`: catálogo dos recursos disponíveis.
- `sala_recursos`: associação entre salas e recursos.
- `reservas`: `sala_id`, `quantidade_alunos`, `data_reserva`, `hora_inicio`,
  `hora_fim`, `responsavel`, `finalidade` e `situacao`.

A API mantém os nomes de propriedades atuais (`roomId`, `date`, `startTime`,
`responsible` etc.) para não alterar o contrato consumido pelo frontend.

Para um banco já criado com o schema anterior em inglês, faça backup e execute
uma única vez `database/migrations/001_traduzir_identificadores_para_portugues.sql`
no banco `reserve_me`. Não aplique o novo `schema.sql` sobre esse banco para
fazer a conversão; o script de migração renomeia as tabelas e colunas existentes
preservando os dados. Em bancos novos, o `schema.sql` já cria a estrutura em
português.

## API de salas

Inicie o backend a partir desta pasta:

```sh
npm start
```

- `GET /api/rooms`: lista salas e seus recursos.
- `GET /api/rooms?minimumCapacity=30`: lista somente salas com capacidade
  igual ou superior ao número informado de alunos.
- `GET /api/resources`: lista os recursos cadastrados.
- `GET /api/rooms?minimumCapacity=30&resourceIds=1,2`: combina a capacidade
  com recursos; basta a sala ter pelo menos um dos recursos selecionados.
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
A tela `../frontend/solicitar-reserva.html` consulta
`GET /api/rooms?minimumCapacity=N` enquanto o professor informa o tamanho da
turma, mostrando somente salas que comportem todos os alunos.

## API de reservas

- `GET /api/reservations`: lista reservas com o nome da sala.
- `POST /api/reservations`: cria uma reserva. Exemplo:

```json
{
  "roomId": 1,
  "studentCount": 24,
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
O cadastro retorna `409 Conflict` se já houver, para a mesma sala e data, uma
reserva pendente ou aprovada com horário sobreposto. Horários consecutivos são
permitidos; reservas canceladas ou rejeitadas não bloqueiam a sala.
A quantidade de alunos é registrada em `quantidade_alunos`. No cadastro, a API
valida novamente a capacidade da sala; pedidos que excedem o limite são
rejeitados. Para um banco existente, aplique uma única vez
`database/migrations/003_adicionar_quantidade_alunos.sql` após fazer backup.
O professor também precisa selecionar pelo menos um recurso necessário. A tela
mostra apenas salas que tenham ao menos um desses recursos e capacidade
suficiente; a API verifica novamente se a sala escolhida atende a pelo menos
um dos recursos enviados.

## Testes

```sh
npm test
```

## Login e contas

`POST /api/auth/login` recebe `email` e `password`. As contas são criadas pelo
administrador; não há cadastro público. Senhas são armazenadas com bcrypt e
nunca retornadas pela API. Credenciais inválidas ou contas desativadas recebem
a mesma resposta `401`. No sucesso, a resposta contém perfil seguro do usuário
e um token JWT com validade de uma hora.

Configure `.env` na raiz a partir de `.env.example` e substitua
`AUTH_TOKEN_SECRET` por um segredo aleatório com pelo menos 32 bytes. Para gerar
um valor criptograficamente seguro:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Para instalações de banco já existentes, aplique a migração de usuários uma
única vez, após fazer backup:

```sql
SOURCE backend/database/migrations/004_criar_usuarios.sql;
```

Crie uma conta administrativa usando variáveis de ambiente temporárias no
PowerShell (o valor da senha é solicitado sem eco no terminal):

```powershell
$env:NEW_USER_NAME = "Nome do professor"
$env:NEW_USER_EMAIL = "professor@escola.edu.br"
$env:NEW_USER_ROLE = "professor"
$securePassword = Read-Host "Senha inicial" -AsSecureString
$env:NEW_USER_PASSWORD = [System.Net.NetworkCredential]::new("", $securePassword).Password
npm run user:create
Remove-Item Env:NEW_USER_NAME, Env:NEW_USER_EMAIL, Env:NEW_USER_ROLE, Env:NEW_USER_PASSWORD
```

Use `NEW_USER_ROLE=gerente` para criar uma conta de gerente. A senha inicial
precisa ter pelo menos 12 caracteres e no máximo 72 bytes UTF-8.

### Contrato do endpoint

`POST /api/auth/login`

```json
{
  "email": "professor@escola.edu.br",
  "password": "senha informada pelo usuário"
}
```

Resposta `200`:

```json
{
  "ok": true,
  "message": "Login realizado com sucesso.",
  "token": "<JWT>",
  "user": {
    "id": 1,
    "name": "Nome do professor",
    "email": "professor@escola.edu.br",
    "role": "professor"
  }
}
```

Credenciais incorretas resultam em `401`; campos ausentes ou inválidos em `400`.
O token é emitido para uso no cliente. As demais rotas da API ainda não exigem
esse token; a autorização dessas rotas não está incluída nesta implementação.

### Documentação JSDoc

As funções documentadas ficam em `src/`. Para gerar a referência HTML local:

```sh
npm run docs
```

Abra `docs/api/index.html` após a geração.
