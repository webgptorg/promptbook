# Book Components

This application hosts the book components for the Promptbook project.

## Vercel Serverless Function Size

The Vercel serverless function size was exceeding the 250 MB limit because the `.next` directory, which contains the build output, was being included in the serverless function bundle.

The solution is to create a `.vercelignore` file in the `apps/book-components` directory with the following content:

```
.next
```

This file instructs Vercel to exclude the `.next` directory from the build, which significantly reduces the size of the serverless function and resolves the issue.
