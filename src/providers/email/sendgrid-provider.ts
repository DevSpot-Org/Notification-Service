import { NotificationType } from '@/core';
import { User } from '@/repositories';
import { createTransport } from 'nodemailer';
import sendgridTransport from 'nodemailer-sendgrid';
import { config } from '../../core/config';
import { BadRequestError } from '../../core/errors';
import { BaseNotificationProvider } from '../provider-interface';

export class SendgridProvider extends BaseNotificationProvider {
    constructor() {
        super('sendgrid', NotificationType.EMAIL);
    }

    public async send(user: User, content: string, metadata?: Record<any, any>): Promise<void> {
        try {
            if (!config.sendGrid.sendGridApikey) {
                throw new BadRequestError('[Sendgrid] Api Key has not been Set!');
            }

            const transporter = createTransport(
                sendgridTransport({
                    apiKey: config.sendGrid.sendGridApikey,
                }),
            );

            if (!transporter) {
                throw new BadRequestError('[Sendgrid] Transporter could not be initialized');
            }

            const mailOptions = {
                to: user?.email,
                from: config.sendGrid.sendgrid_email,
                subject: metadata?.title,
                text: content,
                html: content,
            };

            await transporter.sendMail(mailOptions);

            console.log(`[SendGrid] Email sent to ${user?.email}`);
        } catch (error: any) {
            console.error('[SendGrid] Error sending email:', error?.response?.body?.errors);
            throw error;
        }
    }
}
