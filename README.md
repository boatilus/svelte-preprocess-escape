# svelte-preprocess-escape

A [Svelte](https://github.com/sveltejs/svelte) preprocesor that allows escaping content within components or elements. In simpler terms: this lets you open a compiler escape hatch to render Svelte code within Svelte components. This is particularly useful for displaying example Svelte code (or whatever else you might want) within code blocks.

> __IMPORTANT__: The implementation here is pretty rough/experimental, hasn't been significantly dogfooded or tested, and was designed only to solve something within my own particular problem space. This may work reasonably well for you -- or not at all.

## Installing

```bash
npm install svelte-preprocess-escape --save-dev
```

Or, if you're using Yarn:

```bash
yarn add svelte-preprocess-escape --dev
```

## Basic Usage Example

```javascript
// svelte.config.js
import escape from 'svelte-preprocess-escape' // the preprocessor is default-exported
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // If using svelte-preprocess, ensure `escape()` precedes it in the
  // preprocessor list
  preprocess: [escape(), preprocess()],
  kit: {
    adapter: adapter(),
    target: '#svelte'
  },
  ...
}
```

```svelte
<!-- component.svelte -->
<h1>Regular Old Markup</h1>

<pre>
  <code escape-content>
    <script lang="ts">
      const f = () => {
        return true
      }
    </script>
  
    <style lang="scss">
      a {
        color: red;
      }
    </style>
  </code>
</pre>
```

In this example, since the `escape-content` attribute is present on the `<code>` element, the content therein will simply render as text, maintaining any indendation (thanks to `<pre>`). The preprocessor automatically dedents the content, so it renders as you'd expect.

Note that the preprocessor will simply ignore any nested instances of elements or components marked with `escape-content`, so there's no option to nest within them, nor is there an option to break out of them.

## Options

You can supply a few options as an object to the exported function:

| Property    | Type     | Default       | Description                                                                                                                                                                               |
|-------------|----------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| tag         | string   | escape-content | The attribute name to supply. E.g., <p __escape_content__></p>                                                                                                                            |
| extensions  | string[] | ['.svelte']   | The file extensions the preprocessor will be available to act on                                                                                                                          |
| highlighter | function |               | An optional highlighter function, useful for performing code highlighting on the escaped contents. Must conform to the signature `(code: string, filename?: string) => string` |

## Building

This project uses the [built-in packaging functionality of SvelteKit](https://kit.svelte.dev/docs#packaging) to generate the package code. To build outside of the usual package management environment:

```bash
git clone git@github.com:boatilus/svelte-preprocess-escape.git
cd svelte-preprocess-escape
npm install
npm package
```

This will produce a `/package` directory containing the TypeScript source transpiled to JavaScript, as well as a TypeScript definition file.

## License

[MIT](LICENSE.md)
