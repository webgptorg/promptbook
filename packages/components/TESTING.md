# @promptbook/components Testing Infrastructure

## 📋 Overview

This document provides a comprehensive overview of the testing infrastructure created for `@promptbook/components`, specifically focused on the `BookEditor` component.

## 🏗️ Architecture

```
packages/components/
├── playground/                    # Testing playground
│   ├── src/
│   │   ├── components/           # Playground UI components
│   │   │   ├── BookEditorShowcase.tsx    # Visual testing interface
│   │   │   └── TestResults.tsx           # Test results display
│   │   ├── test/                # Test files
│   │   │   ├── setup.ts         # Test configuration
│   │   │   ├── BookEditor.test.tsx           # Unit tests
│   │   │   ├── BookEditor.integration.test.tsx # Integration tests
│   │   │   └── BookEditor.perf.test.tsx       # Performance tests
│   │   ├── App.tsx              # Main playground app
│   │   └── main.tsx             # Entry point
│   ├── package.json             # Playground dependencies
│   ├── vite.config.ts           # Vite configuration
│   ├── vitest.config.ts         # Test configuration
│   ├── vitest.performance.config.ts # Performance test config
│   ├── launch.sh                # Unix launcher script
│   ├── launch.bat               # Windows launcher script
│   └── README.md                # Playground documentation
├── esm/                         # Built components
└── README.md                    # Package documentation
```

## 🧪 Testing Strategy

### 1. Visual Testing

-   **Purpose**: Manual testing and component showcase
-   **Tool**: Custom React playground
-   **Features**:
    -   Multiple predefined book examples
    -   Real-time editing and preview
    -   Syntax highlighting verification
    -   Controlled/uncontrolled mode switching

### 2. Unit Testing

-   **Purpose**: Test individual component functionality
-   **Tool**: Vitest + React Testing Library
-   **Coverage**:
    -   Component rendering
    -   Props handling
    -   Event handling
    -   State management
    -   Syntax highlighting
    -   Scroll synchronization

### 3. Integration Testing

-   **Purpose**: Test real-world usage scenarios
-   **Tool**: Vitest + React Testing Library
-   **Coverage**:
    -   Complex book content
    -   Error handling
    -   Performance with large content
    -   Accessibility compliance

### 4. Performance Testing

-   **Purpose**: Ensure optimal performance
-   **Tool**: Vitest + Performance API
-   **Metrics**:
    -   Render time
    -   Update performance
    -   Memory usage
    -   Scroll performance

## 🛠️ Tools & Technologies

| Category             | Tool                        | Purpose                       |
| -------------------- | --------------------------- | ----------------------------- |
| **Build Tool**       | Vite                        | Fast development and building |
| **Test Framework**   | Vitest                      | Unit and integration testing  |
| **Rendering**        | React Testing Library       | Component testing utilities   |
| **User Interaction** | @testing-library/user-event | User interaction simulation   |
| **Coverage**         | V8                          | Code coverage reporting       |
| **Linting**          | ESLint                      | Code quality and consistency  |
| **Type Checking**    | TypeScript                  | Static type checking          |
| **Styling**          | Tailwind CSS                | Utility-first CSS framework   |
| **CI/CD**            | GitHub Actions              | Automated testing pipeline    |

## 🚀 Getting Started

### Prerequisites

-   Node.js 18+
-   npm 8+

### Quick Start

#### Option 1: Using Launcher Scripts

```bash
# Unix/Linux/macOS
cd packages/components/playground
./launch.sh

# Windows
cd packages\components\playground
launch.bat
```

#### Option 2: Manual Commands

```bash
# Navigate to playground
cd packages/components/playground

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

### VS Code Integration

Use the Command Palette (Ctrl+Shift+P) and run:

-   `Tasks: Run Task` → `Components Playground: Start Dev Server`
-   `Tasks: Run Task` → `Components Playground: Run Tests`
-   `Tasks: Run Task` → `Components Playground: Test UI`
-   `Tasks: Run Task` → `Components: Full Test Suite`

## 📊 Test Suites

### Unit Tests (`BookEditor.test.tsx`)

| Test Suite                  | Tests   | Coverage                                        |
| --------------------------- | ------- | ----------------------------------------------- |
| **Basic Rendering**         | 4 tests | Component mounting, props, CSS classes          |
| **Controlled Component**    | 3 tests | Value prop, onChange callback, state management |
| **Uncontrolled Component**  | 2 tests | Internal state, onChange behavior               |
| **Syntax Highlighting**     | 2 tests | Commitment type highlighting, HTML escaping     |
| **Scroll Synchronization**  | 1 test  | Textarea and highlight layer sync               |
| **Line Height Calculation** | 1 test  | Dynamic line height adjustment                  |
| **Accessibility**           | 2 tests | ARIA attributes, screen reader support          |
| **Book Validation**         | 1 test  | Content validation on change                    |

**Total: 16 unit tests**

### Integration Tests (`BookEditor.integration.test.tsx`)

| Test Suite                   | Tests   | Coverage                                          |
| ---------------------------- | ------- | ------------------------------------------------- |
| **Real World Usage**         | 4 tests | Next.js integration, complex content, performance |
| **Error Handling**           | 3 tests | Malformed content, long lines, Unicode            |
| **Accessibility Compliance** | 3 tests | Screen readers, keyboard navigation, contrast     |
| **Performance Tests**        | 3 tests | Update efficiency, scroll performance, memory     |

**Total: 13 integration tests**

### Performance Tests (`BookEditor.perf.test.tsx`)

| Test Suite                 | Tests   | Coverage                               |
| -------------------------- | ------- | -------------------------------------- |
| **Rendering Performance**  | 3 tests | Small, medium, large content rendering |
| **Update Performance**     | 2 tests | Highlight updates, rapid typing        |
| **Scroll Performance**     | 1 test  | Scroll synchronization efficiency      |
| **Memory Performance**     | 2 tests | Memory leaks, event listener cleanup   |
| **Performance Benchmarks** | 1 test  | Complete interaction flow              |

**Total: 9 performance tests**

## 📈 Performance Benchmarks

### Target Performance Metrics

| Metric                 | Target     | Measurement                |
| ---------------------- | ---------- | -------------------------- |
| **Small Book Render**  | < 50ms     | Initial component render   |
| **Medium Book Render** | < 200ms    | 100 sections render        |
| **Large Book Render**  | < 1000ms   | 500 sections render        |
| **Highlight Update**   | < 100ms    | Syntax highlighting update |
| **Rapid Typing**       | < 5ms/char | Character input response   |
| **Scroll Sync**        | < 20ms     | 10 scroll events handling  |
| **Memory Increase**    | < 1MB      | 10 mount/unmount cycles    |

### Performance Monitoring

Performance tests run automatically and log results:

```
📊 small-book-render: 23.45ms
📊 medium-book-render: 156.78ms
📊 highlight-update: 45.23ms
📊 scroll-sync: 12.34ms
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow (`components-testing.yml`)

