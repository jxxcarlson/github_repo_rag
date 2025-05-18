mprove chunk splitting: Instead of splitting by double newlines, use a parser-aware approach (e.g., split only at top-level declarations using regex for ^(\w+)\s*: or ^type\s+ etc.).
