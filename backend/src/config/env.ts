import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

// Punto unico de carga de variables de entorno.
// - .env.local gana sobre .env (util para desarrollo local).
// - En Render no existen estos archivos: se usan las variables del dashboard.
const backendRoot = path.resolve(__dirname, '../..')
const envLocalPath = path.join(backendRoot, '.env.local')
const envPath = path.join(backendRoot, '.env')

dotenv.config({
    path: [envLocalPath, envPath],
    quiet: true
})

export const envSource = fs.existsSync(envLocalPath)
    ? '.env.local'
    : fs.existsSync(envPath)
        ? '.env'
        : 'variables de entorno'
