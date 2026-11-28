
Remote server implementation for Promptbook, enabling distributed execution of promptbook pipelines across network boundaries with REST API and WebSocket support.

## 🎯 Purpose and Motivation

This package provides a remote server that allows promptbook pipelines to be executed over the network. It enables distributed architectures where promptbook execution can be centralized on powerful servers while clients can access the functionality remotely, making it ideal for scaling promptbook applications and providing API access to promptbook collections.

## 🔧 High-Level Functionality

The package provides remote server capabilities:
- **HTTP REST API**: RESTful endpoints for pipeline execution and management
- **WebSocket Support**: Real-time communication for streaming execution results
- **Authentication**: Support for both anonymous and application-based authentication
- **Pipeline Management**: Remote access to promptbook collections and pipelines
- **Execution Orchestration**: Distributed execution of promptbook pipelines
- **OpenAI Compatibility**: OpenAI-compatible API endpoints for seamless integration

## ✨ Key Features

- 🌐 **Remote Execution** - Execute promptbook pipelines over HTTP/WebSocket
- 🔐 **Authentication Modes** - Support for anonymous and application-based access
- 📡 **Real-time Communication** - WebSocket support for streaming results
- 🔌 **OpenAI Compatible** - Use promptbooks as OpenAI-compatible models
- 🚀 **Scalable Architecture** - Distribute promptbook execution across servers
- 📊 **Pipeline Management** - Remote access to collections and individual pipelines
- 🛡️ **Security** - Configurable authentication and access control
- ⚡ **High Performance** - Optimized for concurrent pipeline execution

## 📦 Exported Entities

### Version Information
- `BOOK_LANGUAGE_VERSION` - Current book language version
- `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Server Management
- `startRemoteServer` - Start the remote promptbook server

### Configuration Types
- `RemoteServerOptions` - Configuration options for remote server (type)

### Authentication Types
- `Identification` - Base identification interface (type)
- `ApplicationModeIdentification` - Application mode identification (type)
- `AnonymousModeIdentification` - Anonymous mode identification (type)

> 💡 This package provides remote server functionality for promptbook applications. For the core functionality, see [@promptbook/core](#-packages) or install all packages with `npm i ptbk`
