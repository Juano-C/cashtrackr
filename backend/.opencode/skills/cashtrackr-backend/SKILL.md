---
name: CashTrackr Backend
description: Contexto y guía de trabajo del backend de CashTrackr (API REST de presupuestos y gastos con Express 5, TypeScript, Sequelize/PostgreSQL, JWT, bcrypt y Jest). Úsala siempre que se trabaje en cashtrackr-juano/backend para no reanalizar el proyecto.
---

# CashTrackr Backend

## Cuándo usar esta skill

Usar al trabajar en `cashtrackr-juano/backend`: agregar o modificar endpoints, modelos, middlewares, autenticación, emails, tests, configuración o despliegue. También al responder preguntas sobre cómo funciona la API.

Regla de oro: **no reanalizar todo el repo**. Leer esta skill, abrir solo los archivos relevantes de la tabla de mapas y, si hace falta el contrato exacto, leer `references/api-detalle.md`.

## Resumen en 30 segundos

API REST de **CashTrackr**, una app para administrar presupuestos y sus gastos. Cada usuario se registra, confirma su cuenta con un código de 6 dígitos enviado por email, inicia sesión y recibe un JWT. Con ese JWT administra **solo sus propios** presupuestos y los gastos asociados.

- Runtime: **Node.js + TypeScript**, sin framework además de Express.
- Entry point: `src/index.ts` levanta `src/server.ts` en `PORT` (default **4000**).
- Persistencia: **PostgreSQL** vía **Sequelize** (`sequelize-typescript`), conexión por `DATABASE_URL`. SSL automático (local = off, host público = on) y override con `DB_SSL`.
- Autenticación: **JWT** (`jsonwebtoken`, expira en **30 días**) + **bcrypt** (salt 10).
- Validación: **express-validator** en routers y middlewares.
- Emails: **nodemailer** (confirmación de cuenta y reset de password).
- Tests: **Jest** + **ts-jest**, unitarios con `node-mocks-http` e integración con `supertest`.
- No hay frontend en este repo (`frontend/` está vacío); solo backend. No hay lint/format configurado.

## Stack y versiones clave

| Pieza | Versión / nota |
| --- | --- |
| Express | 5.1 |
| TypeScript | 5.9, `module`/`moduleResolution` **NodeNext**, `strict: false` |
| Sequelize | `sequelize-typescript` 2.1 + `pg` 8 |
| Auth | `jsonwebtoken` 9, `bcrypt` 6 |
| Validación | `express-validator` 7 |
| Rate limit | `express-rate-limit` 8 |
| Mail | `nodemailer` 7 |
| Tests | Jest 30, ts-jest 29, supertest 7, node-mocks-http 1.17 |

El paquete **no** tiene `"type": "module"`, así que con NodeNext los `.ts` compilan a CommonJS y los imports relativos van sin extensión.

## Comandos

Ejecutar siempre desde `backend/`:

```bash
npm run dev              # nodemon + ts-node sobre src/index.ts
npm run dev:api          # igual, pero pasa --api (hoy NO se usa en el código)
npm run db:setup         # crea rol/base en el PostgreSQL local y genera .env.local (pide la clave de postgres)
npm run db:check         # diagnóstico detallado de conexión (host, SSL, error real)
npm run build            # tsc -> dist/
npm start                # node dist/index.js
npm test                 # OJO: corre pretest y BORRA la base de datos
npm run test:coverage    # ídem + cobertura en coverage/
npx jest <ruta|patrón>   # corre tests SIN el pretest (no borra la DB)
npx tsc --noEmit         # chequeo de tipos (excluye src/tests por tsconfig)
npx ts-node src/data/index.ts --clear   # borra y recrea tablas a mano
```

### ⚠️ Advertencia sobre `npm test`

`pretest` ejecuta `ts-node ./src/data/index.ts --clear`, que hace `db.sync({ force: true })`: **elimina todas las tablas y datos de la base apuntada por `DATABASE_URL`** (puede ser una DB remota). Para correr un test puntual sin borrar nada usar `npx jest`. Avisar al usuario antes de ejecutar `npm test` o el script de limpieza.

## Variables de entorno

Se cargan en `src/config/env.ts`, en este orden de prioridad:

1. Variables ya presentes en el proceso (dashboard de Render).
2. `backend/.env.local` (gitignored; tiene prioridad en local).
3. `backend/.env` (gitignored).

