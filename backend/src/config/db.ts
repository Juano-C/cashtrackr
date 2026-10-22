import { URL } from 'node:url'
import { Sequelize } from 'sequelize-typescript'
import { envSource } from './env'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
    throw new Error(
        'DATABASE_URL no está definida. Copiá backend/.env.example a backend/.env.local ' +
        'y configurá la conexión, o definí DATABASE_URL en las variables de entorno.'
    )
}

type DatabaseTarget = {
    host: string
    port: string
    database: string
    isLocal: boolean
    isRenderInternal: boolean
}

function parseTarget(raw: string): DatabaseTarget {
    try {
        const url = new URL(raw)
        const host = url.hostname
        const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)

        return {
            host,
            port: url.port || '5432',
            database: decodeURIComponent(url.pathname.replace(/^\//, '')) || '(sin nombre)',
            isLocal,
            // Render usa hosts internos sin dominio (ej. dpg-xxxx-a). Esos solo
            // funcionan desde otro servicio de Render en la misma región.
            isRenderInternal: !isLocal && !host.includes('.')
        }
    } catch {
        return {
            host: '(URL inválida)',
            port: '',
            database: '',
            isLocal: false,
            isRenderInternal: false
        }
    }
}

export const dbTarget = parseTarget(databaseUrl)

function resolveSsl(): boolean {
    if (process.env.DB_SSL === 'true') return true
    if (process.env.DB_SSL === 'false') return false
    if (dbTarget.isLocal || dbTarget.isRenderInternal) return false
    if (/[?&]sslmode=disable(?:&|$)/.test(databaseUrl)) return false
    return true
}

export const dbSslEnabled = resolveSsl()

export const dbEnvSource = envSource

export const db = new Sequelize(databaseUrl, {
    models: [__dirname + '/../models/**/*'], // Incluye todos los archivos que estan en models
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    dialectOptions: {
        connectionTimeoutMillis: 15000,
        ...(dbSslEnabled
            ? {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            }
            : {})
    },
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
})
