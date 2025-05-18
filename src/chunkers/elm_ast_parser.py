import json
import sys
from typing import List, Dict, Optional
import subprocess
import tempfile
import os

class ElmParserError(Exception):
    """Base exception for Elm parser errors"""
    pass

class FileReadError(ElmParserError):
    """Raised when there's an error reading the Elm file"""
    pass

class ASTParseError(ElmParserError):
    """Raised when there's an error parsing the AST"""
    pass

class SubprocessError(ElmParserError):
    """Raised when there's an error running the elm-ast-parser subprocess"""
    pass

def debug(*args):
    print(*args, file=sys.stderr)

class ElmCodeChunkVisitor:
    def __init__(self, source_code: str):
        self.source_code = source_code
        self.chunks = []
        self.imports = []
        self.current_module = None

    def visit_file(self, file_node: Dict):
        """Visit the root File node"""
        if not isinstance(file_node, dict):
            raise ASTParseError("File node must be a dictionary")
            
        self.current_module = file_node.get('module', {}).get('name', '')
        declarations = file_node.get('declarations', [])
        
        if not isinstance(declarations, list):
            raise ASTParseError("Declarations must be a list")
            
        for declaration in declarations:
            try:
                self.visit_declaration(declaration)
            except Exception as e:
                debug(f"Error visiting declaration: {str(e)}")
                continue

    def visit_declaration(self, declaration_node: Dict):
        """Visit a Declaration node"""
        if not isinstance(declaration_node, dict):
            raise ASTParseError("Declaration node must be a dictionary")
            
        decl_type = declaration_node.get('type')
        if not decl_type:
            raise ASTParseError("Declaration node missing 'type' field")
            
        try:
            if decl_type == 'FunctionDeclaration':
                self.visit_function(declaration_node)
            elif decl_type == 'TypeAliasDeclaration':
                self.visit_type_alias(declaration_node)
            elif decl_type == 'CustomTypeDeclaration':
                self.visit_custom_type(declaration_node)
            elif decl_type == 'PortDeclaration':
                self.visit_port(declaration_node)
            elif decl_type == 'InfixDeclaration':
                self.visit_infix(declaration_node)
            elif decl_type == 'Destructuring':
                self.visit_destructuring(declaration_node)
            else:
                debug(f"Unknown declaration type: {decl_type}")
        except Exception as e:
            debug(f"Error processing {decl_type}: {str(e)}")
            raise

    def visit_function(self, function_node: Dict):
        """Visit a FunctionDeclaration node"""
        if not isinstance(function_node, dict):
            raise ASTParseError("Function node must be a dictionary")
            
        name = function_node.get('name')
        if not name:
            raise ASTParseError("Function node missing 'name' field")
            
        start_line = function_node.get('start', {}).get('line')
        end_line = function_node.get('end', {}).get('line')
        
        if not start_line or not end_line:
            raise ASTParseError("Function node missing line numbers")
            
        if start_line > end_line:
            raise ASTParseError(f"Invalid line numbers: start ({start_line}) > end ({end_line})")

        try:
            self.chunks.append({
                "type": "function",
                "name": name,
                "code": self.extract_code(function_node),
                "startLine": start_line,
                "endLine": end_line,
                "calls": self.get_calls(function_node),
                "imports": self.imports
            })
        except Exception as e:
            debug(f"Error creating function chunk: {str(e)}")
            raise

    def visit_type_alias(self, type_node: Dict):
        """Visit a TypeAliasDeclaration node"""
        if not isinstance(type_node, dict):
            raise ASTParseError("Type alias node must be a dictionary")
            
        name = type_node.get('name')
        if not name:
            raise ASTParseError("Type alias node missing 'name' field")
            
        start_line = type_node.get('start', {}).get('line')
        end_line = type_node.get('end', {}).get('line')
        
        if not start_line or not end_line:
            raise ASTParseError("Type alias node missing line numbers")
            
        if start_line > end_line:
            raise ASTParseError(f"Invalid line numbers: start ({start_line}) > end ({end_line})")

        try:
            self.chunks.append({
                "type": "class",
                "name": name,
                "code": self.extract_code(type_node),
                "startLine": start_line,
                "endLine": end_line,
                "calls": [],
                "imports": self.imports
            })
        except Exception as e:
            debug(f"Error creating type alias chunk: {str(e)}")
            raise

    def visit_custom_type(self, type_node: Dict):
        """Visit a CustomTypeDeclaration node"""
        if not isinstance(type_node, dict):
            raise ASTParseError("Custom type node must be a dictionary")
            
        name = type_node.get('name')
        if not name:
            raise ASTParseError("Custom type node missing 'name' field")
            
        start_line = type_node.get('start', {}).get('line')
        end_line = type_node.get('end', {}).get('line')
        
        if not start_line or not end_line:
            raise ASTParseError("Custom type node missing line numbers")
            
        if start_line > end_line:
            raise ASTParseError(f"Invalid line numbers: start ({start_line}) > end ({end_line})")

        try:
            self.chunks.append({
                "type": "class",
                "name": name,
                "code": self.extract_code(type_node),
                "startLine": start_line,
                "endLine": end_line,
                "calls": [],
                "imports": self.imports
            })
        except Exception as e:
            debug(f"Error creating custom type chunk: {str(e)}")
            raise

    def visit_port(self, port_node: Dict):
        """Visit a PortDeclaration node"""
        if not isinstance(port_node, dict):
            raise ASTParseError("Port node must be a dictionary")
            
        name = port_node.get('name')
        if not name:
            raise ASTParseError("Port node missing 'name' field")
            
        start_line = port_node.get('start', {}).get('line')
        end_line = port_node.get('end', {}).get('line')
        
        if not start_line or not end_line:
            raise ASTParseError("Port node missing line numbers")
            
        if start_line > end_line:
            raise ASTParseError(f"Invalid line numbers: start ({start_line}) > end ({end_line})")

        try:
            self.chunks.append({
                "type": "function",
                "name": name,
                "code": self.extract_code(port_node),
                "startLine": start_line,
                "endLine": end_line,
                "calls": [],
                "imports": self.imports
            })
        except Exception as e:
            debug(f"Error creating port chunk: {str(e)}")
            raise

    def visit_infix(self, infix_node: Dict):
        """Visit an InfixDeclaration node"""
        # Infix operators are not tracked as chunks
        pass

    def visit_destructuring(self, destructuring_node: Dict):
        """Visit a Destructuring node"""
        # Destructuring is not tracked as a chunk
        pass

    def extract_code(self, node: Dict) -> str:
        """Extract source code for a node"""
        if not isinstance(node, dict):
            raise ASTParseError("Node must be a dictionary")
            
        start_line = node.get('start', {}).get('line')
        end_line = node.get('end', {}).get('line')
        
        if not start_line or not end_line:
            raise ASTParseError("Node missing line numbers")
            
        if start_line > end_line:
            raise ASTParseError(f"Invalid line numbers: start ({start_line}) > end ({end_line})")
            
        try:
            lines = self.source_code.splitlines()
            if start_line > len(lines) or end_line > len(lines):
                raise ASTParseError(f"Line numbers out of range: {start_line}-{end_line} (file has {len(lines)} lines)")
            return "\n".join(lines[start_line - 1:end_line])
        except Exception as e:
            debug(f"Error extracting code: {str(e)}")
            raise

    def get_calls(self, node: Dict) -> List[str]:
        """Extract function calls from a node"""
        if not isinstance(node, dict):
            raise ASTParseError("Node must be a dictionary")
            
        calls = []
        
        def visit_application(app_node: Dict):
            """Visit an Application node (function call)"""
            if not isinstance(app_node, dict):
                return
                
            function = app_node.get('function', {})
            if function.get('type') == 'FunctionOrValue':
                module = function.get('module', [])
                name = function.get('name', '')
                if module:
                    calls.append(f"{'.'.join(module)}.{name}")
                else:
                    calls.append(name)

        def visit_operator_application(op_node: Dict):
            """Visit an OperatorApplication node"""
            if not isinstance(op_node, dict):
                return
                
            operator = op_node.get('operator', '')
            if operator:
                calls.append(operator)

        def traverse(node: Dict):
            """Traverse all nodes recursively"""
            if not isinstance(node, dict):
                return

            node_type = node.get('type')
            if node_type == 'Application':
                visit_application(node)
            elif node_type == 'OperatorApplication':
                visit_operator_application(node)

            # Recursively visit all values in the node
            for value in node.values():
                if isinstance(value, dict):
                    traverse(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            traverse(item)

        try:
            traverse(node)
            return calls
        except Exception as e:
            debug(f"Error getting calls: {str(e)}")
            return []

def parse_elm_file(file_path: str) -> List[Dict]:
    """Parse an Elm file and return a list of code chunks"""
    debug(f"Reading Elm file: {file_path}")
    
    # Check if file exists
    if not os.path.exists(file_path):
        raise FileReadError(f"File not found: {file_path}")
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source_code = f.read()
            debug(f"File contents length: {len(source_code)} characters")
            
            # Create a temporary file for the Elm code
            with tempfile.NamedTemporaryFile(mode='w', suffix='.elm', delete=False) as temp:
                temp.write(source_code)
                temp_path = temp.name

            try:
                # Get the directory where this script is located
                script_dir = os.path.dirname(os.path.abspath(__file__))
                elm_parser_path = os.path.join(script_dir, 'elm_parser.js')
                result = subprocess.run(
                    ['node', elm_parser_path, temp_path],
                    capture_output=True,
                    text=True,
                    check=True
                )
                
                # Parse the JSON output from our parser
                try:
                    result_data = json.loads(result.stdout)
                    if result_data.get('type') == 'error':
                        raise ASTParseError(f"Failed to parse Elm file: {result_data.get('error')}")
                    chunks = result_data.get('value', [])
                except json.JSONDecodeError as e:
                    raise ASTParseError(f"Failed to parse parser output: {str(e)}")
                
                debug(f"Found {len(chunks)} chunks in {file_path}")
                return chunks
                
            finally:
                # Clean up the temporary file
                try:
                    os.unlink(temp_path)
                except Exception as e:
                    debug(f"Warning: Failed to delete temporary file {temp_path}: {str(e)}")
                
    except Exception as e:
        if isinstance(e, ElmParserError):
            raise
        raise FileReadError(f"Error reading Elm file {file_path}: {str(e)}")

if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            print("Usage: python elm_ast_parser.py <elm_file>", file=sys.stderr)
            sys.exit(1)
            
        file_path = sys.argv[1]
        debug(f"Processing file: {file_path}")
        chunks = parse_elm_file(file_path)
        for chunk in chunks:
            chunk["filePath"] = file_path
            chunk["language"] = "elm"
        print(json.dumps(chunks))
    except ElmParserError as e:
        debug(f"Error: {str(e)}")
        sys.exit(1)
    except Exception as e:
        debug(f"Unexpected error: {str(e)}")
        sys.exit(1) 