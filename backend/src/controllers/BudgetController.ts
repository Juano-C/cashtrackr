import type { Request, Response } from 'express'
import Budget from '../models/Budget'
import Expense from '../models/Expense'

export class BudgetController {

    static getAll = async (req: Request, res: Response) => {
        try {
            const budgets = await Budget.findAll({
                order: [
                    ['createdAt', 'DESC']
                ],
                where: {
                    userId: req.user.id
                }
            })

            res.json(budgets)
        } catch (error) {
            res.status(500).json({ error: 'hubo un error en obtener todo' })
        }
    }

    static create = async (req: Request, res: Response) => {
        try {
            const budget = await Budget.create(req.body)
            budget.userId = req.user.id
            await budget.save()
            res.status(201).json('Presupuesto Creado Correctamente')
        } catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.log(error);
            }
            res.status(500).json({ error: 'hubo un error en create' })
        }
    }

    static getById = async (req: Request, res: Response) => {
        const budget = await Budget.findByPk(req.budget.id, {
            include: [Expense]
        })
        res.json(budget)
    }

    static updateById = async (req: Request, res: Response) => {
        await req.budget.update(req.body)
        res.json('Presupuesto actualizado correctamente')
    }

    static deleteById = async (req: Request, res: Response) => {
        await req.budget.destroy()
        res.json('Presupuesto eliminado correctamente')
    }
}