Plantilla sin secretos: `backend/.env.example`. **Nunca imprimir ni commitear valores reales.**

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión PostgreSQL para Sequelize (`src/config/db.ts`). |
| `DB_SSL` | `true`/`false` fuerza SSL. Si se omite: off para localhost y hosts internos de Render, on para el resto. |
| `DB_LOGGING` | `true` muestra el SQL de Sequelize en consola. Default: `false`. |
| `JWT_SECRET` | Firma y verificación del JWT (`src/utils/jwt.ts`, `src/middleware/auth.ts`). |
| `EMAIL_HOST` | Host SMTP (`src/config/nodemailer.ts`). |
| `EMAIL_PORT` | Puerto SMTP, convertido con `+`. |
| `EMAIL_USER` / `EMAIL_PASS` | Credenciales SMTP. |
| `PORT` | Puerto HTTP; default `4000` si no existe. Render lo inyecta. |
| `NODE_ENV` | En `test` silencia logs de error en `BudgetController.create`. |

## Base de datos local y remota

### Local (PostgreSQL instalado)

```bash
npm run db:setup   # pide la contraseña del usuario postgres y crea rol/base + .env.local
npm run db:check   # debe decir "Conexion exitosa"
npm run dev
```

`db:setup` ejecuta `scripts/setup-local-db.ps1`: crea el rol `cashtrackr` (password `cashtrackr`), la base `cashtrackr`, escribe `.env.local` con `DATABASE_URL=postgresql://cashtrackr:cashtrackr@localhost:5432/cashtrackr` y `DB_SSL=false`, y verifica la conexión. Si ya existe `.env.local` con `DATABASE_URL`, no lo pisa. Si PostgreSQL no está en `localhost:5432`, acepta parámetros: `-HostName`, `-Port`, `-AdminUser`.

### Remoto (Render)

- La conexión se configura en **Environment** del servicio, no con `.env`.
- Si el web service y la DB están en la **misma región**, usar la **Internal Database URL** y `DB_SSL=false`.
- Si se usa la **External Database URL** (o Neon/Supabase), `DB_SSL=true`.
- Las bases **Free de Render expiran a los 30 días** (14 días de gracia y luego se borran). Una DB expirada sigue resolviendo DNS y acepta TLS, pero corta la conexión en el startup de PostgreSQL. El error típico es `Connection terminated unexpectedly`.
- Build en Render: root directory `backend`, build `npm install && npm run build`, start `npm start`.

### Diagnóstico

`npm run db:check` muestra host/puerto/base, si usa SSL, de qué archivo salió la config y el error real de Sequelize/pg con una pista accionable (`src/utils/dbError.ts`). `connectDB()` en `src/server.ts` usa el mismo formato y ya no oculta la causa.

## Mapa del código

| Archivo | Responsabilidad |
| --- | --- |
| `src/index.ts` | Arranca el servidor en `PORT`. |
| `src/server.ts` | Crea la app Express, monta JSON, morgan y routers; exporta `app` y `connectDB()` (que se ejecuta al importar el módulo). |
| `src/config/env.ts` | Carga única de `.env.local` / `.env` con prioridad y sin ruido. |
| `src/config/db.ts` | Instancia única de Sequelize; carga modelos, detecta SSL y valida `DATABASE_URL`. |
| `src/config/limiter.ts` | Rate limit: 5 requests/minuto, ventana de 60 s. |
| `src/config/nodemailer.ts` | Transport SMTP reutilizable. |
| `src/utils/dbError.ts` | Formatea errores de DB, redacta credenciales y agrega pistas. |
| `src/data/checkConnection.ts` | Script de diagnóstico `npm run db:check`. |
| `scripts/setup-local-db.ps1` | Crea rol/base local y genera `.env.local`. |
| `src/models/User.ts` | Usuario: nombre, password hasheado, email único, token de 6 dígitos, `confirmed`. |
| `src/models/Budget.ts` | Presupuesto: nombre, monto, `userId`; relación 1-N con gastos. |
| `src/models/Expense.ts` | Gasto: nombre, monto, `budgetId` (la clase se exporta como `Expenses`). |
| `src/controllers/AuthController.ts` | Registro, confirmación, login, forgot/reset password, perfil y cambios de password. |
| `src/controllers/BudgetController.ts` | CRUD de presupuestos (siempre filtrado por `req.user.id`). |
| `src/controllers/ExpenseController.ts` | CRUD de gastos anidados a un presupuesto. |
| `src/middleware/auth.ts` | `authenticate`: valida `Authorization: Bearer <jwt>` y setea `req.user`. |
| `src/middleware/budget.ts` | Valida `budgetId`, existencia, input y pertenencia (`hasAccess`). |
| `src/middleware/expense.ts` | Valida `expenseId`, existencia e input de gasto. |
| `src/middleware/validation.ts` | `handleInputErrors`: responde 400 con `{ errors: [...] }`. |
| `src/routes/authRouter.ts` | Rutas `/api/auth/*`. |
| `src/routes/budgetRouter.ts` | Rutas `/api/budgets/*` y gastos anidados. |
| `src/utils/auth.ts` | `hashPassword` / `checkPassword` (bcrypt, salt 10). |
| `src/utils/jwt.ts` | `generateJWT(id)`, expiración 30d. |
| `src/utils/token.ts` | Código numérico aleatorio de 6 dígitos. |
| `src/emails/AuthEmail.ts` | Emails HTML de confirmación y reset (links `href="#"`, el código va en el cuerpo). |
| `src/data/index.ts` | Script `--clear`: `sync({ force: true })` y sale. |
| `src/tests/` | `unit/` (controllers y middleware), `integration/app.test.ts`, `mocks/`. |

