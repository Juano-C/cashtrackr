import { Table, Column, Model, DataType, HasMany, BelongsTo, ForeignKey, AllowNull } from 'sequelize-typescript' // Para crear una relacion con otra tabla
import Expense from './Expense'
import User from './User'


// Decorador: Envuelve una funcion y le añade caracteristicas adicionales sin necesidad de cambiar la funcion
@Table({
    tableName: 'budgets' // Nombre del presupuesto
})

class Budget extends Model {
    // Columna NOMBRE
    @AllowNull(false)
    @Column({
        type: DataType.STRING(100)
    })
    declare name: string

    // Columna MONTO DINERO
    @AllowNull(false)
    @Column({
        type: DataType.DECIMAL
    })
    declare amount: number

    @HasMany(() => Expense, {
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    })
    declare expenses: Expense[]

    @ForeignKey(() => User)
    declare userId: number

    @BelongsTo(() => User)
    declare user: User
}

export default Budget
