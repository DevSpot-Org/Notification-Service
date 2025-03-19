import { NextFunction, Request, Response } from 'express';
import { ObjectSchema } from 'joi';

export const validateSchema = (schema: ObjectSchema, property: 'body' | 'params' | 'query') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req[property]);

        if (error) {
            res.status(400).json({
                success: false,
                error: error.details[0].message,
            });
            return;
        }

        next();
    };
};
