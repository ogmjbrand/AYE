import react from '@vitejs/plugin-react'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/**
 * Files in public/assets/private (the Character Creator 5 character, models
 * whose licence lets you play with them but not share them) are served by
 * the dev server, but a production build would publish them with the site.
 * They're left out of builds unless AYE_INCLUDE_PRIVATE=1 is set for a
 * build that stays on your own machine. The game falls back to the built-in
 * looks and shapes when they're missing.
 */
function keepPrivateAssetsOut(): Plugin {
  let outDir = 'dist'
  return {
    name: 'aye-keep-private-assets-out',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir },
    closeBundle() {
      if (process.env.AYE_INCLUDE_PRIVATE === '1') return
      const dir = join(outDir, 'assets', 'private')
      if (!existsSync(dir)) return
      for (const name of readdirSync(dir)) if (name !== 'README.md') rmSync(join(dir, name), { recursive: true, force: true })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), keepPrivateAssetsOut()],
  // Relative asset URLs so the build also works from a sub-path or a static preview host
  base: './',
})
