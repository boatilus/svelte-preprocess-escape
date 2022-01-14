import MagicString from 'magic-string'
import sax from 'sax'
import builder from 'xmlbuilder'

interface Options {
  tag: string
  extensions: string[]
}

const default_opts = {
  tag: 'escape-content',
  extensions: ['.svelte']
}

const parser = sax.parser(false, {
  lowercase: true,
  position: true
})

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

/**
 * Wrap walks the AST generated from `content`, replacing any instances of
 * elements with the @escape attribute with HTML-escaped content.
 *
 * @param content {string} - The component source code.
 * @param filename {string} - The component filename.
 */
export const wrap = (tag: string, content: string, filename?: string) => {
  const wrapped = '<div>' + content + '</div>' // sax expects exactly one element.
  const s = new MagicString(content)

  // Start and end positions for replacement of re-built nodes.
  let start: number
  let end: number

  // Start and end positions of node text content.
  let content_start: number
  let content_end: number

  let current_tag = null

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
      start = parser.startTagPosition - 1 - 5
      content_start = parser.position
    }
  }

  parser.onclosetag = () => {
    if (parser.tag === current_tag) {
      const { name, attributes } = parser.tag

      current_tag = null
      end = parser.position - 5
      content_end = parser.startTagPosition - 1

      const content = wrapped.substring(content_start, content_end)

      const node = builder
        .create(name, { keepNullAttributes: true })
        .text(`{@html \`${dedent(content)}\` }`)

      for (const attr in attributes) {
        if (attr !== tag) {
          if (attr === attributes[attr]) {
            // sax decomposes single booleans.
            attributes[attr] = 'true'
          }

          node.attribute(attr, attributes[attr])
        }
      }

      const node_string = node.toString()
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

      const wrapped = wrap(opts.tag, content, filename)
      console.log(wrapped)

      return wrapped
    }
  }
}

export default process
