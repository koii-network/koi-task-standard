import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import nodePolyfills from "rollup-plugin-node-polyfills";

export default [

  {
    input: "src/thumbnail/index.js",
    output: {
      file: "dist/thumbnail.js",
      format: "cjs"
    },
    plugins: [resolve({ preferBuiltins: false }), commonjs(), nodePolyfills()]
  }
];
