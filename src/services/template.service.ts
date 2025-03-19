import * as ejs from 'ejs';
import fs from 'fs';
import path from 'path';
import { NotificationType } from '../types';

interface ParseResult {
    requiredVariables: string[];
    errors: string[];
}

export class TemplateParser {
    private templatesBasePath: string;

    constructor() {
        this.templatesBasePath = path.join(__dirname, './src');
    }
    /**
     * Renders an EJS template with provided data.
     * @param template - The EJS template string.
     * @param data - The data object containing variables to inject.
     * @returns {string} - The rendered string.
     */
    renderTemplate(template: string, data: Record<string, any>): string {
        try {
            return ejs.render(template, data);
        } catch (error: any) {
            throw new Error(`EJS Rendering Error: ${error.message}`);
        }
    }

    /**
     * Parses an EJS template to extract required variables and validate syntax.
     *
     * @param {string} template - The EJS template string to be parsed.
     * @returns {ParseResult} - An object containing:
     *   - requiredVariables: An array of variable names required by the template.
     *   - errors: An array of error messages for any invalid syntax found.
     */
    parseTemplate(template: string): ParseResult {
        const variableRegex = /<%=\s*([\w]+)\s*%>/g;
        const invalidSyntaxRegex = /<%.*?%>/g;

        const requiredVariables: string[] = [];
        const errors: string[] = [];

        let match: RegExpExecArray | null;

        while ((match = variableRegex.exec(template)) !== null) {
            requiredVariables.push(match[1]);
        }

        const invalidMatches = template.match(invalidSyntaxRegex);
        if (invalidMatches) {
            for (const invalidMatch of invalidMatches) {
                if (!invalidMatch.match(variableRegex)) {
                    errors.push(`Invalid syntax: '${invalidMatch}'`);
                }
            }
        }

        if (errors.length > 0) {
            throw new Error(`Template contains invalid syntax: ${errors.join(', ')}`);
        }

        // add extra catch-all compilation error
        try {
            ejs.compile(template);
        } catch (error: any) {
            throw new Error(`EJS Compilation Error: ${error.message}`);
        }

        return {
            requiredVariables: Array.from(new Set(requiredVariables)),
            errors,
        };
    }

    async getTemplateFromEvent(channel: NotificationType, templateName: string) {
        const templatePath = path.join(this.templatesBasePath, channel, templateName);

        const templateContent = await fs.promises.readFile(templatePath, 'utf-8');

        return templateContent;
    }

    validateDataAgainstRequiredVariables(requiredVariables: string[], data: Record<string, any>): void {
        const missingVariables = requiredVariables.filter((variable) => !(variable in data));

        if (missingVariables.length > 0) {
            throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
        }
    }
}
