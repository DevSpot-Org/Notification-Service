import { SendgridProvider } from './email/sendgrid-provider';
import { ProviderRegistry } from './provider-registry';

export function initializeProviders(): void {
    const registry = ProviderRegistry.getInstance();

    registry.registerProvider(new SendgridProvider());

    // registry.registerProvider(new TwilioProvider());
}
