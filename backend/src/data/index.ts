import { exit } from 'process';
import { db } from '../config/db';

const clearData = async () => {
    try { 
        await db.sync({ force: true })
        console.log('Datos eliminados correctamente')
        exit(0) // Todo realizado correctamente, salimos con código 0
    } catch (error) {
        exit(1)
    }
}

if(process.argv[2] === '--clear') {
    clearData()
}