The automated testing pipeline includes:

1. **Test Components** (Node.js 18.x, 20.x)

    - Install dependencies
    - Build components package
    - Run linting and type checks
    - Execute unit tests
    - Generate coverage reports
    - Build playground

2. **Visual Regression** (on PRs)

    - Placeholder for Playwright tests
    - Visual regression testing

3. **Performance Benchmarks**

    - Performance test execution
    - Benchmark result collection

4. **Deploy Playground** (on main branch)
    - Deploy to GitHub Pages
    - Available at: `https://[owner].github.io/[repo]/components-playground/`

### Coverage Reporting

-   **Codecov Integration**: Automatic coverage uploads
-   **Coverage Thresholds**: Enforced minimum coverage levels
-   **Coverage Reports**: HTML, JSON, and LCOV formats

## 🎯 Usage Examples

### Visual Testing

The playground provides interactive examples:

```tsx
// Simple Example
const simple = `# ✨ Simple Example
- INPUT PARAMETER {topic}
- OUTPUT PARAMETER {content}
## Write Content
- PERSONA Expert writer
> Write about {topic}
→ {content}`;

// Advanced Example
const advanced = `# 🚀 Advanced Marketing Campaign
- PERSONA Senior marketing strategist
- KNOWLEDGE ./marketing-best-practices.pdf
- RULE Include target metrics
- EXPECT MIN 5 paragraphs
> Create campaign for {product}
→ {campaign}`;
```

### Unit Testing

```tsx
import { render, screen } from '@testing-library/react';
import { BookEditor } from '@promptbook/components';

test('renders with default content', () => {
    render(<BookEditor />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
});
```

### Performance Testing

```tsx
it('renders large content efficiently', () => {
    const largeBook = Array(500).fill('# Section\nContent').join('\n');

    const start = performance.now();
    render(<BookEditor value={largeBook} />);
    const renderTime = performance.now() - start;

    expect(renderTime).toBeLessThan(1000);
});
```

## 🔧 Configuration

### Environment Variables

```bash
# Development
NODE_ENV=development
VITE_DEV_PORT=3001

# Testing
VITEST_UI_PORT=51204
COVERAGE_REPORTER=html,json,text

# CI/CD
CI=true
CODECOV_TOKEN=your_token_here
```

### Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            threshold: {
                global: {
                    branches: 85,
                    functions: 95,
                    lines: 90,
                    statements: 90,
                },
            },
        },
    },
});
```

## 🚨 Troubleshooting

### Common Issues

1. **Module Resolution Errors**

    ```bash
    cd packages/components && npm run build
    ```

2. **Test Cache Issues**

    ```bash
    npx vitest --clear-cache
    ```

3. **Port Conflicts**

    ```bash
    # Change ports in vite.config.ts
    server: { port: 3002 }
    ```

4. **Memory Issues**
    ```bash
    export NODE_OPTIONS="--max-old-space-size=4096"
    ```

### Debug Mode

```bash
# Debug tests
npm run test -- --reporter=verbose

# Debug specific test file
npx vitest src/test/BookEditor.test.tsx --reporter=verbose

# Debug with UI
npm run test:ui
```

## 📝 Contributing

### Adding New Tests

1. **Create test file**: `ComponentName.test.tsx`
2. **Follow naming convention**: Descriptive test names
3. **Include documentation**: JSDoc comments for complex tests
4. **Add visual examples**: Update showcase if needed
5. **Update benchmarks**: Add performance tests for new features

### Test Guidelines

-   **AAA Pattern**: Arrange, Act, Assert
-   **Descriptive Names**: `it('should highlight PERSONA keywords in syntax highlighting')`
-   **Mock Appropriately**: Mock external dependencies only
-   **Test Edge Cases**: Include error conditions and boundary values
-   **Accessibility First**: Always include accessibility tests
-   **Performance Aware**: Add performance tests for critical paths

## 📚 Resources

### Documentation

-   [Vitest Documentation](https://vitest.dev/)
-   [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
-   [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

### Tools

-   [Vite](https://vitejs.dev/)
-   [Tailwind CSS](https://tailwindcss.com/)
-   [TypeScript](https://www.typescriptlang.org/)

### Related Projects

-   [Promptbook Core](../../../README.md)
-   [Book Language](https://github.com/webgptorg/book)
-   [Promptbook Studio](https://promptbook.studio)

---

**Last Updated**: August 12, 2025
**Version**: 1.0.0
**Maintainer**: @promptbook/components team
