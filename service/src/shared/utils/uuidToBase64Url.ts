export const uuidToBase64Url = (uuid: string): string => {
    const hex = uuid.replace(/-/g, '');
    const bytes = Buffer.from(hex, 'hex');
    return bytes.toString('base64url');
}