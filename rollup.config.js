import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import nodePolyfills from "rollup-plugin-node-polyfills";

export default [
  {
    input: "src/koii-core/index.js",
    output: {
      file: "dist/koii-core.js",
      format: "cjs"
    },
    plugins: [resolve({ preferBuiltins: false }), commonjs(), nodePolyfills()]
  },

  {
    input: "src/attention/index.js",
    output: {
      file: "dist/attention.js",
      format: "cjs"
    },
    plugins: [resolve({ preferBuiltins: false }), commonjs(), nodePolyfills()]
  }
];
