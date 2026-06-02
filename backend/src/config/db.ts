import { Sequelize } from 'sequelize-typescript'
import dotenv from 'dotenv'
dotenv.config()

export const db = new Sequelize(process.env.DATABASE_URL, {
    models: [__dirname + '/../models/**/*'], // Incluye todos los archivos que estan en models
    logging: false,
    dialectOptions: {
        ssl: {
            require: false
        }
    }
})