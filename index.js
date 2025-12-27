const Parser = require("tree-sitter")
const C_Lang = require("tree-sitter-c")
const path = require("node:path")
const fs = require("fs")
const parser = new Parser()
parser.setLanguage(C_Lang)

const filepath = "../DSA_C/base.c"
const dir_name = path.dirname(filepath)
const fileContents = fs.readFileSync(filepath).toString()
const tree = parser.parse(fileContents)
const query = new Parser.Query(C_Lang,
  `(function_definition ;
  type: (type_identifier) @type;
  declarator: (function_declarator ) @decl 
  )`);
const matches = query.matches(tree.rootNode)
const signature_text = []
for (const match of matches) {
  const t1 = match.captures.map(c => tree.getText(c.node))
  signature_text.push(t1.join(" "))
  console.log(t1)
}

for (const st of signature_text) {
  console.log(st)
}

console.log(dir_name)
