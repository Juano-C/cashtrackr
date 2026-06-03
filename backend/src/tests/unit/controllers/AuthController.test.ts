import { createRequest, createResponse } from 'node-mocks-http';
import { AuthController } from '../../../controllers/AuthController';
import User from '../../../models/User';
import { checkPassword, hashPassword } from '../../../utils/auth';
import { generateToken } from '../../../utils/token';
import { AuthEmail } from '../../../emails/AuthEmail';
import { generateJWT } from '../../../utils/jwt';

//Mocking automatico
jest.mock('../../../models/User')
jest.mock('../../../utils/auth')
jest.mock('../../../utils/token')
jest.mock('../../../utils/jwt')

describe('AuthController.createAccount', () => {

    beforeEach(() => {
        jest.resetAllMocks() // Resetear mocks antes de cada test
    })

    it('should return a 409 status and an error message if the email is already registered', async () => {
        (User.findOne as jest.Mock).mockResolvedValue(true) // Simulamos que el usuario ya existe
        
        const req = createRequest({
            method: 'POST',
            url: 'api/auth/create-account',
            body: {
                email: 'test@test.com',
                password: 'testpassword'
            }
        });
        const res = createResponse()

        await AuthController.createAccount(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(409)
        expect(data).toHaveProperty('error', 'El email ya está en uso')
        expect(User.findOne).toHaveBeenCalled()
        expect(User.findOne).toHaveBeenCalledTimes(1)
    })

    it('should create a new account and return a success message', async () => {

        const req = createRequest({
            method: 'POST',
            url: 'api/auth/create-account',
            body: {
                email: 'test@test.com',
                password: 'testpassword',
                name: 'Test Name'
            }
        });
        const res = createResponse()

        const mockUser = { ...req.body, save: jest.fn() };
        (User.create as jest.Mock).mockResolvedValue(mockUser);
        (hashPassword as jest.Mock).mockResolvedValue('hashedpassword'); // mockResolvedValue para funciones asíncronas
        (generateToken as jest.Mock).mockReturnValue('123456'); // mockReturnvalue para funciones sincrónicas
        jest.spyOn(AuthEmail, 'sendConfirmationEmail').mockImplementation(() => Promise.resolve()); // Mockeamos el envío de email

        await AuthController.createAccount(req, res)

        expect(User.create).toHaveBeenCalledWith(req.body)
        expect(User.create).toHaveBeenCalledTimes(1)
        expect(mockUser.save).toHaveBeenCalled()
        expect(mockUser.password).toBe('hashedpassword')
        expect(mockUser.token).toBe('123456')
        expect(AuthEmail.sendConfirmationEmail).toHaveBeenCalledWith({
            name: req.body.name,
            email: req.body.email,
            token: '123456'
        })
        expect(AuthEmail.sendConfirmationEmail).toHaveBeenCalledTimes(1)
        expect(res.statusCode).toBe(201)
    })

})

describe('AuthController.login', () => {

    // Prueba de usuario no encontrado
    it('should return a 404 if user is not found', async () => {
        (User.findOne as jest.Mock).mockResolvedValue(null) // Simulamos que el usuario no existe

        const req = createRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: {
                email: 'test@test.com',
                password: 'testpassword'
            }
        });
        const res = createResponse()

        await AuthController.login(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(404)
        expect(data).toEqual({ error: 'Usuario no encontrado' })

    })

    // Prueba de cuenta no confirmada
    it('should return a 403 if the account has not been confirmed', async () => {
        (User.findOne as jest.Mock).mockResolvedValue({
            id: '1',
            email: 'test@test.com',
            password: 'password',
            isConfirmed: false // Simulamos que el usuario no ha confirmado su cuenta
        })

        const req = createRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: {
                email: 'test@test.com',
                password: 'testpassword'
            }
        });
        const res = createResponse()

        await AuthController.login(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(403)
        expect(data).toEqual({ error: 'La cuenta no ha sido confirmada' })

    })

    // Prueba de contraseña incorrecta
    it('should return a 401 if the password is incorrect', async () => {
        const userMock = {
            id: '1',
            email: 'test@test.com',
            password: 'password',
            confirmed: true // Simulamos que el usuario no ha confirmado su cuenta
        };

        (User.findOne as jest.Mock).mockResolvedValue(userMock)

        const req = createRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: {
                email: 'test@test.com',
                password: 'testpassword'
            }
        })
        const res = createResponse();

        (checkPassword as jest.Mock).mockResolvedValue(false) // Simulamos que la contraseña es incorrecta

        await AuthController.login(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(401)
        expect(data).toEqual({ error: 'Password incorrecto' })
        expect(checkPassword).toHaveBeenCalledWith(req.body.password, userMock.password)
        expect(checkPassword).toHaveBeenCalledTimes(1)
    })

    // Prueba de autenticación exitosa
    it('should return a JWT if authentication is successful', async () => {
        const userMock = {
            id: '1',
            email: 'test@test.com',
            password: 'hashed_password',
            confirmed: true // Simulamos que el usuario no ha confirmado su cuenta
        };

        const req = createRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: {
                email: 'test@test.com',
                password: 'password'
            }
        })
        const res = createResponse();
        const fakeJWT = 'fake_jwt_token';

        (User.findOne as jest.Mock).mockResolvedValue(userMock);
        (checkPassword as jest.Mock).mockResolvedValue(true); // Simulamos que la contraseña es correcta
        (generateJWT as jest.Mock).mockReturnValue('fakeJWT'); // Simulamos que se genera un JWT

        await AuthController.login(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(data).toEqual('fakeJWT')
        expect(generateJWT).toHaveBeenCalledTimes(1)
        expect(generateJWT).toHaveBeenCalledWith(userMock.id)
    })

})
