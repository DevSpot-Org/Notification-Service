import { NotificationType } from '@/core';
import { User } from '@/repositories';
import twilio from 'twilio';
import { config } from '../../core/config';
import { BadRequestError } from '../../core/errors';
import { BaseNotificationProvider } from '../provider-interface';

export class TwilioProvider extends BaseNotificationProvider {
    constructor() {
        super('twilio', NotificationType.SMS);
    }

    public async send(user: User, content: string): Promise<void> {
        try {
            if (!config.twilio.twilio_sid && !config.twilio.twilio_auth_token) {
                throw new BadRequestError('[Twilio] Api Key has not been Set!');
            }

            const client = twilio(config.twilio.twilio_sid, config.twilio.twilio_auth_token);

            if (!client) {
                throw new BadRequestError('[Twilio] Client could not be initialized');
            }

            console.log('[Twilio] Client has been Initialized');

            console.log('[Twilio] Sending SMS notification: ');

            await client.messages.create({
                body: content,
                from: config.twilio.twilio_phone_number,
                to: user?.phone,
            });

            console.log(`[Twilio] SMS sent to ${user?.phone}`);
        } catch (error) {
            console.error('[Twilio] Error sending SMS:', error);
            throw error;
        }
    }
}
