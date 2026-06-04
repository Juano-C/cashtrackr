/// <reference types="jest" />
import { createRequest, createResponse } from 'node-mocks-http'
import { budgets } from "../../mocks/budgets"
import { BudgetController } from '../../../controllers/BudgetController'
import Budget from '../../../models/Budget'
import Expenses from '../../../models/Expense'

// Crea un mock (simulación) del modelo Budget
// Esto evita que las pruebas interactúen con la base de datos real
jest.mock('../../../models/Budget', () => {
    return {
        // Reemplaza el método findAll con una función simulada de Jest
        findAll: jest.fn(),
        create: jest.fn(),
        findByPk: jest.fn()
        // Puedes agregar más métodos simulados si es necesario
    }
})

// Grupo de pruebas para BudgetController metodo getAll
describe('BudgetController.getAll', () => {

    beforeEach(() => {
        (Budget.findAll as jest.Mock).mockReset();
        (Budget.findAll as jest.Mock).mockImplementation((options) => {
            // Filtra los presupuestos mock para obtener solo los del usuario con ID 1 (Req simulado)
            const updatedBudgets = budgets.filter(budget => budget.userId === options.where.userId);
            return Promise.resolve(updatedBudgets);
        })
    })

    it('should retrieve 2 budgets for user with ID 1', async () => {

        // Crea un Request HTTP simulada
        const req = createRequest({
            method: 'GET',
            url: '/api/budgets',
            user: { id: 1 }
        })

        // Crea un Response HTTP simulada
        const res = createResponse();

        // Ejecuta el método del controlador que se está probando
        await BudgetController.getAll(req, res)

        // Obtiene los datos JSON que se enviaron en la respuesta
        const data = res._getJSONData()

        // Verificaciones (assertions):
        expect(data).toHaveLength(2)     // Espera que haya 2 presupuestos
        expect(res.statusCode).toBe(200) // Espera código de estado 200 (éxito)
        expect(res.status).not.toBe(404) // Verifica que NO sea 404 (no encontrado)
    })

    it('should retrieve 1 budgets for user with ID 2', async () => {

        const req = createRequest({
            method: 'GET',
            url: '/api/budgets',
            user: { id: 2 }
        })
        const res = createResponse();

        await BudgetController.getAll(req, res)

        const data = res._getJSONData()

        // Verificaciones (assertions):
        expect(data).toHaveLength(1)     // Espera que haya 1 presupuesto
        expect(res.statusCode).toBe(200) // Espera código de estado 200 (éxito)
        expect(res.status).not.toBe(404) // Verifica que NO sea 404 (no encontrado)
    })

    it('should retrieve 0 budgets for user with ID 10', async () => {

        const req = createRequest({
            method: 'GET',
            url: '/api/budgets',
            user: { id: 10 }
        })
        const res = createResponse();

        await BudgetController.getAll(req, res)

        const data = res._getJSONData()

        // Verificaciones (assertions):
        expect(data).toHaveLength(0)     // Espera que haya 0 presupuestos
        expect(res.statusCode).toBe(200) // Espera código de estado 200 (éxito)
        expect(res.status).not.toBe(404) // Verifica que NO sea 404 (no encontrado)
    })

    it('should handle errors when fetching budgets', async () => {
        const req = createRequest({
            method: 'GET',
            url: '/api/budgets',
            user: { id: 100 }
        })
        const res = createResponse();

        (Budget.findAll as jest.Mock).mockRejectedValue(new Error)
        await BudgetController.getAll(req, res)

        expect(res.statusCode).toBe(500)
        expect(res._getJSONData()).toEqual({ error: 'hubo un error en obtener todo' })
    })
})

