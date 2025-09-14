The browser package provides browser-specific functionality for Promptbook, including localStorage integration, IndexedDB storage, and browser-compatible scrapers. It enables Promptbook to run efficiently in web browser environments.

## 🎯 Purpose and Motivation

This package extends Promptbook's core functionality with browser-specific features that are essential for web applications. It provides browser storage APIs, user interface tools, and browser-compatible scrapers that enable full-featured Promptbook applications in web environments.

## 🔧 High-Level Functionality

The package provides browser-specific integrations and utilities:
- **Browser Storage**: Integration with localStorage, sessionStorage, and IndexedDB
- **User Interface Tools**: Simple prompt interface for browser interactions
- **Browser Scrapers**: Browser-compatible content scrapers
- **Web Compatibility**: Ensures Promptbook works seamlessly in browser environments
- **Client-side Caching**: Efficient caching using browser storage APIs

## ✨ Key Features

- 💾 **Multiple Storage Options** - Support for localStorage, sessionStorage, and IndexedDB
- 🌐 **Browser-native APIs** - Leverage browser-specific capabilities and storage
- 🎨 **Simple UI Tools** - Basic interface tools for browser-based interactions
- 📱 **Cross-browser Compatibility** - Works across modern web browsers
- 🔒 **Client-side Security** - Secure storage and execution in browser sandbox
- ⚡ **Performance Optimized** - Efficient storage and caching for web applications
- 🛠️ **Web Scrapers** - Browser-compatible content scraping capabilities

## 📦 Exported Entities

### Version Information
- `BOOK_LANGUAGE_VERSION` - Current book language version
- `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### User Interface Tools
- `SimplePromptInterfaceTools` - Simple prompt interface for browser interactions

### Browser Scrapers
- `$provideScrapersForBrowser` - Provide browser-compatible knowledge scrapers

### Storage APIs
- `getIndexedDbStorage` - Get IndexedDB storage implementation
- `getLocalStorage` - Get localStorage storage implementation
- `getSessionStorage` - Get sessionStorage storage implementation

> 💡 This package does not make sense on its own, look at [all promptbook packages](#-packages) or just install all by `npm i ptbk`
