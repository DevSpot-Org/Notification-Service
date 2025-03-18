import * as dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

type INodeEnv = 'development' | 'production' | 'staging';

// Define validation schema for environment variables
const envSchema = Joi.object()
    .keys({
        NODE_ENV: Joi.string().valid('development', 'production', 'staging').required(),
        PORT: Joi.number().required(),

        SUPABASE_URL: Joi.string().required(),
        SUPABASE_KEY: Joi.string().required(),

        SENDGRID_API_KEY: Joi.string().optional(),
        SENDGRID_EMAIL: Joi.string().optional(),

        TWILIO_SID: Joi.string().optional(),
        TWILIO_AUTH_TOKEN: Joi.string().optional(),
        TWILIO_PHONE_NUMBER: Joi.number().optional(),
    })
    .unknown();

// Validate environment variables against the schema
const { value: validatedEnvVars, error: validationError } = envSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

// Throw an error if validation fails
if (validationError) {
    throw new Error(`Config validation error: ${validationError.message}`);
}

export const config = Object.freeze({
    port: validatedEnvVars.PORT,
    appEnvironment: validatedEnvVars.NODE_ENV as INodeEnv,

    supabase: {
        supabaseUrl: validatedEnvVars.SUPABASE_URL,
        supabaseKey: validatedEnvVars.SUPABASE_KEY,
    },

    twilio: {
        twilio_sid: validatedEnvVars.TWILIO_SID,
        twilio_auth_token: validatedEnvVars.TWILIO_AUTH_TOKEN,
        twilio_phone_number: validatedEnvVars.TWILIO_PHONE_NUMBER,
    },

    sendGrid: {
        sendGridApikey: validatedEnvVars.SENDGRID_API_KEY,
        sendgrid_email: validatedEnvVars.SENDGRID_EMAIL,
    },
});