// Grupo de pruebas para BudgetController metodo create
describe('BudgetController.create', () => {
    it('Should create a new budget and respond with statusCode 201', async () => {
        const mockBudget = {
            save: jest.fn().mockResolvedValue(true)
        };
        (Budget.create as jest.Mock).mockResolvedValue(mockBudget)
        const req = createRequest({
            method: 'POST',
            url: '/api/budgets',
            user: { id: 100 },
            body: { name: 'Presupuesto Prueba', amount: 1000 }
        })
        const res = createResponse();
        await BudgetController.create(req, res)

        const data = res._getJSONData()

        // Pruebas (assertions)
        expect(res.statusCode).toBe(201)
        expect(data).toBe('Presupuesto Creado Correctamente')
        expect(mockBudget.save).toHaveBeenCalled()
        expect(mockBudget.save).toHaveBeenCalledTimes(1)
        expect(Budget.create).toHaveBeenCalledWith(req.body)
    })

    it('Should handle budget creation error', async () => {

        const mockBudget = {
            save: jest.fn()
        };

        (Budget.create as jest.Mock).mockRejectedValue(new Error)
        const req = createRequest({
            method: 'POST',
            url: '/api/budgets',
            user: { id: 100 },
            body: { name: 'Presupuesto Prueba', amount: 1000 }
        })
        const res = createResponse();
        await BudgetController.create(req, res)

        const data = res._getJSONData()

        // Pruebas (assertions)
        expect(res.statusCode).toBe(500)
        expect(data).toEqual({ error: 'hubo un error en create' })

        expect(mockBudget.save).not.toHaveBeenCalled()
        expect(Budget.create).toHaveBeenCalledWith(req.body)
    })
})

// Grupo de pruebas para BudgetController metodo getById
describe('BudgetController.getById', () => {

    beforeEach(() => {
        (Budget.findByPk as jest.Mock).mockImplementation(id => {
            const budget = budgets.filter(b => b.id === id)[0];
            return Promise.resolve(budget);
        });
    })

    it('Should return a budget  with ID 1 and 3 expenses', async () => {
        const budgetId = 1;

        // Crea un Request HTTP simulada
        const req = createRequest({
            method: 'GET',
            url: '/api/budgets/:budgetId',
            budget: { id: budgetId }
        })

        // Crea un Response HTTP simulada
        const res = createResponse();

        // Ejecuta el método del controlador que se está probando
        await BudgetController.getById(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(data.expenses).toHaveLength(3)
        expect(Budget.findByPk).toHaveBeenCalledWith(budgetId, { include: [Expenses] })
    })

    it('Should return a budget  with ID 2 and 2 expenses', async () => {
        // Crea un Request HTTP simulada
        const req = createRequest({
            method: 'GET',
            url: '/api/budgets',
            budget: { id: 2 }
        })

        // Crea un Response HTTP simulada
        const res = createResponse();

        // Ejecuta el método del controlador que se está probando
        await BudgetController.getById(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(data.expenses).toHaveLength(2)
    })

    it('Should return a budget  with ID 3 and 0 expenses', async () => {
        // Crea un Request HTTP simulada
        const req = createRequest({
            method: 'GET',
            url: '/api/budgets',
            budget: { id: 3 }
        })

        // Crea un Response HTTP simulada
        const res = createResponse();

        // Ejecuta el método del controlador que se está probando
        await BudgetController.getById(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(data.expenses).toHaveLength(0)
    })
})

// Grupo de pruebas para BudgetController metodo updateById
describe('BudgetController.updateById', () => {
    it('Should update the budget and return a success message', async () => {
        const budgetMock = {
            update: jest.fn().mockResolvedValue(true)
        }
        // Crea un Request HTTP simulada
        const req = createRequest({
            method: 'PUT',
            url: '/api/budgets/:budgetId',
            budget: budgetMock,
            body: { name: 'Presupuesto Actualizado', amount: 5000 }
        })

        // Crea un Response HTTP simulada
        const res = createResponse();

        // Ejecuta el método del controlador que se está probando
        await BudgetController.updateById(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(data).toBe('Presupuesto actualizado correctamente')
        expect(budgetMock.update).toHaveBeenCalledWith(req.body)
        expect(budgetMock.update).toHaveBeenCalledTimes(1)
    })
})

// Grupo de pruebas para BudgetController metodo deleteById
describe('BudgetController.deleteById', () => {
    it('Should delete the budget and return a success message', async () => {
        const budgetMock = {
            destroy: jest.fn().mockResolvedValue(true)
        }
        // Crea un Request HTTP simulada
        const req = createRequest({
            method: 'DELETE',
            url: '/api/budgets/:budgetId',
            budget: budgetMock
        })

        // Crea un Response HTTP simulada
        const res = createResponse();

        // Ejecuta el método del controlador que se está probando
        await BudgetController.deleteById(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(data).toBe('Presupuesto eliminado correctamente')
        expect(budgetMock.destroy).toHaveBeenCalledTimes(1)
    })
})