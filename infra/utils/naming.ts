export const functionName = (stage: string, name: string) => `portfoliotracker-${stage}-${name}`;

export const s3bucketName = (stage: string, url: string) => { return stage === 'prod' ? url.replace('dev', '') : url.replace('dev', stage); };