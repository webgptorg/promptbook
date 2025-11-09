# Book Components

This application hosts the book components for the Promptbook project.

## Vercel Serverless Function Size

The Vercel serverless function size was exceeding the 250 MB limit due to the `output: 'standalone'` option in `next.config.ts`. This option is not recommended for Vercel deployments, as it bundles all dependencies into the serverless function, leading to a large bundle size.

The solution was to remove the `output: 'standalone'` option from `next.config.ts`. This allows Vercel to handle the dependencies more efficiently, resulting in a smaller serverless function.
