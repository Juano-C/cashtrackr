import request from 'supertest';
import server from '../../server';
import { describe, it, expect, jest } from '@jest/globals';
import { AuthController } from '../../controllers/AuthController';

describe('Authentication - Create account', () => {
    it('should display validation errors when form is empty', async () => {
        const response = await request(server)
            .post('/api/auth/create-account')
            .send({})
        const createAccountMock = jest.spyOn(AuthController, 'createAccount')

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty('errors')
        expect(response.body.errors).toHaveLength(3)

        expect(response.status).not.toBe(201)
        expect(response.body.errors).not.toHaveLength(2)
        expect(createAccountMock).not.toHaveBeenCalled()
    })

    it('should return 400 status code when the email is invalid', async () => {
        const response = await request(server)
            .post('/api/auth/create-account')
            .send({
                "name" : "Juan",
                "password" : "12345678",
                "email" : "not_valid_email"
            })
        const createAccountMock = jest.spyOn(AuthController, 'createAccount')

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty('errors')
        expect(response.body.errors).toHaveLength(1)

        expect(response.body.errors[0].msg).toBe('Email no válido')

        expect(response.status).not.toBe(201)
        expect(response.body.errors).not.toHaveLength(2)
        expect(createAccountMock).not.toHaveBeenCalled()
    })

    it('should return 400 status code when the password is less than 8 characters', async () => {
        const response = await request(server)
            .post('/api/auth/create-account')
            .send({
                "name" : "Juan",
                "password" : "short",
                "email" : "test@test.com"
            })
        const createAccountMock = jest.spyOn(AuthController, 'createAccount')

        expect(response.status).toBe(400)
        expect(response.body).toHaveProperty('errors')
        expect(response.body.errors).toHaveLength(1)

        expect(response.body.errors[0].msg).toBe('El password es muy corto. Mínimo 8 caracteres')

        expect(response.status).not.toBe(201)
        expect(response.body.errors).not.toHaveLength(2)
        expect(createAccountMock).not.toHaveBeenCalled()
    })

    it('should return 201 status code when the user data is valid', async () => {
        const userData = {
            "name" : "Juan",
            "password" : "password",
            "email" : "test@test.com"
        }

        const response = await request(server)
            .post('/api/auth/create-account')
            .send(userData)

        expect(response.status).toBe(201)
        expect(response.status).not.toBe(400)
        expect(response.body).not.toHaveProperty('errors')
    })

    it('should return 409 confict when a user is already registered', async () => {
        const userData = {
            "name" : "Juan",
            "password" : "password",
            "email" : "test@test.com"
        }

        const response = await request(server)
            .post('/api/auth/create-account')
            .send(userData)

        expect(response.status).toBe(409)
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toBe('El email ya está en uso')
        expect(response.status).not.toBe(400)
        expect(response.status).not.toBe(201)
        expect(response.body).not.toHaveProperty('errors')
    })
})
