# Contrato detallado de la API — CashTrackr Backend

Base URL local: `http://localhost:4000`. Prefijo de autenticación: `/api/auth`. Prefijo de presupuestos: `/api/budgets`.

Formato de errores:

```json
{ "error": "mensaje en español" }
```

Errores de validación (`express-validator`):

```json
{ "errors": [{ "type": "field", "msg": "Email no válido", "path": "email", "location": "body" }] }
```

Varias respuestas exitosas son **un string JSON**, por ejemplo `"Presupuesto Creado Correctamente"`.

Header autenticado:

```http
Authorization: Bearer <jwt>
```

---

## Autenticación

### POST `/api/auth/create-account`

Body:

| Campo | Reglas |
| --- | --- |
| `name` | no vacío |
| `email` | email válido |
| `password` | mínimo 8 caracteres |

Comportamiento: verifica que el email no exista, crea el usuario, hashea el password, genera un token de 6 dígitos, guarda y envía el email de confirmación.

| Caso | Status | Respuesta |
| --- | --- | --- |
| Creado | 201 | `"Cuenta creada correctamente"` |
| Validación | 400 | `{ errors }` |
| Email ya usado | 409 | `{ "error": "El email ya está en uso" }` |
| Error interno (incluye fallo SMTP) | 500 | `{ "error": "Hubo un error" }` |

Ejemplo:

```json
{ "name": "Juan", "email": "juan@test.com", "password": "password123" }
```

### POST `/api/auth/confirm-account`

Middleware: `limiter` (5 req/min). Body: `token` string de exactamente 6 caracteres.

| Caso | Status | Respuesta |
| --- | --- | --- |
| Confirmado | 200 | `"Cuenta confirmada correctamente"` |
| Validación | 400 | `{ errors }` |
| Token inexistente | 401 | `{ "error": "Token no válido" }` |
| Rate limit | 429 | `{ "error": "Has alcanzado el límite de peticiones" }` |

Efecto: `confirmed = true`, `token = null`.

### POST `/api/auth/login`

Body: `email` válido, `password` no vacío.

| Caso | Status | Respuesta |
| --- | --- | --- |
| OK | 200 | JWT como string, ej. `"eyJhbGciOi..."` |
| Validación | 400 | `{ errors }` |
| Usuario inexistente | 404 | `{ "error": "Usuario no encontrado" }` |
| Cuenta sin confirmar | 403 | `{ "error": "La cuenta no ha sido confirmada" }` |
| Password incorrecto | 401 | `{ "error": "Password incorrecto" }` |

El JWT payload es `{ "id": <userId>, "iat": ..., "exp": ... }` y expira a los 30 días.

### POST `/api/auth/forgot-password`

Body: `email` válido. Genera token nuevo, lo guarda y envía email con el código.

| Caso | Status | Respuesta |
| --- | --- | --- |
| OK | 200 | `"Revisa tu email para instrucciones"` |
| Validación | 400 | `{ errors }` |
| Usuario inexistente | 404 | `{ "error": "Usuario no encontrado" }` |

No verifica que la cuenta esté confirmada.

### POST `/api/auth/validate-token`

Middleware: `limiter`. Body: `token` de 6 caracteres.

| Caso | Status | Respuesta |
| --- | --- | --- |
| Existe | 200 | `"Token válido"` |
| Validación | 400 | `{ errors }` |
| No existe | 404 | `{ "error": "Token no válido" }` |

### POST `/api/auth/reset-password/:token`

Params: `token` de 6 caracteres. Body: `password` mínimo 8.

| Caso | Status | Respuesta |
| --- | --- | --- |
| OK | 200 | `"El password se modificó correctamente"` |
| Validación | 400 | `{ errors }` |
| Token inexistente | 404 | `{ "error": "Token no válido" }` |

Efecto: hashea el nuevo password y limpia el token.

### GET `/api/auth/user` 🔒

Requiere Bearer. Devuelve el usuario cargado por `authenticate`:

```json
{ "id": 1, "name": "Juan", "email": "juan@test.com" }
```

| Caso | Status |
| --- | --- |
| OK | 200 |
| Sin header / sin token | 401 |
| JWT inválido | 500 (`{ "error": "Token no válido" }`) |

### POST `/api/auth/update-password` 🔒

Body: `current_password` no vacío, `password` mínimo 8.

| Caso | Status | Respuesta |
| --- | --- | --- |
| OK | 200 | `"El password se modificó correctamente"` |
| Validación | 400 | `{ errors }` |
| Password actual incorrecto | 401 | `{ "error": "El password actual es incorrecto" }` |

### POST `/api/auth/check-password` 🔒

Body: `password` no vacío.

| Caso | Status | Respuesta |
| --- | --- | --- |
| Correcto | 200 | `"El password es correcto"` |
| Incorrecto | 401 | `{ "error": "El password actual es incorrecto" }` |

