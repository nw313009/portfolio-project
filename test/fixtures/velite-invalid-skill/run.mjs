// Runs the fixture Velite build in its own process. Intentionally not
// imported by any test directly: Velite's `strict: true` may itself call
// `process.exit(1)` on failure (see its docs), which would kill the Vitest
// worker if invoked in-process. Spawning this script as a subprocess (see
// content-validation.integration.test.ts) contains that to the child, and
// either path - a caught rejection or a raw `process.exit(1)` - ends this
// process with a non-zero exit code, which the test asserts on.
import { build } from "velite";

try {
  await build({ clean: true, logLevel: "silent" });
  process.stdout.write("BUILD_SUCCEEDED\n");
  process.exit(0);
} catch (error) {
  process.stderr.write(`BUILD_FAILED: ${error?.message ?? String(error)}\n`);
  process.exit(1);
}
