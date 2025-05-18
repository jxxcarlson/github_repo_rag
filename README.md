# 🚀 GitHub Repository RAG MCP Server

A powerful Model Context Protocol (MCP) server that enables natural language interaction with GitHub repositories using Retrieval-Augmented Generation (RAG). This tool makes codebases conversational by leveraging AST parsing, semantic embeddings, and natural language interfaces.

## re Elm 

This is a fork of the original, a first attempt (written by  Cursor and Claude) to add AST parsing for Elm.  I have not had a chance to run it, much less look
at the added code, but maybe some of you can do that before I do.  Let's have at it!

Please see discussion/ast_comments.txt for some comments on the format of the chunks
created by parsing source code and to whom they are "fed." 

To test the integration (so far) of Elm support, tun `npx ts-node github_repo_rag/src/chunkers/elmChunker.ts <path-to-elm-file>` from the root of this repo. 
e.g. `npx ts-node src/chunkers/elmChunker.ts src/elm/test.elm`

## ✨ Features

- **Multi-language Support**: Process TypeScript, JavaScript, Python, and Elm codebases
- **Flexible Embeddings**: Choose between OpenAI, Hugging Face, or Xenova embeddings
- **Seamless Integration**: Works with Claude Desktop, Cursor, VS Code, and other MCP clients
- **Smart Chunking**: AST-powered semantic code chunking for better context
- **Fast Search**: Local FAISS index for quick semantic search
- **Natural Q&A**: Ask questions about your codebase in plain English

## 📋 Prerequisites

- Node.js (v14 or higher)
- Python 3.x (for Python code support)
- Elm 0.19.1 or higher (for Elm code support)
- elm-ast-parser package (for Elm AST parsing)
- Git (for repository cloning)
- Optional: API keys for OpenAI or Hugging Face (required for their respective embeddings)

## 🔐 Environment Setup

1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your API keys:
   ```bash
   # OpenAI API Key (required for OpenAI embeddings)
   OPENAI_API_KEY=your_openai_api_key_here

   # Hugging Face API Key (required for Hugging Face embeddings)
   HUGGINGFACE_API_KEY=your_huggingface_api_key_here

   # Optional: Custom port for the server (default: 3000)
   PORT=3000

   # Optional: Custom host for the server (default: localhost)
   HOST=localhost
   ```

   > ⚠️ **Important**: Never commit your `.env` file to version control. It's already in `.gitignore` to prevent accidental commits.

## 🛠️ Installation

1. Install Claude Desktop:
   ```bash
   # Follow instructions at https://github.com/jxnl/cluade-desktop
   ```

2. Install Elm and elm-ast-parser:
   ```bash
   # Install Elm
   npm install -g elm

   # Install elm-ast-parser
   npm install -g elm-ast-parser
   ```

3. Configure the MCP server:
   ```bash
   # Open VS Code with the config file
   code ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

4. Add the MCP server configuration:
   ```json
   {
     "mcpServers": {
       "github_repo_rag_server": {
         "command": "npx",
         "args": ["-y", "github_repo_rag"],
         "env": {
           "ANTRHOPIC_API_KEY": "your_openai_key",
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
| Push protection errors | Ensure no API keys are committed to the repository |

### Debugging

- Check console logs for detailed error messages and stack traces
- Verify all required dependencies are installed
- Ensure proper permissions for repository cloning and file access
- Verify environment variables are properly set

## 📚 Additional Features

- Automatic README summarization (when available)
- Support for private repositories (with proper authentication)
- Customizable chunking strategies
- Configurable embedding models

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Security Best Practices

- Never commit API keys or sensitive information
- Use environment variables for all sensitive data
- Keep your `.env` file in `.gitignore`
- Use `.env.example` as a template for required environment variables

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


