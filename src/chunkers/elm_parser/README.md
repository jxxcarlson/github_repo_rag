To test src/ElmParser.elm, run `node test_paser.js`

The input is the file test.elm

The outupt should be

```
Parse result: {
  "type": "ok",
  "value": [
    {
      "type": "function",
      "name": "add",
      "code": "{-| A simple function that adds two numbers\n-}\nadd : Int -> Int -> Int\nadd x y =\n    x + y",
      "startLine": 5,
      "endLine": 9,
      "calls": [],
      "imports": [
        "Html"
      ]
    },
    {
      "type": "class",
      "name": "Person",
      "code": "{-| A type alias for a person\n-}\ntype alias Person =\n    { name : String\n    , age : Int\n    }",
      "startLine": 11,
      "endLine": 16,
      "calls": [],
      "imports": [
        "Html"
      ]
    },
    {
      "type": "class",
      "name": "Greeting",
      "code": "{-| A custom type for different kinds of greetings\n-}\ntype Greeting\n    = Hello String\n    | Goodbye String\n    | Custom String String",
      "startLine": 18,
      "endLine": 23,
      "calls": [],
      "imports": [
        "Html"
      ]
    },
    {
      "type": "function",
      "name": "greet",
      "code": "{-| A function that creates a greeting\n-}\ngreet : Person -> Greeting\ngreet person =\n    Hello person.name",
      "startLine": 25,
      "endLine": 29,
      "calls": [],
      "imports": [
        "Html"
      ]
    },
    {
      "type": "function",
      "name": "main",
      "code": "main =\n    text \"Hello, World!\" ",
      "startLine": 31,
      "endLine": 32,
      "calls": [],
      "imports": [
        "Html"
      ]
    }
  ]
```
