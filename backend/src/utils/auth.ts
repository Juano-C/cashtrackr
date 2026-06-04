import bcrypt from 'bcrypt'

export const hashPassword = async (password: string) => {
    // Cuanto mas alto sea el num de salt, mas dificil será hackear con fuerza bruta PERO 
    // Consumira mas recursos del servidor el hashear el password
    const salt = await bcrypt.genSalt(10)
    return await bcrypt.hash(password, salt)
}

export const checkPassword = async (password: string, hash: string) => {
    return await bcrypt.compare(password, hash)
}
