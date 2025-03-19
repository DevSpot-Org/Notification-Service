import { SendgridProvider } from './email/sendgrid-provider';
import { DatabaseProvider } from './in-app/database-provider';
import { ProviderRegistry } from './provider-registry';
import { TwilioProvider } from './sms/twilio-provider';

export function initializeProviders(): void {
    const registry = ProviderRegistry.getInstance();

    // registry.registerProvider(new SendgridProvider());

    // registry.registerProvider(new TwilioProvider());

    registry.registerProvider(new DatabaseProvider());
}
