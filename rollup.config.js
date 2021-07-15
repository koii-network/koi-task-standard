import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import nodePolyfills from "rollup-plugin-node-polyfills";

export default [
  {
    input: "src/koi/index.js",
    output: {
      file: "dist/koi.js",
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
  },
  {
    input: "src/nft/index.js",
    output: {
      file: "dist/nft.js",
      format: "cjs"
    },
    plugins: [resolve({ preferBuiltins: false }), commonjs(), nodePolyfills()]
  },
  {
    input: "src/vault/index.js",
    output: {
      file: "dist/vault.js",
      format: "cjs"
    },
    plugins: [resolve({ preferBuiltins: false }), commonjs(), nodePolyfills()]
  },
  {
    input: "src/KID/index.js",
    output: {
      file: "dist/KID.js",
      format: "cjs"
    },
    plugins: [resolve({ preferBuiltins: false }), commonjs(), nodePolyfills()]
  },
  {
    input: "src/koi_task/index.js",
    output: {
      file: "dist/koi_task.js",
      format: "cjs"
    },
    plugins: [resolve({ preferBuiltins: false }), commonjs(), nodePolyfills()]
  },
  {
    input: "src/attentionM/index.js",
    output: {
      file: "dist/attentionM.js",
      format: "cjs"
    },
    plugins: [resolve({ preferBuiltins: false }), commonjs(), nodePolyfills()]
  }
];
