# @promptbook/components Playground

A comprehensive testing playground for `@promptbook/components` providing visual testing, unit testing, and component showcase capabilities.

## 🎯 Purpose

This playground serves multiple purposes:

1. **Visual Testing** - Interactive component showcase for manual testing
2. **Unit Testing** - Comprehensive test suite using Vitest and React Testing Library
3. **Integration Testing** - Real-world usage scenarios and edge cases
4. **Development Environment** - Live development and testing environment

## 🚀 Quick Start

### Prerequisites

Make sure you're in the components playground directory:

```bash
cd packages/components/playground
```

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

This will start the Vite development server at `http://localhost:3001` with:

-   🎨 **Visual Tests** tab - Interactive component showcase
-   🧪 **Unit Tests** tab - Test results and coverage

## 🧪 Testing

### Run All Tests

```bash
npm run test
```

### Test UI (Interactive)

```bash
npm run test:ui
```

Opens Vitest UI at `http://localhost:51204` for interactive testing.

### Test Coverage

```bash
npm run test:coverage
```

Generates coverage reports in multiple formats.

### Watch Mode

```bash
npm run test -- --watch
```

## 📁 Project Structure

```
playground/
├── src/
│   ├── components/           # Playground UI components
│   │   ├── BookEditorShowcase.tsx  # Visual testing component
│   │   └── TestResults.tsx         # Test results display
│   ├── test/                # Test files
│   │   ├── setup.ts         # Test setup and configuration
│   │   ├── BookEditor.test.tsx           # Unit tests
│   │   └── BookEditor.integration.test.tsx  # Integration tests
│   ├── App.tsx              # Main playground app
│   ├── main.tsx             # App entry point
│   └── index.css            # Global styles
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Vitest configuration
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## 🧩 Components Tested

### BookEditor

The `BookEditor` component is comprehensively tested across multiple dimensions:

#### Unit Tests (`BookEditor.test.tsx`)

-   ✅ Basic rendering and props
-   ✅ Controlled vs uncontrolled component behavior
-   ✅ Syntax highlighting functionality
-   ✅ Scroll synchronization
-   ✅ Line height calculation
-   ✅ Accessibility features
-   ✅ Book validation

#### Integration Tests (`BookEditor.integration.test.tsx`)

-   ✅ Real-world usage scenarios
-   ✅ Complex book content handling
-   ✅ Performance with large content
-   ✅ Error handling and edge cases
-   ✅ Accessibility compliance
-   ✅ Performance benchmarks

## 🎨 Visual Testing Features

The visual testing interface provides:

### Component Showcase

-   **Live Examples** - Multiple predefined book examples
-   **Interactive Controls** - Switch between controlled/uncontrolled modes
-   **Real-time Editing** - See changes as you type
-   **Syntax Highlighting** - Visual verification of commitment type highlighting

### Test Examples

1. **Simple Example** - Basic book structure
2. **Advanced Example** - Complex marketing campaign with multiple commitment types
3. **Knowledge-based Example** - Book with external knowledge sources

### Controls

-   **Example Selection** - Quick switching between predefined examples
-   **Control Mode** - Toggle between controlled and uncontrolled component behavior
-   **Font Customization** - Test with different font configurations
-   **Class Customization** - Apply custom CSS classes

## 🔧 Configuration

### Vite Configuration (`vite.config.ts`)

```typescript
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@promptbook/components': path.resolve(__dirname, '../esm'),
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3001,
        open: true,
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'src/test/', '**/*.test.{ts,tsx}'],
        },
    },
});
```

### Test Configuration

-   **Testing Framework**: Vitest
-   **Rendering Library**: React Testing Library
-   **User Interactions**: @testing-library/user-event
-   **Coverage Provider**: V8
-   **Environment**: jsdom

## 📊 Test Coverage

The test suite aims for comprehensive coverage across:

-   **Line Coverage**: >90%
-   **Function Coverage**: >95%
-   **Branch Coverage**: >85%
-   **Statement Coverage**: >90%

### Coverage Reports

After running `npm run test:coverage`, coverage reports are available in:

-   **Terminal**: Text summary
-   **HTML**: `coverage/lcov-report/index.html`
-   **JSON**: `coverage/coverage-final.json`
-   **LCOV**: `coverage/lcov.info`

## 🚨 Performance Testing

The playground includes performance benchmarks for:

1. **Rendering Performance** - Initial render time
2. **Update Performance** - Re-render time on changes
3. **Scroll Performance** - Scroll synchronization efficiency
4. **Memory Usage** - Memory leak detection
5. **Large Content Handling** - Performance with extensive content

## 🛠️ VS Code Integration

### Tasks (Ctrl+Shift+P → "Tasks: Run Task")

-   `Components Playground: Start Dev Server` - Start development server
-   `Components Playground: Run Tests` - Execute test suite
-   `Components Playground: Test UI` - Open interactive test UI
-   `Components Playground: Test Coverage` - Generate coverage reports
-   `Components Playground: Build` - Build for production
-   `Components: Full Test Suite` - Complete testing pipeline

### Debugging

1. Set breakpoints in test files
2. Run "Debug: Start Debugging" (F5)
3. Select "Node.js" when prompted
4. Choose the test file to debug

## 📈 Continuous Integration

The playground integrates with CI/CD pipelines through:

```bash
# CI Test Command
npm run test -- --reporter=json --outputFile=test-results.json

# CI Coverage Command
npm run test:coverage -- --reporter=json
```

## 🔍 Troubleshooting

### Common Issues

1. **Module Resolution Errors**

    ```bash
    # Rebuild components package
    cd ../
    npm run build
    cd playground/
    ```

2. **Test Failures**

    ```bash
    # Clear test cache
    npx vitest --clear-cache
    ```

3. **TypeScript Errors**
    ```bash
    # Regenerate types
    npm run build
    ```

### Performance Issues

1. **Slow Tests**

    ```bash
    # Run specific test file
    npx vitest src/test/BookEditor.test.tsx
    ```

2. **Memory Issues**
    ```bash
    # Increase Node.js memory
    export NODE_OPTIONS="--max-old-space-size=4096"
    ```

## 🤝 Contributing

### Adding New Tests

1. Create test files in `src/test/`
2. Follow naming convention: `ComponentName.test.tsx`
3. Include both unit and integration tests
4. Add visual test examples to showcase components

### Test Guidelines

-   **Arrange-Act-Assert** pattern
-   **Descriptive test names** that explain the scenario
-   **Mock external dependencies** appropriately
-   **Test both happy path and edge cases**
-   **Include accessibility tests**
-   **Add performance benchmarks** for critical functionality

### Visual Test Guidelines

-   **Real-world examples** that demonstrate actual usage
-   **Interactive controls** for testing different configurations
-   **Clear documentation** of what each example demonstrates
-   **Responsive design** testing across different screen sizes

## 📚 Resources

-   [Vitest Documentation](https://vitest.dev/)
-   [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
-   [Vite Documentation](https://vitejs.dev/)
-   [Promptbook Components Documentation](../README.md)

## 📄 License

This playground follows the same license as the main `@promptbook/components` package.