## Modelo de datos

```text
User 1 ──── N Budget 1 ──── N Expense
```

- **User** (`users`): `id`, `name` STRING(50) NOT NULL, `password` STRING(60) NOT NULL (hash), `email` STRING(50) UNIQUE NOT NULL, `token` STRING(6) nullable, `confirmed` BOOLEAN default `false`, timestamps. `HasMany(Budget)` con `CASCADE` en update/delete.
- **Budget** (`budgets`): `id`, `name` STRING(100) NOT NULL, `amount` DECIMAL NOT NULL, `userId` FK, timestamps. `HasMany(Expense)` con `CASCADE`; `BelongsTo(User)`.
- **Expense** (`expenses`): `id`, `name` STRING(100) NOT NULL, `amount` DECIMAL NOT NULL, `budgetId` FK, timestamps; `BelongsTo(Budget)`.

Notas:
- `Budget.amount` y `Expense.amount` son `DECIMAL`: `pg` suele devolverlos como **string**, no number.
- `db.sync()` corre en cada arranque, pero **no altera tablas existentes**. Si se agrega/cambia una columna, hay que migrar a mano (`ALTER TABLE`) o recrear con `--clear`; `sync()` solo crea tablas faltantes.
- Sequelize agrega `createdAt`/`updatedAt` automáticamente.

## Autenticación y autorización

1. `POST /api/auth/create-account` → crea usuario, hashea password, genera token de 6 dígitos y envía email.
2. `POST /api/auth/confirm-account` → busca por `token`, setea `confirmed = true` y limpia el token.
3. `POST /api/auth/login` → exige usuario existente, `confirmed === true` y password correcto; devuelve **un string JWT**.
4. El cliente manda `Authorization: Bearer <jwt>`.
5. `authenticate` verifica el JWT con `JWT_SECRET`, busca el usuario por `decoded.id` con atributos `['id', 'name', 'email']` y lo deja en `req.user`.

Flujo de reset: `forgot-password` genera token y manda email → `validate-token` verifica el código → `reset-password/:token` cambia el password y limpia el token.

Detalles importantes:
- El JWT contiene `{ id }` y dura **30 días**.
- `authenticate` responde **500** (no 401) ante un JWT inválido/expirado; sí responde 401 si falta el header o el token.
- `budgetRouter` aplica `router.use(authenticate)` a **todas** sus rutas.
- Para `budgetId` se ejecutan en orden: `validateBudgetId` → `validateBudgetExists` → `hasAccess`.
- Para `expenseId` solo se ejecutan `validateExpenseId` → `validateExpenseExists`; **no hay verificación de que el gasto pertenezca al presupuesto de la URL** (ver "Deuda técnica").

## API (resumen)

Base: `http://localhost:4000`. Errores de negocio: `{ "error": "mensaje" }`. Errores de validación: `{ "errors": [...] }`. Varias respuestas exitosas son un **string JSON** (ej. `"Presupuesto Creado Correctamente"`), no un objeto.

### `/api/auth`

