const Parser = require("tree-sitter")
const C_Lang = require("tree-sitter-c")
const crypto = require("node:crypto")
const path = require("node:path")
const fs = require("fs")
const { writeFileSync } = require("node:fs")
const parser = new Parser()
parser.setLanguage(C_Lang)

const hashString = (s) => {
  return crypto.createHash("sha1").update(s).digest("hex");
}

const processFile = (filepath, query) => {
  const fileContents = fs.readFileSync(filepath).toString()
  console.log(fileContents)
  const tree = parser.parse(fileContents)

  const matches = query.matches(tree.rootNode)
  const signature_text = []
  for (const match of matches) {
    const t1 = match.captures.map(c => tree.getText(c.node))
    signature_text.push(t1.join(" "))
    console.log(t1)
  }

  const signatures = signature_text.map(st => st + ";")
  const signature_hashes = signatures.map(sig => ({
    signature: sig,
    hash: hashString(sig),
  }))

  return signature_hashes
}

const c_query = new Parser.Query(C_Lang,
  `(function_definition ;
  type: (type_identifier) @type;
  declarator: (function_declarator ) @decl 
  )`);

const h_query = new Parser.Query(C_Lang,
  `(declaration ;
  type: (type_identifier) @type;
  declarator: (function_declarator ) @decl 
  )`);

const filepath = "../DSA_C/base.c"
const dir_name = path.dirname(filepath)

// console.log(dir_name)
const base_name = path.basename(filepath)
const extensionless_name = base_name.slice(0, base_name.lastIndexOf("."))
const header_filename = path.join(dir_name, extensionless_name + ".h")

const c_file_hashes = processFile(filepath, c_query)
console.log(header_filename)
const h_file_hashes = processFile(header_filename, h_query)

console.log(c_file_hashes);
console.log(h_file_hashes);

const data = []
for (const c_hash of c_file_hashes) {
  for (const h_hash of h_file_hashes) {
    if (c_hash.hash === h_hash.hash) {
      data.push(c_hash)
    }
  }
}

const writeHeader = (filepath, hashes) => {
  const fileContents = fs.readFileSync(filepath).toString()
  const lines = fileContents.split("\n")
  const result = ""

  const tree = parser.parse(fileContents)

  const matches = h_query.matches(tree.rootNode)
  const sets = []
  for (const m of matches) {
    // console.log(matches.map(m => m.captures))
    sets.push(new Set(m.captures.map(c => c.node.startPosition.row)))
  }

  for (const s of sets) {
    for (const e of s) {
      console.log(lines[e])
    }
  }

}

console.log(data)
writeHeader(header_filename, data)

// console.log(signatures)
// console.log(signature_hashes)

// const result = `/* this header has been generated automatically
// do not edit
// generated at: ${new Date().toISOString()}
// corresponding C file: ${base_name} */
//
// ${signature_text.map(st => st + ";").join("\n")}`



// fs.writeFileSync(new_filename, result)
