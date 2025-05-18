module Test exposing (main, add, Person, greet)

import Html exposing (text)

{-| A simple function that adds two numbers
-}
add : Int -> Int -> Int
add x y =
    x + y

{-| A type alias for a person
-}
type alias Person =
    { name : String
    , age : Int
    }

{-| A custom type for different kinds of greetings
-}
type Greeting
    = Hello String
    | Goodbye String
    | Custom String String

{-| A function that creates a greeting
-}
greet : Person -> Greeting
greet person =
    Hello person.name

main =
    text "Hello, World!" 