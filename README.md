# svelte-preprocess-escape

A preprocesor that allows for the escaping of content within components or elements. In simpler terms: this lets you display Svelte code within Svelte components. This is particularly useful for displaying example Svelte code within code blocks.

## Installing

```bash
npm install svelte-transition-extras --save
```

Or, if you're using Yarn:

```bash
yarn add svelte-transition-extras
```

## Example

```svelte
// svelte.config.js
import escape from 'svelte-preprocess-escape'
import preprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // If using svelte-preprocess, ensure `escape()` precedes it in the
  // preprocessor list.
  preprocess: [escape(), preprocess()],
  kit: {
    adapter: adapter(),
    target: '#svelte'
  },
  ...
}

// component.svelte
<h1>Regular Old Markup</h1>

<pre>
  <code escape-content>
    <style lang="scss">
      a {
        color: red;
      }
    </style>

    <script lang="ts">
      const f = () => {
        return true
      }
    </script>
  </code>
</pre>
```

In this example, the content in the `<code>` element will simply render as text, maintaining any indendation. The preprocessor automatically dedents the content so it renders as you'd expect.
