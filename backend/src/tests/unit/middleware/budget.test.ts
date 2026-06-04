import { createRequest, createResponse } from 'node-mocks-http'
import { describe, it, beforeEach, jest, expect } from "@jest/globals";
import { hasAccess, validateBudgetExists } from '../../../middleware/budget'
import Budget from '../../../models/Budget'
import { budgets } from '../../mocks/budgets'

// 🛠️ CORREGIDO: Usamos la fábrica explícita para que TypeScript y Sequelize no se confundan en el entorno de pruebas
jest.mock('../../../models/Budget', () => ({
    __esModule: true,
    default: {
        findByPk: jest.fn()
    }
}));

// Grupo de pruebas para middleware de presupuesto validateBudgetExists
describe('budget Middleware - validateBudgetExists', () => {
    
    beforeEach(() => {
        jest.resetAllMocks(); // Limpia los mocks antes de cada test
    });

    it('should handle non-existent budget', async () => {
        // 🛠️ LÍNEA 18 CORREGIDA: Usamos jest.mocked limpio
        jest.mocked(Budget.findByPk).mockResolvedValue(null);

        const req = createRequest({
            params: {
                budgetId: 1
            }
        })
        const res = createResponse()
        const next = jest.fn()

        await validateBudgetExists(req, res, next)

        expect(res.statusCode).toBe(404)
        const data = res._getJSONData()
        expect(data).toEqual({ error: 'Presupuesto no encontrado' })
        expect(next).not.toHaveBeenCalled()
    })

    it('should proceed to next middleware if budget exists', async () => {
        // 🛠️ LÍNEA 37 CORREGIDA: Usamos jest.mocked con el mock de tus datos
        jest.mocked(Budget.findByPk).mockResolvedValue(budgets[0] as any as Budget);

        const req = createRequest({
            params: {
                budgetId: 1
            }
        })
        const res = createResponse()
        const next = jest.fn()

        await validateBudgetExists(req, res, next)
        expect(next).toHaveBeenCalled()
        expect(req.budget).toEqual(budgets[0])
    })

    it('should handle internal server error', async () => {
        // Rejected simula un error en la base de datos para que vaya al catch
        jest.mocked(Budget.findByPk).mockRejectedValue(new Error())

        const req = createRequest({
            params: {
                budgetId: 1
            }
        })
        const res = createResponse()
        const next = jest.fn()

        await validateBudgetExists(req, res, next)

        expect(res.statusCode).toBe(500)
        const data = res._getJSONData()
        expect(data).toEqual({ error: 'hubo un error' })
        expect(next).not.toHaveBeenCalled()
    })
})

// Grupo de pruebas para middleware de presupuesto hasAccess
describe('budget Middleware - hasAccess', () => {
    it('should call next() if user has access to budget', async () => {
        const req = createRequest({
            budget: budgets[0],
            user: { id: 1 }
        })
        const res = createResponse()
        const next = jest.fn()

        hasAccess(req, res, next)
        expect(next).toHaveBeenCalled()
        expect(next).toHaveBeenCalledTimes(1)
    })

    it('should return 401 error if userId does not have access to budget', async () => {
        const req = createRequest({
            budget: budgets[0],
            user: { id: 2 }
        })
        const res = createResponse()
        const next = jest.fn()

        hasAccess(req, res, next)

        expect(res.statusCode).toBe(401)
        expect(res._getJSONData()).toEqual({ error: 'Accion no autorizada' })
        expect(next).not.toHaveBeenCalled()
    })
})