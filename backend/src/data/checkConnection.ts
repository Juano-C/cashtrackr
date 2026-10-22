import colors from 'colors'
import { db, dbEnvSource, dbSslEnabled, dbTarget } from '../config/db'
import { formatDatabaseError } from '../utils/dbError'

type QueryRow = {
    database: string
    user: string
    version: string
}

const checkConnection = async () => {
    console.log(colors.cyan.bold('\nDiagnostico de conexion a PostgreSQL'))
    console.log(`  Destino:      ${dbTarget.host}:${dbTarget.port}/${dbTarget.database}`)
    console.log(`  SSL:          ${dbSslEnabled ? 'on' : 'off'}`)
    console.log(`  Configuracion: ${dbEnvSource}\n`)

    try {
        await db.authenticate()

        const [rows] = await db.query(
            'select current_database() as database, current_user as "user", version() as version'
        )
        const row = (rows as QueryRow[])[0]

        console.log(colors.green.bold('Conexion exitosa'))
        console.log(`  Base:    ${row?.database ?? '(desconocida)'}`)
        console.log(`  Usuario: ${row?.user ?? '(desconocido)'}`)
        console.log(`  Version: ${String(row?.version ?? '').split(',')[0]}`)

        await db.close()
        process.exit(0)
    } catch (error) {
        console.error(colors.red.bold('No se pudo conectar a la base de datos'))
        console.error(colors.red(formatDatabaseError(error)))

        await db.close().catch(() => undefined)
        process.exit(1)
    }
}

checkConnection()
