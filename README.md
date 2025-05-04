# GitHub Repository RAG MCP Server

This MCP (Model Context Protocol) server allows you to process GitHub repositories and ask questions about their codebase using RAG (Retrieval Augmented Generation).

## Installation

1. Install the Claude Desktop:
 - Claude Desktop
  > ['Claude Desktop'](https://claude.ai/download) installed

## Configuration

1. Open VS Code to edit the Claude configuration:
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. Add the following configuration to your `claude_desktop_config.json`:
```json

{
  "mcpServers": {
  "github_repo_rag_server": {
    "command": "npx",
    "args": ["-y", "github_repo_rag"]
        }
    }
}

```

## Usage

### Processing a Repository

To process a GitHub repository, send the following message:
```
process repository https://github.com/yuvraj1898/AI-Github-Agent.git
```

This will:
1. Clone the repository
2. Extract code chunks (functions and classes)
3. Create embeddings for the code
4. Build a searchable index

### Asking Questions

To ask questions about a processed repository, use the format:
```
question <your question> and next repo https://github.com/yuvraj1898/AI-Github-Agent.git

ex:tell me about summarize youtube transcript function repo AI summarizer
```

For example:
```
question How does the agent handle GitHub API authentication?  repo https://github.com/yuvraj1898/AI-Github-Agent.git
```

The server will:
1. Search the repository's index for relevant code
2. Return the most relevant code snippets that answer your question

## Features

- Processes TypeScript/JavaScript and Python files
- Extracts functions, classes, and their relationships
- Creates semantic embeddings for code search
- Supports natural language questions about code
- Maintains a local index of processed repositories

## Requirements

- Node.js (v14 or higher)
- Python 3.x (for Python file processing)
- Git (for repository cloning)

## Troubleshooting

If you encounter any issues:
1. Ensure the repository URL is correct and accessible
2. Check that you have sufficient disk space for repository storage
3. Verify that all required dependencies are installed
4. Check the server logs for detailed error messages 