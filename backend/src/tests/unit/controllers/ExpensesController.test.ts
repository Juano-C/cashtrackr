import { createRequest, createResponse } from "node-mocks-http"
import Expense from '../../../models/Expense'
import { ExpensesController } from '../../../controllers/ExpenseController'
import { expenses } from "../../mocks/expenses";
import { jest, describe, it, expect } from '@jest/globals'

jest.mock('../../../models/Expense', () => ({
    create: jest.fn(),
    default: jest.fn()
}))

// Grupo de pruebas para ExpensesController metodo create
describe('ExpensesController.create', () => {
    it('should create a new expense', async () => {
        const expenseMock = {
            save: jest.fn()
        };

        (Expense.create as any).mockResolvedValue(expenseMock)

        const req = createRequest({
            method: 'POST',
            url: '/api/budgets/:budgetId/expenses',
            body: { name : 'Test Expense', amount: 500 },
            budget: { id: 1 }
        })
        const res = createResponse()

        await ExpensesController.create(req, res)

        const data = res._getJSONData()
        expect(res.statusCode).toBe(201);
        expect(data).toEqual('Gasto agregado correctamente')
        expect(expenseMock.save).toHaveBeenCalled()
        expect(expenseMock.save).toHaveBeenCalledTimes(1)
        expect(Expense.create).toHaveBeenCalledWith(req.body)
    })

    it('should handle expense creation error', async () => {
        const expenseMock = {
            save: jest.fn()
        };

        (Expense.create as any).mockRejectedValue(new Error)

        const req = createRequest({
            method: 'POST',
            url: '/api/budgets/:budgetId/expenses',
            body: { name: 'Gasto Prueba', amount: 500 },
            budget: { id: 1 }
        });
        const res = createResponse();
        await ExpensesController.create(req, res);

        const data = res._getJSONData();
        expect(data).toEqual({ error: 'Hubo un error' });
        expect(res.statusCode).toBe(500);
        expect(expenseMock.save).not.toHaveBeenCalled();
    })
})

// Grupo de pruebas para ExpensesController metodo getById
describe('ExpensesController.getById', () => {
    it('should return expense with ID 1', async () => {
        const req = createRequest({
            method: 'GET',
            url: '/api/budgets/:budgetId/expenses/:expenseId',
            expense: expenses[0]
        });
        const res = createResponse();

        await ExpensesController.getById(req, res);

        const data = res._getJSONData();
        expect(data).toEqual(expenses[0]);

        expect(res.statusCode).toBe(200);
    })
})

// Grupo de pruebas para ExpensesController metodo updateById
describe('ExpensesController.updateById', () => {
    it('should update expense and return a success message', async () => {
        const expenseMock = {
            ...expenses[0],
            update: jest.fn()
        }

        const req = createRequest({
            method: 'PUT',
            url: '/api/budgets/:budgetId/expenses/:expenseId',
            expense: expenseMock,
            body: { name: 'Gasto Actualizado', amount: 100 }
        });
        const res = createResponse();

        await ExpensesController.updateById(req, res);

        const data = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(data).toBe('Se actualizo correctamente')
        expect(expenseMock.update).toHaveBeenCalledWith(req.body)
        expect(expenseMock.update).toHaveBeenCalledTimes(1)
    })
})

// Grupo de pruebas para ExpensesController metodo deleteById
describe('ExpensesController.deleteById', () => {
    it('should delete expense and return a success message', async () => {
        const expenseMock = {
            ...expenses[0],
            destroy: jest.fn()
        }

        const req = createRequest({
            method: 'DELETE',
            url: '/api/budgets/:budgetId/expenses/:expenseId',
            expense: expenseMock
        });
        const res = createResponse();

        await ExpensesController.deleteById(req, res);

        const data = res._getJSONData()
        expect(res.statusCode).toBe(200)
        expect(data).toBe('Gasto eliminado')
        expect(expenseMock.destroy).toHaveBeenCalled()
        expect(expenseMock.destroy).toHaveBeenCalledTimes(1)
    })
})