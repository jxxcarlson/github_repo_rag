import json
import sys
from typing import List, Dict
import subprocess
import tempfile
import os

def debug(*args):
    print(*args, file=sys.stderr)

def parse_elm_file(file_path: str) -> List[Dict]:
    debug(f"Reading Elm file: {file_path}")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source_code = f.read()
            debug(f"File contents length: {len(source_code)} characters")
            
            # Create a temporary file for the Elm code
            with tempfile.NamedTemporaryFile(mode='w', suffix='.elm', delete=False) as temp:
                temp.write(source_code)
                temp_path = temp.name

            # Use elm-ast-parser to parse the file
            try:
                result = subprocess.run(
                    ['elm-ast-parser', temp_path],
                    capture_output=True,
                    text=True,
                    check=True
                )
                
                # Parse the JSON output from elm-ast-parser
                ast_data = json.loads(result.stdout)
                chunks = []
                
                # Process the AST to extract functions and types
                for node in ast_data:
                    if node['type'] == 'FunctionDeclaration':
                        chunks.append({
                            'type': 'function',
                            'name': node['name'],
                            'code': source_code[node['start']['line']-1:node['end']['line']],
                            'startLine': node['start']['line'],
                            'endLine': node['end']['line'],
                            'calls': extract_calls(node),
                            'imports': extract_imports(ast_data)
                        })
                    elif node['type'] == 'TypeDeclaration':
                        chunks.append({
                            'type': 'class',
                            'name': node['name'],
                            'code': source_code[node['start']['line']-1:node['end']['line']],
                            'startLine': node['start']['line'],
                            'endLine': node['end']['line'],
                            'calls': [],
                            'imports': extract_imports(ast_data)
                        })
                
                debug(f"Found {len(chunks)} chunks in {file_path}")
                return chunks
                
            finally:
                # Clean up the temporary file
                os.unlink(temp_path)
                
    except Exception as e:
        debug(f"Error parsing Elm file {file_path}: {str(e)}")
        raise

def extract_calls(node: Dict) -> List[str]:
    calls = []
    
    def traverse(node):
        if isinstance(node, dict):
            if node.get('type') == 'FunctionCall':
                if isinstance(node.get('function'), dict):
                    calls.append(node['function'].get('name', ''))
            for value in node.values():
                traverse(value)
        elif isinstance(node, list):
            for item in node:
                traverse(item)
    
    traverse(node)
    return calls

def extract_imports(ast_data: List[Dict]) -> List[str]:
    imports = []
    for node in ast_data:
        if node['type'] == 'ImportDeclaration':
            module_name = node.get('module', {}).get('name', '')
            if module_name:
                imports.append(module_name)
    return imports

if __name__ == "__main__":
    try:
        file_path = sys.argv[1]
        debug(f"Processing file: {file_path}")
        chunks = parse_elm_file(file_path)
        for chunk in chunks:
            chunk["filePath"] = file_path
            chunk["language"] = "elm"
        print(json.dumps(chunks))
    except Exception as e:
        debug(f"Error: {str(e)}")
        sys.exit(1) 