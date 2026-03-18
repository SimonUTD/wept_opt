const presetEnv = require.resolve('@babel/preset-env')
const transformOptionalChaining = require.resolve('@babel/plugin-transform-optional-chaining')
const transformObjectRestSpread = require.resolve('@babel/plugin-transform-object-rest-spread')

const presetEnvOptions = {
  loose: true,
  modules: false
}

exports.createBabelOptions = function createBabelOptions(options = {}) {
  const {
    sourceMaps = false,
    sourceFileName
  } = options

  return {
    presets: [[presetEnv, presetEnvOptions]],
    plugins: [transformOptionalChaining, transformObjectRestSpread],
    sourceMaps,
    sourceFileName,
    babelrc: false,
    configFile: false,
    ast: false
  }
}
