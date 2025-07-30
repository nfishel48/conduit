# Conduit 🌉

**Unchain your GraphQL API for Large Language Models.**

Conduit is a lightweight, automated bridge that exposes any GraphQL API as a set of tools consumable by Large Language Models (LLMs) via the Model Context Protocol (MCP).

It's a "set-it-and-forget-it" microservice. Simply point it at your GraphQL endpoint, and it handles the rest. Whenever you update your API, Conduit automatically discovers the new queries and mutations and exposes them to your AI agents with zero maintenance required.

### ✨ Features

* **Zero-Maintenance:** Automatically discovers your API's capabilities using introspection. No manual tool definition is needed.
* **Protocol Compliant:** Implements the core MCP endpoints (`/listTools`, `/getToolSchema`, `/executeTool`) out of the box.
* **Dynamic Execution:** Translates LLM tool calls into valid GraphQL queries/mutations and executes them against your API.
* **Container-Ready:** Comes with a `Dockerfile` and Kubernetes manifests for easy deployment alongside your existing services.
* **Lightweight & Fast:** Built with Express.js for a minimal footprint and reliable performance.

### 🏗️ Architecture

The Conduit bridge is a stateless microservice that sits between your LLM client and your GraphQL API.
