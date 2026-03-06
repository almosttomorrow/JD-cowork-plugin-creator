/**
 * Assembles the final result object from generated plugins.
 *
 * @param {Array<{name: string, files: Array<{path: string, content: string}>}>} plugins
 * @returns {{ plugins: Array }}
 */
export function packageResult(plugins) {
  return { plugins };
}
