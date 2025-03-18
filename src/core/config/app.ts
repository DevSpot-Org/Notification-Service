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
        inApp: {
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
            default: 'twilio',
            available: ['twilio'],
        },
        inApp: {
            default: 'database',
            available: ['database'],
        },
    },
    templates: {
        path: './templates',
    },
};
