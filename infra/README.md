## Install cdk
```bash
npm install -g aws-cdk
```

## bootstrap
Before use cdk, run **one-time** cdk bootstrap for each combination of AWS Account ID and AWS Region

```bash
npx cdk bootstrap
```

cdk can resolve account id automatically.

## build
```bash
npm run cdk-build
```

## deploy
```bash
npm run cdk-deploy:dev
```