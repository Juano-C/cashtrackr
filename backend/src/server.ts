import express from 'express'
import colors from 'colors'
import morgan from 'morgan'
import { db, dbEnvSource, dbSslEnabled, dbTarget } from './config/db'
import { formatDatabaseError } from './utils/dbError'
import budgetRouter from './routes/budgetRouter'
import authRouter from './routes/authRouter'

export async function connectDB() {
    try {
        await db.authenticate()
        await db.sync()

        console.log(colors.blue.bold('Conexion exitosa a DB'))
        console.log(colors.gray(
            `  ${dbTarget.host}:${dbTarget.port}/${dbTarget.database} ` +
            `| SSL: ${dbSslEnabled ? 'on' : 'off'} ` +
            `| configuracion: ${dbEnvSource}`
        ))
    } catch (error) {
        console.error(colors.red.bold('Fallo la conexion/inicializacion de la DB'))
        console.error(colors.red(formatDatabaseError(error)))
        console.error(colors.yellow('Revisa backend/.env.local o las variables de entorno del servicio.'))
    }
}
connectDB()

const app = express()

app.use(morgan('dev'))

app.use(express.json())

app.use('/api/budgets', budgetRouter) // Rutas de presupuesto
app.use('/api/auth', authRouter) // Rutas de autenticacion

app.get('/', (req, res) => {
    res.send('Todo bien')
})

export default app
