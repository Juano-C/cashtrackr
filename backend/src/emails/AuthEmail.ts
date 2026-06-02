import { transport } from "../config/nodemailer"

type EmailType = {
    name: string
    email: string
    token: string
}

export class AuthEmail {
    static sendConfirmationEmail = async (user: EmailType) => {
        const email = await transport.sendMail({
            from: 'CashTrackr <cuentageneras@gmail.com>',
            to: user.email,
            subject: 'CashTrackr - Confirma tu cuenta',
            html: `
                <p>Hola: ${user.name}, has creado tu cuenta en CashTrackr, ya esta casi lista</p>
                <p>Visita el siguiente enlace: </p>
                <a href= "#">Confirmar cuenta</a>
                <p>e ingresa el codigo: <b>${user.token}</b></p>
            `
        })
        console.log('Mensaje enviado', email.messageId)
    }

        static sendPasswordResetToken = async (user: EmailType) => {
        const email = await transport.sendMail({
            from: 'CashTrackr <cuentageneras@gmail.com>',
            to: user.email,
            subject: 'CashTrackr - Reestablece tu password',
            html: `
                <p>Hola: ${user.name}, has reestablecer tu password</p>
                <p>Visita el siguiente enlace: </p>
                <a href= "#">Reestablecer Password</a>
                <p>e ingresa el codigo: <b>${user.token}</b></p>
            `
        })
        console.log('Mensaje enviado', email.messageId)
    }
}
