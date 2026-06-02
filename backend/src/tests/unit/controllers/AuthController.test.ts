import { createRequest, createResponse } from 'node-mocks-http';
import { AuthController } from '../../../controllers/AuthController';
import User from '../../../models/User';
import { hashPassword } from '../../../utils/auth';
import { generateToken } from '../../../utils/token';
import { AuthEmail } from '../../../emails/AuthEmail';

//Mocking automatico
jest.mock('../../../models/User')
jest.mock('../../../utils/auth')
jest.mock('../../../utils/token')

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
