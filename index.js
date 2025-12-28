const Parser = require("tree-sitter")
const C_Lang = require("tree-sitter-c")
const path = require("node:path")
const fs = require("fs")
const parser = new Parser()
parser.setLanguage(C_Lang)

const is_dir = (path) => {
  try {
    const stats = fs.statSync(path)
    return stats.isDirectory();
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.log("Provide a path to the root directory of your C source files.")
  process.exit(1)
}

const dir = args[0]
if (!is_dir(dir)) {
  console.log("Provided path is not a directory.")
  console.log("Provide a path to the root directory of your C source files.")
  process.exit(1)
}

try {
  fs.accessSync(dir)
} catch (error) {
  console.log("Couldn't access path")
  process.exit(1)
}

const c_files = fs.readdirSync(dir, { recursive: true })
  .filter(i => i !== "main.c")
  .map(fname => path.join(dir, fname))
  .filter(i => fs.lstatSync(i).isFile())
  .filter(i => i.endsWith(".c"))
  .map(i => path.resolve(i))
console.log(c_files)

const processFile = (filepath, query) => {
  const fileContents = fs.readFileSync(filepath).toString()
  const tree = parser.parse(fileContents)

  const matches = query.matches(tree.rootNode)
  const signature_text = []
  for (const match of matches) {
    const t1 = match.captures.map(c => tree.getText(c.node))
    signature_text.push(t1.join(" "))
  }

  const signatures = signature_text.map(st => st + ";")
  console.log(signatures)

  return signatures
}

const c_query = new Parser.Query(C_Lang,
  `(function_definition ;
  type: (_) @type;
  declarator: (function_declarator ) @decl 
  )`);

const h_query = new Parser.Query(C_Lang,
  `(declaration ;
  type: (_) @type;
  declarator: (function_declarator ) @decl 
  )`);

const writeHeader = (filepath, signatures) => {
  try {
    if (!fs.lstatSync(filepath).isFile()) {
      fs.writeFileSync(filepath, signatures.join("\n"))
      return
    }
  } catch (error) {
    fs.writeFileSync(filepath, signatures.join("\n"))
    return
  }
  const fileContents = fs.readFileSync(filepath).toString()
  const lines = fileContents.split("\n")

  const tree = parser.parse(fileContents)

  const matches = h_query.matches(tree.rootNode)
  const sets = []
  for (const m of matches) {
    sets.push(new Set(m.captures.map(c => c.node.startPosition.row)))
  }

  for (const s of sets) {
    for (const e of s) {
      lines.splice(e, 1)
    }
  }

  const result = [...lines, ...signatures]
  fs.writeFileSync(filepath, result.join("\n"))

  return result
}

const generateHeader = (filepath) => {
  const dir_name = path.dirname(filepath)
  const base_name = path.basename(filepath)
  const extensionless_name = base_name.slice(0, base_name.lastIndexOf("."))
  const header_filename = path.join(dir_name, extensionless_name + ".h")
  console.log("header_filename: ", header_filename)
  const c_file_sigs = processFile(filepath, c_query)
  const lines = writeHeader(header_filename, c_file_sigs)
}

for (const c_file of c_files) {
  generateHeader(c_file)
}








console.log(process.argv.slice(2))
