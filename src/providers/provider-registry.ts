import { NotificationType } from '../types';
import { NotificationProvider } from './provider-interface';

export class ProviderRegistry {
    private static instance: ProviderRegistry;
    private providers: Map<string, NotificationProvider> = new Map();

    private constructor() {}

    public static getInstance(): ProviderRegistry {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry();
        }
        return ProviderRegistry.instance;
    }

    public registerProvider(provider: NotificationProvider): void {
        const key = `${provider.type}:${provider.name}`;
        this.providers.set(key, provider);

        console.log(`Provider registered: ${key}`);
    }

    public getProvider(type: NotificationType, name: string): NotificationProvider | undefined {
        const key = `${type}:${name}`;

        return this.providers.get(key);
    }

    public getAllProviders(): NotificationProvider[] {
        return Array.from(this.providers.values());
    }

    public getProvidersByType(type: NotificationType): NotificationProvider[] {
        return this.getAllProviders().filter((provider) => provider.type === type);
    }
}
