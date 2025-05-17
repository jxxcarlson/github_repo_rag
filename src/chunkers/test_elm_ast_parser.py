import unittest
from chunkers.elm_ast_parser import ElmCodeChunkVisitor, ElmParserError, FileReadError, ASTParseError, SubprocessError
import tempfile
import os

class TestElmCodeChunkVisitor(unittest.TestCase):
    def setUp(self):
        """Set up test cases with sample Elm code"""
        self.sample_code = """
module Main exposing (main, Person)

import List exposing (map, filter)
import String exposing (toUpper)

type alias Person =
    { name : String
    , age : Int
    }

type Color
    = Red
    | Blue
    | Green

port sendMessage : String -> Cmd msg

add : Int -> Int -> Int
add x y =
    x + y

greet : Person -> String
greet person =
    let
        name = person.name
        upperName = String.toUpper name
    in
    "Hello, " ++ upperName ++ "!"

main : Program () Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , view = view
        , subscriptions = subscriptions
        }
"""
        self.visitor = ElmCodeChunkVisitor(self.sample_code)

    def test_visit_file(self):
        """Test visiting a complete Elm file"""
        file_node = {
            'module': {'name': 'Main'},
            'declarations': [
                {
                    'type': 'TypeAliasDeclaration',
                    'name': 'Person',
                    'start': {'line': 6},
                    'end': {'line': 9}
                },
                {
                    'type': 'CustomTypeDeclaration',
                    'name': 'Color',
                    'start': {'line': 11},
                    'end': {'line': 14}
                },
                {
                    'type': 'PortDeclaration',
                    'name': 'sendMessage',
                    'start': {'line': 16},
                    'end': {'line': 16}
                },
                {
                    'type': 'FunctionDeclaration',
                    'name': 'add',
                    'start': {'line': 18},
                    'end': {'line': 20},
                    'expression': {
                        'type': 'OperatorApplication',
                        'operator': '+',
                        'left': {'type': 'FunctionOrValue', 'name': 'x'},
                        'right': {'type': 'FunctionOrValue', 'name': 'y'}
                    }
                },
                {
                    'type': 'FunctionDeclaration',
                    'name': 'greet',
                    'start': {'line': 22},
                    'end': {'line': 28}
                }
            ]
        }
        
        self.visitor.visit_file(file_node)
        chunks = self.visitor.chunks
        
        # Check number of chunks
        self.assertEqual(len(chunks), 5)
        
        # Check type alias
        person_chunk = next(c for c in chunks if c['name'] == 'Person')
        self.assertEqual(person_chunk['type'], 'class')
        self.assertEqual(person_chunk['startLine'], 6)
        self.assertEqual(person_chunk['endLine'], 9)
        
        # Check custom type
        color_chunk = next(c for c in chunks if c['name'] == 'Color')
        self.assertEqual(color_chunk['type'], 'class')
        self.assertEqual(color_chunk['startLine'], 11)
        self.assertEqual(color_chunk['endLine'], 14)
        
        # Check port
        port_chunk = next(c for c in chunks if c['name'] == 'sendMessage')
        self.assertEqual(port_chunk['type'], 'function')
        self.assertEqual(port_chunk['startLine'], 16)
        self.assertEqual(port_chunk['endLine'], 16)
        
        # Check function
        add_chunk = next(c for c in chunks if c['name'] == 'add')
        self.assertEqual(add_chunk['type'], 'function')
        self.assertEqual(add_chunk['startLine'], 18)
        self.assertEqual(add_chunk['endLine'], 20)
        self.assertIn('+', add_chunk['calls'])  # Check operator call

    def test_get_calls(self):
        """Test function call detection"""
        node = {
            'type': 'Application',
            'function': {
                'type': 'FunctionOrValue',
                'module': ['String'],
                'name': 'toUpper'
            }
        }
        calls = self.visitor.get_calls(node)
        self.assertIn('String.toUpper', calls)

        # Test operator application
        op_node = {
            'type': 'OperatorApplication',
            'operator': '++',
            'left': {'type': 'Literal', 'value': 'Hello, '},
            'right': {'type': 'FunctionOrValue', 'name': 'name'}
        }
        calls = self.visitor.get_calls(op_node)
        self.assertIn('++', calls)

    def test_extract_code(self):
        """Test code extraction"""
        node = {
            'start': {'line': 2},
            'end': {'line': 4}
        }
        code = self.visitor.extract_code(node)
        self.assertIn('module Main', code)

    def test_visit_function_with_calls(self):
        """Test visiting a function with multiple calls"""
        function_node = {
            'type': 'FunctionDeclaration',
            'name': 'greet',
            'start': {'line': 22},
            'end': {'line': 28},
            'expression': {
                'type': 'Application',
                'function': {
                    'type': 'FunctionOrValue',
                    'module': ['String'],
                    'name': 'toUpper'
                }
            }
        }
        self.visitor.visit_function(function_node)
        chunk = self.visitor.chunks[0]
        self.assertEqual(chunk['name'], 'greet')
        self.assertIn('String.toUpper', chunk['calls'])

    def test_visit_type_alias(self):
        """Test visiting a type alias"""
        type_node = {
            'type': 'TypeAliasDeclaration',
            'name': 'Person',
            'start': {'line': 6},
            'end': {'line': 9}
        }
        self.visitor.visit_type_alias(type_node)
        chunk = self.visitor.chunks[0]
        self.assertEqual(chunk['type'], 'class')
        self.assertEqual(chunk['name'], 'Person')
        self.assertEqual(chunk['calls'], [])  # Type aliases don't have calls

    def test_visit_custom_type(self):
        """Test visiting a custom type"""
        type_node = {
            'type': 'CustomTypeDeclaration',
            'name': 'Color',
            'start': {'line': 11},
            'end': {'line': 14}
        }
        self.visitor.visit_custom_type(type_node)
        chunk = self.visitor.chunks[0]
        self.assertEqual(chunk['type'], 'class')
        self.assertEqual(chunk['name'], 'Color')
        self.assertEqual(chunk['calls'], [])  # Custom types don't have calls

    def test_invalid_file_node(self):
        """Test handling of invalid file node"""
        with self.assertRaises(ASTParseError) as context:
            self.visitor.visit_file("not a dict")
        self.assertIn("must be a dictionary", str(context.exception))

    def test_missing_declarations(self):
        """Test handling of missing declarations"""
        file_node = {
            'module': {'name': 'Main'},
            'declarations': "not a list"  # Should be a list
        }
        with self.assertRaises(ASTParseError) as context:
            self.visitor.visit_file(file_node)
        self.assertIn("must be a list", str(context.exception))

    def test_invalid_function_node(self):
        """Test handling of invalid function node"""
        with self.assertRaises(ASTParseError) as context:
            self.visitor.visit_function("not a dict")
        self.assertIn("must be a dictionary", str(context.exception))

    def test_missing_function_name(self):
        """Test handling of function node without name"""
        function_node = {
            'type': 'FunctionDeclaration',
            'start': {'line': 1},
            'end': {'line': 2}
        }
        with self.assertRaises(ASTParseError) as context:
            self.visitor.visit_function(function_node)
        self.assertIn("missing 'name' field", str(context.exception))

    def test_invalid_line_numbers(self):
        """Test handling of invalid line numbers"""
        function_node = {
            'type': 'FunctionDeclaration',
            'name': 'test',
            'start': {'line': 10},  # Start > end
            'end': {'line': 5}
        }
        with self.assertRaises(ASTParseError) as context:
            self.visitor.visit_function(function_node)
        self.assertIn("Invalid line numbers", str(context.exception))

    def test_out_of_range_line_numbers(self):
        """Test handling of line numbers out of range"""
        node = {
            'start': {'line': 1000},  # Way beyond file length
            'end': {'line': 1001}
        }
        with self.assertRaises(ASTParseError) as context:
            self.visitor.extract_code(node)
        self.assertIn("out of range", str(context.exception))

    def test_invalid_type_node(self):
        """Test handling of invalid type node"""
        with self.assertRaises(ASTParseError) as context:
            self.visitor.visit_type_alias("not a dict")
        self.assertIn("must be a dictionary", str(context.exception))

    def test_missing_type_name(self):
        """Test handling of type node without name"""
        type_node = {
            'type': 'TypeAliasDeclaration',
            'start': {'line': 1},
            'end': {'line': 2}
        }
        with self.assertRaises(ASTParseError) as context:
            self.visitor.visit_type_alias(type_node)
        self.assertIn("missing 'name' field", str(context.exception))

    def test_invalid_port_node(self):
        """Test handling of invalid port node"""
        with self.assertRaises(ASTParseError) as context:
            self.visitor.visit_port("not a dict")
        self.assertIn("must be a dictionary", str(context.exception))

    def test_missing_port_name(self):
        """Test handling of port node without name"""
        port_node = {
            'type': 'PortDeclaration',
            'start': {'line': 1},
            'end': {'line': 2}
        }
        with self.assertRaises(ASTParseError) as context:
            self.visitor.visit_port(port_node)
        self.assertIn("missing 'name' field", str(context.exception))

    def test_invalid_calls_node(self):
        """Test handling of invalid node in get_calls"""
        with self.assertRaises(ASTParseError) as context:
            self.visitor.get_calls("not a dict")
        self.assertIn("must be a dictionary", str(context.exception))

    def test_safe_call_extraction(self):
        """Test safe extraction of calls from malformed node"""
        node = {
            'type': 'Application',
            'function': "not a dict"  # Should be a dict
        }
        calls = self.visitor.get_calls(node)
        self.assertEqual(calls, [])  # Should return empty list instead of raising

    def test_unknown_declaration_type(self):
        """Test handling of unknown declaration type"""
        declaration_node = {
            'type': 'UnknownType',
            'name': 'test',
            'start': {'line': 1},
            'end': {'line': 2}
        }
        # Should not raise, just log and continue
        self.visitor.visit_declaration(declaration_node)
        self.assertEqual(len(self.visitor.chunks), 0)

if __name__ == '__main__':
    unittest.main() 