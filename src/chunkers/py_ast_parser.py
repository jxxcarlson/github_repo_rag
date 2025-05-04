import ast
import json
import sys
from typing import List, Dict


def debug(*args):
    print(*args, file=sys.stderr)


class CodeChunkVisitor(ast.NodeVisitor):
    def __init__(self, source_code: str):
        self.source_code = source_code
        self.chunks = []

    def extract_code(self, node: ast.AST) -> str:
        lines = self.source_code.splitlines()
        start_line = node.lineno - 1
        end_line = node.end_lineno
        debug(f"Extracting code from lines {start_line + 1} to {end_line}")
        return "\n".join(lines[start_line:end_line])

    def get_calls(self, node: ast.AST) -> List[str]:
        calls = []

        class CallVisitor(ast.NodeVisitor):
            def visit_Call(self, call_node):
                if isinstance(call_node.func, ast.Name):
                    calls.append(call_node.func.id)
                    debug(f"Found function call: {call_node.func.id}")
                elif isinstance(call_node.func, ast.Attribute):
                    calls.append(call_node.func.attr)
                    debug(f"Found method call: {call_node.func.attr}")

        CallVisitor().visit(node)
        return calls

    def visit_FunctionDef(self, node: ast.FunctionDef):
        debug(f"Found function definition: {node.name}")
        self.chunks.append({
            "type": "function",
            "name": node.name,
            "code": self.extract_code(node),
            "calls": self.get_calls(node),
        })

    def visit_ClassDef(self, node: ast.ClassDef):
        debug(f"Found class definition: {node.name}")
        self.chunks.append({
            "type": "class",
            "name": node.name,
            "code": self.extract_code(node),
            "calls": self.get_calls(node),
        })


def parse_python_file(file_path: str) -> List[Dict]:
    debug(f"Reading Python file: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source_code = f.read()
            debug(f"File contents length: {len(source_code)} characters")
            
            debug("Parsing Python AST...")
            tree = ast.parse(source_code)
            debug("AST parsed successfully")
            
            visitor = CodeChunkVisitor(source_code)
            visitor.visit(tree)
            chunks = visitor.chunks
            debug(f"Found {len(chunks)} chunks in {file_path}")
            return chunks
    except Exception as e:
        debug(f"Error parsing Python file {file_path}: {str(e)}")
        raise


if __name__ == "__main__":
    try:
        file_path = sys.argv[1]
        debug(f"Processing file: {file_path}")
        chunks = parse_python_file(file_path)
        for chunk in chunks:
            chunk["filePath"] = file_path
            chunk["language"] = "python"
            chunk["imports"] = []  # You can extract imports if needed
        print(json.dumps(chunks))
    except Exception as e:
        debug(f"Error: {str(e)}")
        sys.exit(1)
