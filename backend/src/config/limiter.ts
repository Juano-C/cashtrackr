import { rateLimit } from "express-rate-limit";

export const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    limit: 5, // Cuantos request se permiten por minuto
    message: { "error": "Has alcanzado el límite de peticiones" }
})