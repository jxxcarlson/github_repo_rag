import ast
import json

def print_ast_structure(node, indent=0):
    """Print the structure of an AST node recursively"""
    print("  " * indent + f"Type: {type(node).__name__}")
    for field, value in ast.iter_fields(node):
        if isinstance(value, ast.AST):
            print("  " * indent + f"Field: {field}")
            print_ast_structure(value, indent + 1)
        elif isinstance(value, list):
            print("  " * indent + f"Field: {field} (list)")
            for item in value:
                if isinstance(item, ast.AST):
                    print_ast_structure(item, indent + 1)
        else:
            print("  " * indent + f"Field: {field}: {value}")

def ast_to_dict(node):
    """Convert an AST node to a dictionary representation"""
    if isinstance(node, ast.AST):
        fields = {}
        for field, value in ast.iter_fields(node):
            if isinstance(value, list):
                fields[field] = [ast_to_dict(item) for item in value]
            else:
                fields[field] = ast_to_dict(value)
        fields['_type'] = type(node).__name__
        return fields
    elif isinstance(node, list):
        return [ast_to_dict(item) for item in node]
    else:
        return node

# Example Python code
code = """
def hello(name):
    print(f"Hello, {name}!")
    return name.upper()

class Person:
    def __init__(self, name):
        self.name = name
    
    def greet(self):
        return hello(self.name)
"""

# Parse the code
tree = ast.parse(code)

# Convert AST to dictionary and then to JSON
ast_dict = ast_to_dict(tree)
ast_json = json.dumps(ast_dict, indent=2)

print("JSON representation of the AST:")
print(ast_json)

# This is similar to what py_ast_parser.py does when it outputs chunks
print("\nExample of how py_ast_parser.py formats its output:")
chunks = []
for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef):
        chunks.append({
            "type": "function",
            "name": node.name,
            "code": "def " + node.name + "(...)",  # Simplified for example
            "startLine": node.lineno,
            "endLine": node.end_lineno,
            "calls": [],  # Simplified for example
            "imports": []  # Simplified for example
        })
    elif isinstance(node, ast.ClassDef):
        chunks.append({
            "type": "class",
            "name": node.name,
            "code": "class " + node.name + "...",  # Simplified for example
            "startLine": node.lineno,
            "endLine": node.end_lineno,
            "calls": [],  # Simplified for example
            "imports": []  # Simplified for example
        })

print(json.dumps(chunks, indent=2))

# Demonstrate that tree is an instance of ast.Module
print(f"Root node type: {type(tree)}")  # <class 'ast.Module'>
print(f"Is instance of ast.AST? {isinstance(tree, ast.AST)}")  # True
print(f"Parent class: {type(tree).__bases__[0]}")  # <class 'ast.AST'>

# Look at the first function definition
for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef):
        print("\nFunction node details:")
        print(f"Type: {type(node)}")  # <class 'ast.FunctionDef'>
        print(f"Parent class: {type(node).__bases__[0]}")  # <class 'ast.stmt'>
        print(f"Grandparent class: {type(node).__bases__[0].__bases__[0]}")  # <class 'ast.AST'>
        print(f"Instance attributes: {dir(node)}")
        break

# Look at a function call
for node in ast.walk(tree):
    if isinstance(node, ast.Call):
        print("\nCall node details:")
        print(f"Type: {type(node)}")  # <class 'ast.Call'>
        print(f"Parent class: {type(node).__bases__[0]}")  # <class 'ast.expr'>
        print(f"Grandparent class: {type(node).__bases__[0].__bases__[0]}")  # <class 'ast.AST'>
        print(f"Instance attributes: {dir(node)}")
        break

# Print the structure
print("AST Structure:")
print_ast_structure(tree)

# Print some specific node types we care about
print("\nFunction Definitions:")
for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef):
        print(f"\nFunction: {node.name}")
        print(f"  Args: {[arg.arg for arg in node.args.args]}")
        print(f"  Returns: {node.returns}")
        print(f"  Decorators: {[d.id for d in node.decorator_list] if node.decorator_list else []}")
        print(f"  Line numbers: {node.lineno} to {node.end_lineno}")

print("\nClass Definitions:")
for node in ast.walk(tree):
    if isinstance(node, ast.ClassDef):
        print(f"\nClass: {node.name}")
        print(f"  Bases: {[b.id for b in node.bases] if node.bases else []}")
        print(f"  Decorators: {[d.id for d in node.decorator_list] if node.decorator_list else []}")
        print(f"  Line numbers: {node.lineno} to {node.end_lineno}")
        print("  Methods:")
        for item in node.body:
            if isinstance(item, ast.FunctionDef):
                print(f"    - {item.name}")

print("\nFunction Calls:")
for node in ast.walk(tree):
    if isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name):
            print(f"Function call: {node.func.id}")
        elif isinstance(node.func, ast.Attribute):
            print(f"Method call: {node.func.attr}") 


# Simplified JSON output

