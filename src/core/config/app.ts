interface AppConfig {
    providers: {
        email: {
            default: string;
            available: string[];
        };
        sms: {
            default: string;
            available: string[];
        };
    };
    templates: {
        path: string;
    };
}

export const appConfig: AppConfig = {
    providers: {
        email: {
            default: 'sendgrid',
            available: ['sendgrid'],
        },
        sms: {
            default: '',
            available: ['twilio'],
        },
    },
    templates: {
        path: './templates',
    },
};
