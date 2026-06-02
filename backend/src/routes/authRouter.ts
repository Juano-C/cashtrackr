import { Router } from "express";
import { body, param } from "express-validator";
import { AuthController } from "../controllers/AuthController";
import { handleInputErrors } from "../middleware/validation";
import { limiter } from "../config/limiter";
import { authenticate } from "../middleware/auth";

const router = Router()

router.post('/create-account',
    body('name')
        .notEmpty().withMessage('El nombre no puede ir vacio'),

    body('password')
        .isLength({ min: 8 }).withMessage('El password es muy corto. Mínimo 8 caracteres'),

    body('email')
        .isEmail().withMessage('Email no válido'),
    handleInputErrors,
    AuthController.createAccount
)

router.post('/confirm-account',
    limiter,
    body('token')
        .notEmpty()
        .isLength({ min: 6, max: 6 })
        .withMessage('Token no valido'),
    handleInputErrors,
    AuthController.confirmAccount
)

router.post('/login',

    body('email')
        .isEmail().withMessage('Email no válido'),

    body('password')
        .notEmpty().withMessage('El password es obligatorio'),

    handleInputErrors,
    AuthController.login
)

router.post('/forgot-password',
    body('email')
        .isEmail().withMessage('Email no válido'),
    handleInputErrors,
    AuthController.forgotPassword
)

router.post('/validate-token',
    limiter,
    body('token')
        .notEmpty()
        .isLength({ min: 6, max: 6 })
        .withMessage('Token no valido'),
    handleInputErrors,
    AuthController.validateToken
)

router.post('/reset-password/:token',
    param('token')
        .notEmpty()
        .isLength({ min: 6, max: 6 })
        .withMessage('Token no valido'),

    body('password')
        .isLength({ min: 8 }).withMessage('El password es muy corto. Mínimo 8 caracteres'),

    handleInputErrors,
    AuthController.resetPasswordWirhToken
)

router.get('/user',
    authenticate,
    AuthController.user
)

router.post('/update-password',
    authenticate,
    body('current_password')
        .notEmpty().withMessage('El password antiguo no debe ir vacío'),

    body('password')
        .isLength({ min: 8 }).withMessage('El password nuevo es muy corto. Mínimo 8 caracteres'),

    handleInputErrors,
    AuthController.updateCurrentUserPassword
)

router.post('/check-password',
    authenticate,

    body('password')
        .notEmpty().withMessage('El password actual no puede ir vacío'),

    handleInputErrors,
    AuthController.checkPassword
)

export default router
