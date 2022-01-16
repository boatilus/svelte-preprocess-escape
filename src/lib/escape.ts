import MagicString from 'magic-string'
import sax from 'sax'

export type HighlightFunc = (code: string, lang?: string) => string

/** @ignore */
export type FormatFunc = (code: string, filename?: string) => string

export interface Options {
  tag: string
  extensions: string[]
  highlighter?: HighlightFunc
}

const default_opts = {
  tag: 'escape-content',
  extensions: ['.svelte']
}

const parser = sax.parser(false, {
  lowercase: true,
  position: true
})

/**
 * @see: https://github.com/tamino-martinius/node-ts-dedent (by Tamino Martinius)
 * @license MIT
 */
const dedent = (
  templ: TemplateStringsArray | string,
  ...values: unknown[]
): string => {
  let strings = Array.from(typeof templ === 'string' ? [templ] : templ)

  // 1. Remove trailing whitespace.
  strings[strings.length - 1] = strings[strings.length - 1].replace(
    /\r?\n([\t ]*)$/,
    ''
  )

  // 2. Find all line breaks to determine the highest common indentation level.
  const indentLengths = strings.reduce((arr, str) => {
    const matches = str.match(/\n([\t ]+|(?!\s).)/g)
    if (matches) {
      return arr.concat(
        matches.map((match) => match.match(/[\t ]/g)?.length ?? 0)
      )
    }
    return arr
  }, <number[]>[])

  // 3. Remove the common indentation from all strings.
  if (indentLengths.length) {
    const pattern = new RegExp(`\n[\t ]{${Math.min(...indentLengths)}}`, 'g')

    strings = strings.map((str) => str.replace(pattern, '\n'))
  }

  // 4. Remove leading whitespace.
  strings[0] = strings[0].replace(/^\r?\n/, '')

  // 5. Perform interpolation.
  let string = strings[0]

  values.forEach((value, i) => {
    // 5.1 Read current indentation level
    const endentations = string.match(/(?:^|\n)( *)$/)
    const endentation = endentations ? endentations[1] : ''
    let indentedValue = value

    // 5.2 Add indentation to values with multiline strings
    if (typeof value === 'string' && value.includes('\n')) {
      indentedValue = String(value)
        .split('\n')
        .map((str, i) => {
          return i === 0 ? str : `${endentation}${str}`
        })
        .join('\n')
    }

    string += indentedValue + strings[i + 1]
  })

  return string
}

// Used to map characters to HTML & JavaScript entities.
const escapes = {
  '`': '\\`',
  "'": "\\'",
  '/': '\\/',
  '{': '\\{',
  '}': '\\}'
}

// Used to match HTML entities and HTML characters.
const unescaped_regex = new RegExp(/[`'/{}]/g)

const escape = (s: string) =>
  s.replace(unescaped_regex, (char) => escapes[char])

/**
 * Walks the AST generated from `content`, replacing any instances of
 * elements with the `tag` attribute with HTML-escaped content.
 *
 * @param content {string} - The component source code.
 * @param filename {string} - The component filename.
 */
export const wrap = (
  tag: string,
  content: string,
  filename: string,
  highlight?: HighlightFunc
) => {
  // sax expects exactly one element, so just wrap it.
  const wrapped = '<div>' + content + '</div>'
  const s = new MagicString(content)

  // Start and end positions for replacement of re-built nodes.
  let start: number
  let end: number

  // Start and end positions of node text content.
  let content_start: number
  let content_end: number

  let current_tag = null

  // Tracks the current node's tag name, since sax either only uppercases
  // or lowercases the tag names during parsing.
  let tag_name = null

  parser.onerror = (err) => {
    throw err
  }

  parser.onopentag = (node) => {
    if (node.attributes[tag] === '' || node.attributes[tag] === tag) {
      if (current_tag !== null) {
        // We don't handle escaped elements that are nested.
        return
      }

      current_tag = parser.tag

      tag_name = wrapped.substring(
        parser.startTagPosition,
        parser.startTagPosition + parser.tag.name.length
      )

      start = parser.startTagPosition - 1 - 5
      content_start = parser.position
    }
  }

  parser.onclosetag = () => {
    if (parser.tag === current_tag) {
      let { name, attributes } = parser.tag

      name = tag_name
      tag_name = null
      current_tag = null
      end = parser.position - 5
      content_end = parser.startTagPosition - 1

      let content = dedent(wrapped.substring(content_start, content_end))

      let attrs = ''
      for (const prop in attributes) {
        if (prop !== tag) {
          attrs += ` ${prop}="${attributes[prop]}"`
        }
      }

      let text = `{\`${escape(content)}\` }`

      // If the component includes a `lang` specifier, first run the highlighter
      // against the code before building the node.
      const lang = attributes['lang']
      if (highlight && typeof lang !== 'undefined') {
        content = highlight(content, lang)
        text = `{@html \`${escape(content)}\` }`
      }

      const node_string = `<${name}${attrs}>${text}</${name}>`
      s.overwrite(start, end, node_string)
    }
  }

  parser.write(wrapped).close()

  return {
    code: s.toString(),
    map: s.generateMap({
      file: filename
    })
  }
}

const process = (opts: Options) => {
  opts = { ...default_opts, ...opts }

  return {
    markup: async ({ content, filename }) => {
      const fullext = '.' + filename.split('.').slice(1).join('.')

      if (!opts.extensions.includes(fullext)) {
        return {
          code: content
        }
      }

      return wrap(opts.tag, content, filename, opts.highlighter)
    }
  }
}

export default process
