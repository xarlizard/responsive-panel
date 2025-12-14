# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-12-14

### Changed

- **Dependency updates** - Updated all npm dependencies to latest versions.

- **TypeScript configuration** - Modernized TypeScript compiler options:
  - Target updated to ES2022 for better modern JavaScript support
  - Module resolution changed to "bundler" for better compatibility
  - Added stricter type checking: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
  - Added `declarationMap` for better IDE support and debugging

- **Build configuration** - Enhanced Rollup configuration:
  - Added declaration maps for better source mapping
  - Improved source map generation

### Improved

- **Code optimizations** with modern JavaScript/TypeScript features:
  - Implemented optional chaining (`?.`) and nullish coalescing (`??`) throughout codebase
  - Added `AbortController` for better event listener cleanup
  - Enhanced `throttle` function with improved timeout-based scheduling
  - Enhanced `debounce` function with cancel method support
  - Replaced deprecated `substr` with `slice` method
  - Optimized position calculation with object lookup instead of switch statement
  - Improved DOM element removal using modern `.remove()` method
  - Added `once: true` option for event listeners where appropriate
  - Improved type safety in utility functions

- **Code quality**:
  - Removed unused variables and properties
  - Fixed code formatting issues
  - Improved type safety throughout the codebase
  - Better error handling and edge case coverage

### Fixed

- Fixed missing space before constructor in `panel.ts`
- Fixed potential null reference issues with optional chaining
- Improved type definitions for better type inference

## [1.0.0] - 2025-07-13

### Added

- **Fullscreen viewport mode** - Click viewport headers for detailed breakpoint testing
- **Back navigation** - "Back to Dashboard" button for easy navigation between views
- **Smart trigger hiding** - Prevents recursive panels in iframe views using URL parameters
- **Independent dragging** - Separate drag logic for floating button and panel header
- **Live sync functionality** - Synchronized scrolling and form inputs across viewports
- **Theme support** - Light, dark, and auto themes with system preference detection
- **Multi-viewport preview** - Preview multiple breakpoints simultaneously
- **Custom configuration** - Configurable breakpoints, labels, positioning, and z-index
- **Production safety** - Automatically disabled in production environments
- **Framework agnostic** - Works with React, Vue, Angular, vanilla JS
- **TypeScript support** - Full type definitions and IntelliSense support

### Features

- **Floating draggable button** for panel toggle with customizable positioning
- **Multiple viewport preview** showing your site across different breakpoints
- **Fullscreen mode** for detailed testing of individual breakpoints
- **Smart URL parameter detection** (`?rp-hide-trigger=true`) to prevent recursive panels
- **Event system** with support for open, close, fullscreen, and drag events
- **Responsive panel interface** that works on all screen sizes
- **Auto-injection** with script tag configuration support
- **Custom breakpoint support** with flexible width and label configuration

### Developer Experience

- **Clean API** with both class-based and injection methods
- **Comprehensive documentation** with examples and API reference
- **Event handling** for custom integrations and workflows
- **Error boundaries** and safe fallbacks for cross-origin scenarios
- **Development-friendly** with detailed console logging and debugging support
- **Production optimization** with automatic detection and disabling
