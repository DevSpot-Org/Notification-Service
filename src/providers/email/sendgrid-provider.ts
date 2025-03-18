import { createTransport } from 'nodemailer';
import sendgridTransport from 'nodemailer-sendgrid';
import { config } from '../../core/config';
import { BadRequestError } from '../../core/errors';
import { Notification, NotificationType } from '../../types';
import { BaseNotificationProvider } from '../provider-interface';

export class SendgridProvider extends BaseNotificationProvider {
    constructor() {
        super('sendgrid', NotificationType.EMAIL);
    }

    public async send(notification: Notification): Promise<void> {
        try {
            if (!config.sendGrid.sendGridApikey) {
                throw new BadRequestError('Api Key For Sendgrid has not been Set!');
            }

            const transporter = createTransport(
                sendgridTransport({
                    apiKey: config.sendGrid.sendGridApikey,
                }),
            );

            if (!transporter) {
                throw new BadRequestError('Sendgrid Transporter could not be initialized');
            }

            const mailOptions = {
                to: notification.data?.email,
                from: config.sendGrid.sendgrid_email,
                subject: notification.title,
                text: notification.body,
                html: notification.body,
            };

            await transporter.sendMail(mailOptions);

            console.log(`[SendGrid] Email sent to ${notification.data?.email}`);
        } catch (error) {
            console.error('[SendGrid] Error sending email:', error);
            throw error;
        }
    }
}
