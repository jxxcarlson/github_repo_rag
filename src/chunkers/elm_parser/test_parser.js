const fs = require('fs');
const { Elm } = require('./elm_parser.js');

// Read the test file
const source = fs.readFileSync('./test.elm', 'utf8');

// Initialize the Elm app
const app = Elm.ElmParser.init();

// Subscribe to the parse result
app.ports.parseResult.subscribe(result => {
    console.log('Parse result:', JSON.stringify(result, null, 2));
});

// Send the source code to be parsed
app.ports.parseFile.send(source); 