| Método | Ruta | Auth | Body / params | Éxito | Errores esperables |
| --- | --- | --- | --- | --- | --- |
| POST | `/create-account` | — | `name`, `email`, `password` (min 8) | 201 | 400 validación, 409 email en uso, 500 |
| POST | `/confirm-account` | — + limiter | `token` (6 dígitos) | 200 | 400, 401 token inválido, 429 |
| POST | `/login` | — | `email`, `password` | 200 (JWT string) | 400, 404 usuario, 403 no confirmado, 401 password |
| POST | `/forgot-password` | — | `email` | 200 | 400, 404 |
| POST | `/validate-token` | — + limiter | `token` (6 dígitos) | 200 | 400, 404, 429 |
| POST | `/reset-password/:token` | — | param `token` 6, body `password` min 8 | 200 | 400, 404 |
| GET | `/user` | Bearer | — | 200 `{id,name,email}` | 401, 500 |
| POST | `/update-password` | Bearer | `current_password`, `password` min 8 | 200 | 400, 401 |
| POST | `/check-password` | Bearer | `password` | 200 | 400, 401 |

### `/api/budgets` (todas requieren Bearer)

| Método | Ruta | Notas | Éxito |
| --- | --- | --- | --- |
| GET | `/` | Presupuestos del usuario, `createdAt DESC` | 200 array |
| GET | `/:budgetId` | Incluye `Expense[]` | 200 budget |
| POST | `/` | `name`, `amount > 0`; asigna `userId` del token | 201 string |
| PUT | `/:budgetId` | `name`, `amount > 0` | 200 string |
| DELETE | `/:budgetId` | Borra en cascada sus gastos | 200 string |
| GET | `/:budgetId/expenses/:expenseId` | Devuelve `req.expense` | 200 expense |
| POST | `/:budgetId/expenses` | `name`, `amount > 0`; asigna `budgetId` | 201 string |
| PUT | `/:budgetId/expenses/:expenseId` | `name`, `amount > 0` | 200 string |
| DELETE | `/:budgetId/expenses/:expenseId` | — | 200 string |

Con `budgetId` inválido/inexistente/ajeno: 400 / 404 / 401 respectivamente. Con `expenseId` inválido/inexistente: 400 / 404.

**No existe** `GET /:budgetId/expenses` (la ruta está comentada en `budgetRouter.ts`). Si se pide listar gastos, hay que implementarla.

Contrato detallado con ejemplos de request/response: `references/api-detalle.md`.

## Convenciones de código

- Controladores como **clases con métodos estáticos** (`AuthController.createAccount`, etc.), no instancias.
- Middlewares como `const` exportadas, con `Request`/`Response`/`NextFunction` tipados desde Express; se usa `import type` para tipos.
- Para agregar campos a `Request` se usa `declare global { namespace Express { interface Request { ... } } }` (ver `budget.ts`, `expense.ts`, `auth.ts`).
- Mensajes de respuesta y comentarios en **español**; nombres de código en inglés.
- Rutas: validadores de `express-validator` primero, luego `handleInputErrors`, luego el controlador.
- Acceso a datos siempre a través de modelos Sequelize; no hay capa de servicios/repositorios.
- Estilo: 4 espacios, comillas simples, sin punto y coma consistente en la mayoría de archivos (hay mezcla). Mantener el estilo del archivo que se edita.
- `strict: false`: hay `null` asignados a campos tipados como `string` (ej. `user.token = null`). No “arreglar” esto sin pedir permiso.

## Testing

- `src/tests/unit/controllers/`: controladores con `node-mocks-http` (`createRequest`, `createResponse`, `res._getJSONData()`).
- `src/tests/unit/middleware/`: middlewares de budget/expense.
- `src/tests/integration/app.test.ts`: `supertest(server)` contra `POST /api/auth/create-account`. Es **stateful** (el test de 409 depende de que el anterior haya creado el usuario) y usa **DB y SMTP reales**.
- Mocks de datos: `src/tests/mocks/budgets.ts` y `expenses.ts`.

Patrón obligatorio para mockear modelos con export default:

```ts
jest.mock('../../../models/Budget', () => ({
    __esModule: true,
    default: { findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn() }
}))
```

Para exports nombrados, devolver un objeto plano (`{ checkPassword: jest.fn() }`). Importar `describe/it/expect/jest` desde `@jest/globals`. Limpiar con `jest.resetAllMocks()` en `beforeEach`.

## Deuda técnica y trampas conocidas

Revisar antes de tocar estas zonas. **No corregir en silencio**: son cambios de comportamiento/seguridad, conviene avisar y proponer.

