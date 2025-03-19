interface DefaultInAppTemplateData {
    message: string;
}

export const DefaultInAppTemplate = (data: DefaultInAppTemplateData) => `
    InApp: ${data.message}
`;