---

## Presupuestos

Todas las rutas de `/api/budgets` pasan por `authenticate`. Los parámetros `budgetId` disparan automáticamente:

1. `validateBudgetId` → 400 `{ errors }` si no es entero > 0.
2. `validateBudgetExists` → 404 `{ "error": "Presupuesto no encontrado" }`.
3. `hasAccess` → 401 `{ "error": "Accion no autorizada" }` si `budget.userId !== req.user.id`.

### GET `/api/budgets`

Lista los presupuestos del usuario autenticado, orden `createdAt DESC`.

```json
[
  { "id": 1, "name": "Graduación", "amount": "1000.00", "userId": 1, "createdAt": "...", "updatedAt": "..." }
]
```

Status: 200. Error de DB: 500 `{ "error": "hubo un error en obtener todo" }`.

### GET `/api/budgets/:budgetId`

Devuelve el presupuesto con `expenses` incluidos (`include: [Expense]`, sin orden explícito).

```json
{
  "id": 1,
  "name": "Graduación",
  "amount": "1000.00",
  "userId": 1,
  "expenses": [
    { "id": 1, "name": "Limosina", "amount": "300.00", "budgetId": 1 }
  ]
}
```

Status: 200 / 400 / 401 / 404.

### POST `/api/budgets`

Body:

| Campo | Reglas |
| --- | --- |
| `name` | no vacío |
| `amount` | numérico y > 0 |

Crea el presupuesto y asigna `userId` desde `req.user.id`.

| Caso | Status | Respuesta |
| --- | --- | --- |
| Creado | 201 | `"Presupuesto Creado Correctamente"` |
| Validación | 400 | `{ errors }` |
| Error de DB | 500 | `{ "error": "hubo un error en create" }` |

### PUT `/api/budgets/:budgetId`

Mismos campos y validación que el POST. Actualiza con `req.budget.update(req.body)`.

| Caso | Status | Respuesta |
| --- | --- | --- |
| OK | 200 | `"Presupuesto actualizado correctamente"` |
| Validación | 400 | `{ errors }` |
| No existe / ajeno | 404 / 401 | — |

### DELETE `/api/budgets/:budgetId`

| Caso | Status | Respuesta |
| --- | --- | --- |
| OK | 200 | `"Presupuesto eliminado correctamente"` |
| No existe / ajeno | 404 / 401 | — |

Borra en cascada sus gastos (`onDelete: CASCADE`).

---

## Gastos (anidados a un presupuesto)

El parámetro `budgetId` ejecuta la misma cadena de validación que en presupuestos. El parámetro `expenseId` ejecuta:

1. `validateExpenseId` → 400 `{ errors }` si no es entero > 0.
2. `validateExpenseExists` → 404 `{ "error": "Gasto no encontrado" }`.

> ⚠️ No se verifica que `expense.budgetId` coincida con el `budgetId` de la URL. Ver "Deuda técnica" en `SKILL.md`.

### GET `/api/budgets/:budgetId/expenses/:expenseId`

Devuelve el gasto cargado en `req.expense`. Status 200.

### POST `/api/budgets/:budgetId/expenses`

Body:

| Campo | Reglas |
| --- | --- |
| `name` | no vacío |
| `amount` | numérico y > 0 |

Crea el gasto y asigna `budgetId` desde `req.budget.id`.

| Caso | Status | Respuesta |
| --- | --- | --- |
| Creado | 201 | `"Gasto agregado correctamente"` |
| Validación | 400 | `{ errors }` |
| Error de DB | 500 | `{ "error": "Hubo un error" }` |

### PUT `/api/budgets/:budgetId/expenses/:expenseId`

Mismos campos y validación que el POST. Status 200: `"Se actualizo correctamente"`.

### DELETE `/api/budgets/:budgetId/expenses/:expenseId`

Status 200: `"Gasto eliminado"`.

### Ruta faltante

`GET /api/budgets/:budgetId/expenses` está **comentada** en `src/routes/budgetRouter.ts` y `ExpensesController` no tiene `getAll`. Para listar gastos de un presupuesto hoy hay que usar `GET /api/budgets/:budgetId` (incluye `expenses`).

---

## Códigos de estado usados en el proyecto

| Código | Uso típico |
| --- | --- |
| 200 | Lectura/actualización/borrado OK, login OK, mensajes de éxito |
| 201 | Recurso creado |
| 400 | Validación de input |
| 401 | Sin token, token ausente en header, password incorrecto, presupuesto ajeno, token inválido en confirm |
| 403 | Cuenta no confirmada |
| 404 | Usuario, presupuesto, gasto o token inexistente |
| 409 | Email ya registrado |
| 429 | Rate limit |
| 500 | Error de DB, fallo de email o JWT inválido (comportamiento actual) |