# [
#   {
#     "type": "function",
#     "name": "hello",
#     "code": "def hello(...)",
#     "startLine": 2,
#     "endLine": 4,
#     "calls": [],
#     "imports": []
#   },
#   {
#     "type": "class",
#     "name": "Person",
#     "code": "class Person...",
#     "startLine": 6,
#     "endLine": 11,
#     "calls": [],
#     "imports": []
#   },
#   {
#     "type": "function",
#     "name": "__init__",
#     "code": "def __init__(...)",
#     "startLine": 7,
#     "endLine": 8,
#     "calls": [],
#     "imports": []
#   },
#   {
#     "type": "function",
#     "name": "greet",
#     "code": "def greet(...)",
#     "startLine": 10,
#     "endLine": 11,
#     "calls": [],
#     "imports": []
#   }
# ]



# Full JSON output
# {
#   "body": [
#     {
#       "name": "hello",
#       "args": {
#         "posonlyargs": [],
#         "args": [
#           {
#             "arg": "name",
#             "annotation": null,
#             "type_comment": null,
#             "_type": "arg"
#           }
#         ],
#         "vararg": null,
#         "kwonlyargs": [],
#         "kw_defaults": [],
#         "kwarg": null,
#         "defaults": [],
#         "_type": "arguments"
#       },
#       "body": [
#         {
#           "value": {
#             "func": {
#               "id": "print",
#               "ctx": {
#                 "_type": "Load"
#               },
#               "_type": "Name"
#             },
#             "args": [
#               {
#                 "values": [
#                   {
#                     "value": "Hello, ",
#                     "kind": null,
#                     "_type": "Constant"
#                   },
#                   {
#                     "value": {
#                       "id": "name",
#                       "ctx": {
#                         "_type": "Load"
#                       },
#                       "_type": "Name"
#                     },
#                     "conversion": -1,
#                     "format_spec": null,
#                     "_type": "FormattedValue"
#                   },
#                   {
#                     "value": "!",
#                     "kind": null,
#                     "_type": "Constant"
#                   }
#                 ],
#                 "_type": "JoinedStr"
#               }
#             ],
#             "keywords": [],
#             "_type": "Call"
#           },
#           "_type": "Expr"
#         },
#         {
#           "value": {
#             "func": {
#               "value": {
#                 "id": "name",
#                 "ctx": {
#                   "_type": "Load"
#                 },
#                 "_type": "Name"
#               },
#               "attr": "upper",
#               "ctx": {
#                 "_type": "Load"
#               },
#               "_type": "Attribute"
#             },
#             "args": [],
#             "keywords": [],
#             "_type": "Call"
#           },
#           "_type": "Return"
#         }
#       ],
#       "decorator_list": [],
#       "returns": null,
#       "type_comment": null,
#       "_type": "FunctionDef"
#     },
#     {
#       "name": "Person",
#       "bases": [],
#       "keywords": [],
#       "body": [
#         {
#           "name": "__init__",
#           "args": {
#             "posonlyargs": [],
#             "args": [
#               {
#                 "arg": "self",
#                 "annotation": null,
#                 "type_comment": null,
#                 "_type": "arg"
#               },
#               {
#                 "arg": "name",
#                 "annotation": null,
#                 "type_comment": null,
#                 "_type": "arg"
#               }
#             ],
#             "vararg": null,
#             "kwonlyargs": [],
#             "kw_defaults": [],
#             "kwarg": null,
#             "defaults": [],
#             "_type": "arguments"
#           },
#           "body": [
#             {
#               "targets": [
#                 {
#                   "value": {
#                     "id": "self",
#                     "ctx": {
#                       "_type": "Load"
#                     },
#                     "_type": "Name"
#                   },
#                   "attr": "name",
#                   "ctx": {
#                     "_type": "Store"
#                   },
#                   "_type": "Attribute"
#                 }
#               ],
#               "value": {
#                 "id": "name",
#                 "ctx": {
#                   "_type": "Load"
#                 },
#                 "_type": "Name"
#               },
#               "type_comment": null,
#               "_type": "Assign"
#             }
#           ],
#           "decorator_list": [],
#           "returns": null,
#           "type_comment": null,
#           "_type": "FunctionDef"
#         },
#         {
#           "name": "greet",
#           "args": {
#             "posonlyargs": [],
#             "args": [
#               {
#                 "arg": "self",
#                 "annotation": null,
#                 "type_comment": null,
#                 "_type": "arg"
#               }
#             ],
#             "vararg": null,
#             "kwonlyargs": [],
#             "kw_defaults": [],
#             "kwarg": null,
#             "defaults": [],
#             "_type": "arguments"
#           },
#           "body": [
#             {
#               "value": {
#                 "func": {
#                   "id": "hello",
#                   "ctx": {
#                     "_type": "Load"
#                   },
#                   "_type": "Name"
#                 },
#                 "args": [
#                   {
#                     "value": {
#                       "id": "self",
#                       "ctx": {
#                         "_type": "Load"
#                       },
#                       "_type": "Name"
#                     },
#                     "attr": "name",
#                     "ctx": {
#                       "_type": "Load"
#                     },
#                     "_type": "Attribute"
#                   }
#                 ],
#                 "keywords": [],
#                 "_type": "Call"
#               },
#               "_type": "Return"
#             }
#           ],
#           "decorator_list": [],
#           "returns": null,
#           "type_comment": null,
#           "_type": "FunctionDef"
#         }
#       ],
#       "decorator_list": [],
#       "_type": "ClassDef"
#     }
#   ],
#   "type_ignores": [],
#   "_type": "Module"
# }
