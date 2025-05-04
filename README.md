# 🚀 GitHub Repository RAG MCP Server

A powerful Model Context Protocol (MCP) server that enables natural language interaction with GitHub repositories using Retrieval-Augmented Generation (RAG). This tool makes codebases conversational by leveraging AST parsing, semantic embeddings, and natural language interfaces.

## ✨ Features

- **Multi-language Support**: Process TypeScript, JavaScript, and Python codebases
- **Flexible Embeddings**: Choose between OpenAI, Hugging Face, or Xenova embeddings
- **Seamless Integration**: Works with Claude Desktop, Cursor, VS Code, and other MCP clients
- **Smart Chunking**: AST-powered semantic code chunking for better context
- **Fast Search**: Local FAISS index for quick semantic search
- **Natural Q&A**: Ask questions about your codebase in plain English

## 📋 Prerequisites

- Node.js (v14 or higher)
- Python 3.x (for Python code support)
- Git (for repository cloning)
- Optional: API keys for OpenAI or Hugging Face (required for their respective embeddings)

## 🛠️ Installation

1. Install Claude Desktop:
   ```bash
   # Follow instructions at https://github.com/jxnl/cluade-desktop
   ```

2. Configure the MCP server:
   ```bash
   # Open VS Code with the config file
   code ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. Add the MCP server configuration:
   ```json
   {
     "mcpServers": {
       "github_repo_rag_server": {
         "command": "npx",
         "args": ["-y", "github_repo_rag"],
         "env": {
           "OPENAI_API_KEY": "your_openai_key",
           "HUGGINGFACE_API_KEY": "your_huggingface_key"
         }
       }
     }
   }
   ```

## 🚀 Usage

### Processing a Repository

Use the following command in Claude Desktop or any compatible MCP client:

```bash
process repository https://github.com/owner/repo.git use openai embeddings
```

#### Embedding Options:
- `use openai embeddings` - Use OpenAI's embedding models
- `use huggingface` - Use Hugging Face's embedding models
- Default: Xenova Transformers (no API key required)

The process will:
1. Clone the repository
2. Parse files to extract functions and classes
3. Create embeddings using your chosen model
4. Build a local searchable FAISS index

### Asking Questions

Query your codebase using natural language:

```bash
How does the agent handle GitHub API authentication? repo https://github.com/owner/repo.git
```

The server will:
1. Search the vector index for semantically relevant code
2. Return context-rich answers with relevant functions and logic

## 🐛 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Invalid repo URL | Ensure the repository is public and the URL is correct |
| Disk space issues | Check available space for cloning and indexing |
| Missing dependencies | Verify Node.js, Python, and Git installations |
| API key errors | Confirm correct API keys are set in environment variables |

### Debugging

- Check console logs for detailed error messages and stack traces
- Verify all required dependencies are installed
- Ensure proper permissions for repository cloning and file access

## 📚 Additional Features

- Automatic README summarization (when available)
- Support for private repositories (with proper authentication)
- Customizable chunking strategies
- Configurable embedding models

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


