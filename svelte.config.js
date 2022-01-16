import adapter from '@sveltejs/adapter-auto'
import preprocess from 'svelte-preprocess'
import escape from './package/escape.js'
// import shiki from 'shiki'

// const highlighter = await shiki.getHighlighter({ theme: 'nord' })

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: [
    escape({
      // highlighter: highlighter.codeToHtml
    }),
    preprocess()
  ],
  kit: {
    adapter: adapter(),
    target: '#svelte'
  }
}

export default config
