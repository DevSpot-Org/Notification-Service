import Joi from 'joi';
import { events } from '../events';

const eventTypeValidation = Joi.string().custom((value, helpers) => {
    // Extract the valid slugs from your events configuration
    const validSlugs = events.map((event) => event.slug);
    if (!validSlugs.includes(value)) {
        return helpers.error('any.invalid', { message: `Invalid event type: ${value}. Allowed values are: ${validSlugs.join(', ')}` });
    }
    return value;
});

export const userIdParamSchema = Joi.object({
    userId: Joi.string().required(),
});

export const notificationIdParamSchema = Joi.object({
    notificationId: Joi.string().required(),
});

export const getUserNotificationsQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).default(10),
    offset: Joi.number().integer().min(0).default(0),
});

export const updatePreferenceParamsSchema = Joi.object({
    userId: Joi.string().required(),
    eventType: eventTypeValidation.required(),
});

export const updatePreferenceBodySchema = Joi.object({
    channels: Joi.object({
        email: Joi.boolean().required(),
        'in-app': Joi.boolean().required(),
    })
        .required()
        .custom((value, helpers) => {
            const selectedChannels = Object.keys(value).filter((key) => value[key] === true);
            return selectedChannels;
        }),
});

export const sendEventSchema = Joi.object({
    eventType: eventTypeValidation.required(),
    userId: Joi.string().required(),
    payload: Joi.object().required(),
});
