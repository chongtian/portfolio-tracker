import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Config } from './config';
interface PortfolioTrackerStackProps extends cdk.StackProps {
    config: Config;
}
export declare class PortfolioTrackerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: PortfolioTrackerStackProps);
}
export {};
//# sourceMappingURL=portfolio-stack.d.ts.map