1. **`npm test` borra la DB** por el `pretest` (`sync({ force: true })`).
2. **Mass assignment en registro**: `User.create(req.body)` permite enviar `confirmed: true` o `token` y saltarse la confirmación por email. Lo mismo aplica a `Budget.create(req.body)` y `Expense.create(req.body)` (luego se sobrescribe la FK, pero no otros campos).
3. **Gastos sin control de pertenencia**: `validateExpenseExists` busca por `expenseId` sin comparar `expense.budgetId` con el `budgetId` de la URL. Un usuario puede leer/editar/borrar un gasto ajeno pasando un presupuesto propio.
4. **JWT inválido → 500** en `authenticate` (debería ser 401). Además, si `decoded` no tiene `id`, el request queda colgado (no llama `next()` ni responde).
5. **`connectDB()` se ejecuta al importar `server.ts`** y no se espera desde `index.ts`; si falla la DB, el servidor igual escucha y loguea el error detallado. `db.sync()` sí se espera dentro de `connectDB()`.
6. **Rate limit parcial**: solo en `confirm-account` y `validate-token`; login, registro y forgot-password no tienen límite.
7. **Sin CORS**: si el frontend corre en otro origen, hace falta configurar CORS o un proxy.
8. **Sin migraciones**: no hay carpeta de migraciones; los cambios de esquema no se aplican solos en una DB existente.
9. **Typo público**: el método es `resetPasswordWirhToken` (con “Wirh”). Mantenerlo si se referencia; renombrar solo con pedido explícito.
10. **`GET /:budgetId/expenses` no implementado** (comentado). `ExpensesController` tampoco tiene `getAll`.
11. **`coverage/` está commiteado** aunque el `.gitignore` lo ignora; no agregar más artefactos generados.
12. **`dist/` está gitignored**: no editar archivos de `dist/`; se regeneran con `npm run build`.
13. `dev:api` pasa `--api` pero ningún archivo lee ese argumento.
14. `validateBudgetInput` / `validateExpenseInput` **no** llaman a `validationResult`; dependen de que `handleInputErrors` venga inmediatamente después en la ruta.
15. El email de confirmación usa `href="#"`: el flujo real depende de que el usuario copie el código de 6 dígitos.

## Playbooks

### Agregar un endpoint

1. Definir método y ruta en `src/routes/budgetRouter.ts` o `authRouter.ts` (respetar orden: validadores → `handleInputErrors` → controlador).
2. Agregar el método estático en el controlador correspondiente.
3. Si necesita cargar una entidad por id, crear/reutilizar middleware en `src/middleware/` y registrarlo con `router.param(...)`.
4. Si agrega una propiedad a `req`, ampliar la interface global de Express.
5. Agregar tests unitarios en `src/tests/unit/` y, si aplica, integración.
6. Actualizar `references/api-detalle.md` y este resumen si cambia el contrato.

### Cambiar el modelo de datos

1. Editar el modelo en `src/models/`.
2. Actualizar mocks y tests.
3. Recordar que `db.sync()` **no altera** tablas existentes: indicar al usuario el `ALTER TABLE` o recrear con `--clear` (con backup).
4. Verificar que los `include`/relaciones sigan coherentes.

### Tocar autenticación

1. Revisar `AuthController` + `src/middleware/auth.ts` + `src/utils/jwt.ts` + `authRouter.ts`.
2. Recordar que `req.user` solo trae `id`, `name`, `email` (no `confirmed` ni `password`).
3. Probar login, token inválido, token ausente y cuenta no confirmada.
4. No cambiar la expiración de 30 días ni el payload sin avisar (rompe sesiones activas).

### Correr y depurar

- Si la API no conecta: correr `npm run db:check`; muestra host, SSL, archivo de configuración y el error real con pista. No adivinar con el mensaje genérico.
- Si el error es `Connection terminated unexpectedly`: revisar si la DB es una Free de Render expirada (30 días) o si se está usando una URL interna desde fuera de Render.
- Si es local: `npm run db:setup` crea rol/base y `.env.local`; el servicio PostgreSQL debe estar iniciado.
- Si los emails no salen: revisar `EMAIL_*`; `createAccount` devuelve 500 si el envío falla.
- Si `npm run dev` falla por tipos: `npx tsc --noEmit`. `tsconfig.json` fija `types: ["node"]` para evitar el choque entre `@types/mocha` (raíz del repo) y Jest.
- Health check: `GET /` responde `Todo bien`.

## Checklist antes de terminar un cambio

- [ ] `npx tsc --noEmit` sin errores nuevos.
- [ ] Tests relevantes con `npx jest <ruta>` (evitar `npm test` si no se quiere borrar la DB).
- [ ] Mensajes y validaciones en español, consistentes con el resto.
- [ ] Sin secretos ni `.env` en el diff.
- [ ] Sin editar `dist/` ni `coverage/`.
- [ ] Contrato de API actualizado si cambió.
