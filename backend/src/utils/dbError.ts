type ErrorLike = {
    name?: string
    message?: string
    code?: string | number
    errno?: string | number
    syscall?: string
    detail?: string
    hint?: string
    parent?: ErrorLike
    original?: ErrorLike
}

const asErrorLike = (value: unknown): ErrorLike =>
    typeof value === 'object' && value !== null ? value as ErrorLike : {}

/**
 * Evita que un mensaje de error de Sequelize/pg filtre la contraseña o la URL
 * completa de la base de datos en los logs.
 */
export function redactSecrets(text: string): string {
    let output = text
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) return output

    output = output.split(databaseUrl).join('postgresql://***')

    try {
        const parsed = new URL(databaseUrl)
        if (parsed.username) output = output.split(parsed.username).join('***')
        if (parsed.password) output = output.split(parsed.password).join('***')

        const decodedPassword = decodeURIComponent(parsed.password)
        if (decodedPassword && decodedPassword !== parsed.password) {
            output = output.split(decodedPassword).join('***')
        }
    } catch {
        // Si la URL es inválida no hay credenciales que podamos identificar.
    }

    return output
}

function getHint(code: string, message: string): string | undefined {
    const normalized = message.toLowerCase()

    if (code === 'ENOTFOUND' || normalized.includes('getaddrinfo')) {
        return 'El host de la base no existe o no se puede resolver. Si usás la URL interna de Render, solo funciona desde otro servicio de Render en la misma región; localmente usá la External Database URL.'
    }

    if (code === 'ECONNREFUSED') {
        return 'No hay ningún PostgreSQL escuchando en ese host/puerto. Verificá que el servicio esté iniciado, el puerto sea correcto y, en Docker, que el contenedor esté arriba.'
    }

    if (code === 'ETIMEDOUT' || code === 'EHOSTUNREACH' || normalized.includes('timeout expired')) {
        return 'La conexión no llegó a establecerse. Revisá firewall, VPN, la región de la base y la URL (externa vs interna).'
    }

    if (code === '28P01' || normalized.includes('password authentication failed')) {
        return 'Usuario o contraseña incorrectos. Revisá las credenciales de DATABASE_URL (si la contraseña tiene caracteres especiales, debe ir URL-encoded).'
    }

    if (code === '3D000' || normalized.includes('does not exist')) {
        return 'La base de datos indicada no existe. Creala o corregí el nombre al final de DATABASE_URL.'
    }

    if (code === '28000' || normalized.includes('no pg_hba.conf entry')) {
        return 'El servidor rechazó la conexión por sus reglas de autenticación (pg_hba.conf) o por el host de origen.'
    }

    if (normalized.includes('self-signed certificate') || code === 'SELF_SIGNED_CERT_IN_CHAIN') {
        return 'Problema de SSL: el certificado no es válido desde este cliente. Probá DB_SSL=true para proveedores administrados o DB_SSL=false solo en local.'
    }

    if (normalized.includes('connection terminated unexpectedly')) {
        return 'La instancia aceptó TCP/TLS pero cortó la conexión durante el inicio de sesión. En Render, una base Free expira a los 30 días y queda inaccesible (aunque el hostname siga resolviendo). Revisá el estado en el dashboard. También ocurre si usás una URL interna desde fuera de Render.'
    }

    if (code === '57P01' || code === '08006' || code === '08003') {
        return 'La conexión se perdió porque el servidor se está reiniciando o cerrando. Esperá unos segundos y volvé a intentar.'
    }

    return undefined
}

/**
 * Convierte el error de Sequelize/pg en un bloque legible con el código real,
 * el mensaje del servidor y una pista accionable.
 */
export function formatDatabaseError(error: unknown): string {
    const err = asErrorLike(error)
    const parent = asErrorLike(err.parent)
    const original = asErrorLike(err.original)

    const code = String(
        err.code ?? parent.code ?? original.code ?? err.errno ?? parent.errno ?? ''
    )

    const rawMessage = [
        err.message,
        parent.message,
        original.message,
        err.detail,
        parent.detail
    ]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' | ')

    const message = redactSecrets(rawMessage) || '(sin mensaje)'
    const lines = [
        `  Tipo: ${err.name || parent.name || 'Error'}`,
        `  Código: ${code || '(sin código)'}`,
        `  Mensaje: ${message}`
    ]

    const hint = getHint(code, rawMessage)
    if (hint) lines.push(`  Pista: ${hint}`)

    return lines.join('\n')
}
