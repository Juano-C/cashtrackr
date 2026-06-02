import type { Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import Budget from "../models/Budget";

// Agrega a la interface REQUEST un a nueva propiedad permitida. BUDGET 
declare global {
    namespace Express {
        interface Request {
            budget?: Budget
        }
    }
}

export const validateBudgetId = async (req: Request, res: Response, next: NextFunction) => {
    await param('budgetId')
        .isInt().withMessage('ID no valido')
        .custom(value => value > 0).withMessage('ID no valido')
        .run(req)

    let errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
    }

    next()
}

export const validateBudgetExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { budgetId } = req.params
        const budget = await Budget.findByPk(budgetId)
        if (!budget) {
            const error = new Error('Presupuesto no encontrado')
            return res.status(404).json({ error: error.message })
        }
        req.budget = budget

        next()
    } catch (error) {
        res.status(500).json({ error: 'hubo un error' })
    }
}

export const validateBudgetInput = async (req: Request, res: Response, next: NextFunction) => {
    await body('name')
        .notEmpty().withMessage('El nombre del presupuesto no puede ir vacio').run(req)

    await body('amount')
        .notEmpty().withMessage('La cantidad del presupuesto no puede ir vacia')
        .isNumeric().withMessage('La cantidad no valida')
        .custom(value => value > 0).withMessage('El presupuesto debe ser mayor a cero').run(req)

    next()
}

export function hasAccess(req: Request, res: Response, next: NextFunction) {
    if (req.budget?.userId !== req.user.id) {
        const error = new Error('Accion no autorizada')
        return res.status(401).json({ error: error.message })
    }
    next()
}