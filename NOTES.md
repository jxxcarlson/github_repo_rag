# PROBLEM

Running the chunker on even moderate-size files fails.  We've tried code splitting, e.g. the crude

> improve chunk splitting: Instead of splitting by double newlines, use a parser-aware approach (e.g., split only at top-level declarations using regex for ^(\w+)\s*: or ^type\s+ etc.).

but this is also problematic.  Another way forward is to hack the Elm Compiler. I suggested this to Claude:

## Elm Compiler and AST in JSON Format

- The Elm compiler (`elm make --report=json`) only outputs JSON for errors and warnings, not for the AST or successful compilation.
- The JSON output from `elm make` is intended for editor integrations and diagnostics, not for code analysis or chunking.

### What this means
- If you want the actual AST, you would need to either:
  1. Use or build a tool that can extract the AST from the Elm compiler (which would require modifying the Haskell source of the compiler).
  2. Use a third-party parser like `stil4m/elm-syntax` (which is what we've been doing) or another Elm-to-JS/JSON parser.
  3. Use the Elm REPL or other tools to introspect code, but these do not provide the full AST.

### Summary
- The Elm compiler does not provide the AST in JSON format out of the box.
- The `--report=json` flag is for error reporting, not AST output.
- To get the AST, you need a custom tool or a patched compiler.

**Options:**
- Continue improving the chunking/parsing with `stil4m/elm-syntax`.
- Explore patching the Elm compiler to output the AST.
- Try another approach.
