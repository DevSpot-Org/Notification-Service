import fs from 'fs';
import handlebars from 'handlebars';
import path from 'path';
import { appConfig } from '../core/config';
import { NotificationEventType, NotificationTemplate } from '../types';

export class TemplateEngine {
    private templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();
    private templatesPath: string;

    constructor() {
        this.templatesPath = appConfig.templates.path;
        this.initializeTemplates();
    }

    private initializeTemplates(): void {
        handlebars.registerHelper('formatDate', (date: Date) => {
            return new Date(date).toLocaleDateString();
        });

        handlebars.registerHelper('uppercase', (text: string) => {
            return text.toUpperCase();
        });
    }

    private getTemplatePath(eventType: NotificationEventType): string {
        return path.join(this.templatesPath, `${eventType}.hbs`);
    }

    private compileTemplate(templateContent: string): HandlebarsTemplateDelegate {
        return handlebars.compile(templateContent);
    }

    private getCompiledTemplate(eventType: NotificationEventType): Promise<HandlebarsTemplateDelegate> {
        return new Promise((resolve, reject) => {
            const cacheKey = eventType;

            if (this.templateCache.has(cacheKey)) {
                return resolve(this.templateCache.get(cacheKey)!);
            }

            const templatePath = this.getTemplatePath(eventType);

            fs.readFile(templatePath, 'utf8', (err, data) => {
                if (err) {
                    const defaultTemplate = `
                      <h1>{{title}}</h1>
                      <p>{{body}}</p>
                    `;

                    const compiled = this.compileTemplate(defaultTemplate);
                    this.templateCache.set(cacheKey, compiled);
                    return resolve(compiled);
                }

                const compiled = this.compileTemplate(data);
                this.templateCache.set(cacheKey, compiled);
                resolve(compiled);
            });
        });
    }

    public async renderTemplate(eventType: NotificationEventType, data: any): Promise<NotificationTemplate> {
        try {
            const template = await this.getCompiledTemplate(eventType);

            // This is a demo template which just title and body are passed in data
            // We would have more complex structures later
            const renderedContent = template(data);
            const title = data.title || eventType;
            const body = data.body || renderedContent;

            return {
                id: `notification-${Date.now()}`,
                eventType,
                title,
                body,
                data,
            };
        } catch (error) {
            console.error('Error rendering template:', error);
            return {
                id: `notification-${Date.now()}`,
                eventType,
                title: data.title || 'Notification',
                body: data.body || 'You have a new notification.',
                data,
            };
        }
    }
}
