interface DefaultSMSTemplateData {
    message: string;
}

export const DefaultSMSTemplate = (data: DefaultSMSTemplateData) => `
    SMS: ${data.message}
`;
