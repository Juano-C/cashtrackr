import { createRequest, createResponse } from 'node-mocks-http';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuthController } from '../../../controllers/AuthController';
import User from '../../../models/User';
import { checkPassword, hashPassword } from '../../../utils/auth';
import { generateToken } from '../../../utils/token';
import { AuthEmail } from '../../../emails/AuthEmail';
import { generateJWT } from '../../../utils/jwt';

// 🛠️ MOCKS CON FÁBRICAS EXPLÍCITAS: Esto arregla el error de Sequelize y los códigos 403 fortuitos
jest.mock('../../../models/User', () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(),
        create: jest.fn()
    }
}));
jest.mock('../../../utils/auth', () => ({
    checkPassword: jest.fn(),
    hashPassword: jest.fn()
}));
jest.mock('../../../utils/token', () => ({
    generateToken: jest.fn()
}));
jest.mock('../../../utils/jwt', () => ({
    generateJWT: jest.fn()
}));

describe('AuthController.createAccount', () => {

    beforeEach(() => {
        jest.resetAllMocks(); // Resetear todos los mocks antes de cada test
    });

    it('should return a 409 status and an error message if the email is already registered', async () => {
        jest.mocked(User.findOne).mockResolvedValue({ id: '1' } as any as User); 
        
        const req = createRequest({
            method: 'POST',
            url: 'api/auth/create-account',
            body: {
                email: 'test@test.com',
                password: 'testpassword'
            }
        });
        const res = createResponse();

        await AuthController.createAccount(req, res);

        const data = res._getJSONData();
        expect(res.statusCode).toBe(409);
        expect(data).toHaveProperty('error', 'El email ya está en uso');
        expect(User.findOne).toHaveBeenCalled();
        expect(User.findOne).toHaveBeenCalledTimes(1);
    });

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
        const res = createResponse();

        const mockUser = { ...req.body, save: jest.fn() };
        jest.mocked(User.create).mockResolvedValue(mockUser as any);
        jest.mocked(hashPassword).mockResolvedValue('hashedpassword');
        jest.mocked(generateToken).mockReturnValue('123456');
        jest.spyOn(AuthEmail, 'sendConfirmationEmail').mockImplementation(() => Promise.resolve());

        await AuthController.createAccount(req, res);

        expect(User.create).toHaveBeenCalledWith(req.body);
        expect(User.create).toHaveBeenCalledTimes(1);
        expect(mockUser.save).toHaveBeenCalled();
        expect(mockUser.password).toBe('hashedpassword');
        expect(mockUser.token).toBe('123456');
        expect(AuthEmail.sendConfirmationEmail).toHaveBeenCalledWith({
            name: req.body.name,
            email: req.body.email,
            token: '123456'
        });
        expect(AuthEmail.sendConfirmationEmail).toHaveBeenCalledTimes(1);
        expect(res.statusCode).toBe(201);
    });

});

describe('AuthController.login', () => {
    
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should return 404 if user is not found', async () => {
        jest.mocked(User.findOne).mockResolvedValue(null);

        const req = createRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: {
                email: "test@test.com",
                password: "testpassword"
            }
        });
        const res = createResponse();

        await AuthController.login(req, res);

        const data = res._getJSONData();
        expect(res.statusCode).toBe(404);
        expect(data).toEqual({ error: 'Usuario no encontrado' });
    });

    it('should return 403 if the account has not been confirmed', async () => {
        jest.mocked(User.findOne).mockResolvedValue({
            id: 1,
            email: "test@test.com",
            password: "password",
            confirmed: false // 🛠️ CORREGIDO: Coincide exactamente con tu controlador (user.confirmed)
        } as any as User);

        const req = createRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: {
                email: "test@test.com",
                password: "testpassword"
            }
        });
        const res = createResponse();

        await AuthController.login(req, res);

        const data = res._getJSONData();
        expect(res.statusCode).toBe(403);
        expect(data).toEqual({ error: 'La cuenta no ha sido confirmada' });
    });

    it('should return 401 if the password is incorrect', async () => {
        const userMock = {
            id: 1,
            email: "test@test.com",
            password: "password",
            confirmed: true // 🛠️ CORREGIDO: Cambiado a confirmed para alinearse con el controlador
        };
        jest.mocked(User.findOne).mockResolvedValue(userMock as any as User);
        jest.mocked(checkPassword).mockResolvedValue(false);

        const req = createRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: {
                email: "test@test.com",
                password: "testpassword"
            }
        });
        const res = createResponse();

        await AuthController.login(req, res);

        const data = res._getJSONData();
        expect(res.statusCode).toBe(401);
        expect(data).toEqual({ error: 'Password incorrecto' });
        expect(checkPassword).toHaveBeenCalledWith(req.body.password, userMock.password);
        expect(checkPassword).toHaveBeenCalledTimes(1);
    });

    it('should return a JWT if authentication is successful', async () => {
        const userMock = {
            id: 1,
            email: "test@test.com",
            password: "hashed_password",
            confirmed: true // 🛠️ CORREGIDO: Cambiado a confirmed
        };
        const req = createRequest({
            method: 'POST',
            url: '/api/auth/login',
            body: {
                email: "test@test.com",
                password: "password"
            }
        });
        const res = createResponse();

        const fakejwt = 'fake_jwt';

        jest.mocked(User.findOne).mockResolvedValue(userMock as any as User);
        jest.mocked(checkPassword).mockResolvedValue(true);
        jest.mocked(generateJWT).mockReturnValue(fakejwt);

        await AuthController.login(req, res);

        const data = res._getJSONData();
        expect(res.statusCode).toBe(200);
        expect(data).toEqual(fakejwt);
        expect(generateJWT).toHaveBeenCalledTimes(1);
        expect(generateJWT).toHaveBeenCalledWith(userMock.id as any);
    });

});