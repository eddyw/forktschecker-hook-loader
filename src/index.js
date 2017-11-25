import * as assert from 'assert'
import { getOptions } from 'loader-utils'
import * as validateOptions from 'schema-utils'
import * as util from 'util'

function locatePluginList(loader) {
  if (Array.isArray(loader.options.plugins)) {
    return loader.options.plugins
  } else if (typeof loader.options.plugins === 'function') {
    return loader.options.plugins()
  } else if (
    !loader.options.plugins &&
    loader._compiler &&
    loader._compiler.options &&
    loader._compiler.options.plugins
  ) {
    return loader._compiler.options.plugins
  }
}

function isTsForkChecker(plugin) {
  return plugin.constructor.name === 'ForkTsCheckerWebpackPlugin'
}

const webpackFormatMessage = message => ({
  rawMessage: `${message.getSeverity().toUpperCase()} ${message.getFormattedCode()}: ${message.getContent()}`,
  message: `(${message.getLine()},${message.getCharacter()}): ${message.getContent()}`,
  file: message.getFile(),
  location: {
    line: message.getLine(),
    character: message.getCharacter(),
  },
})

const inlineLineFormatMessage = message => ({
  rawMessage: `${message.getSeverity().toUpperCase()} ${message.getFormattedCode()}: ${message.getContent()}`,
  message: `[${message.getType()}(${message.getCode()})]: ${message.getContent()}`,
  file: `${message.getFile()}:${message.getLine()}:${message.getCharacter()}`,
  location: {
    line: message.getLine(),
    character: message.getCharacter(),
  },
})

const schema = {
  type: 'object',
  properties: {
    useEmitFormatter: {
      anyOf: [
        { type: 'boolean' },
        { type: 'string' },
      ],
    },
    emitInWatchMode: { type: 'boolean' },
  },
  additionalProperties: false,
}

let tsChecker = null
let pluginList = null
let formatter = null
let received = false

export default function NoEmitForkTsChecker(source, sourceMap) {
  const callback = this.async()
  const options = {
    /** @type {boolean|string} */
    useEmitFormatter: false,
    emitInWatchMode: false,
    ...(getOptions(this) || {}),
  }

  validateOptions(schema, options, 'NoEmitForkTsChecker-loader')

  const compiler = this._compiler
  const compilation = this._compilation
  const plugin = compiler.plugin.bind(compiler)
  const webpackOptions = compiler.options || {}

  pluginList = pluginList || locatePluginList(this)
  tsChecker = tsChecker || pluginList.filter(isTsForkChecker)[0]

  assert(!!tsChecker, `ForkTsCheckerWebpackPlugin was not found in the plugins list`)

  formatter = formatter || [
    [typeof options.useEmitFormatter === 'string', (
      options.useEmitFormatter === 'default'
        ? inlineLineFormatMessage
        : webpackFormatMessage
    )],
    [options.useEmitFormatter, tsChecker.formatter],
    [true, webpackFormatMessage],
  ].find(condition => condition[0])[1]

  const isWatchingMode = !!webpackOptions.watch
  const useColors = tsChecker.useColors

  const emit = {
    warn: message => compilation.warnings.push(message),
    error: message => compilation.errors.push(message),
  }

  if (!received) {
    received = true
    plugin('fork-ts-checker-receive', (diagnostics, lints) => {
      let hasErrors = false
      let hasErrorDiagnostics = false
      let hasErrorLints = false
      if (
        (isWatchingMode && options.emitInWatchMode) ||
        !isWatchingMode
      ) {
        const messages = diagnostics.concat(lints)
        messages.forEach(message => {
          let formatted = null
          if (
            (formatter === webpackFormatMessage) ||
            (formatter === inlineLineFormatMessage)
          ) {
            formatted = formatter(message, useColors)
          } else {
            formatted = formatter(message, useColors)
              .replace('WARNING in ', '')
              .replace('ERROR in ', '')
          }
          if (message.isWarningSeverity()) {
            emit.warn(formatted)
          } else {
            hasErrors = true
            hasErrorDiagnostics = (hasErrorDiagnostics || message.getType() !== 'lint')
            hasErrorLints = (hasErrorLints || message.getType() === 'lint')
            emit.error(formatted)
          }
        })
      }
      if (hasErrors) {
        emit.error(
          [
            hasErrorDiagnostics ? 'diagnostics' : '',
            hasErrorLints ? 'lints' : '',
          ].filter(whiteSpace => whiteSpace !== '').join(' and '),
        )
      }
      callback(null, source, sourceMap)
      delete compiler._plugins['fork-ts-checker-receive']
    })
    plugin('fork-ts-checker-done', () => {
      received = false
      delete compiler._plugins['fork-ts-checker-receive']
      delete compiler._plugins['fork-ts-checker-done']
    })
  } else {
    callback(null, source, sourceMap)
  }

  return undefined

  let checkerReceiveCalled = false
  const checkerReceive = (diagnostics, lints) => {
    if (!checkerReceiveCalled) {
      checkerReceiveCalled = true
      const hasErrorDiagnostics = (
        diagnostics.find(message => message.isErrorSeverity())
      )
      const hasErrorLints = (
        (lints || []).find(message => message.isErrorSeverity())
      )
      if (hasErrorDiagnostics || hasErrorLints) {
        if (
          (isWatchingMode && options.emitInWatchMode) ||
          !isWatchingMode
        ) {
          const messages = diagnostics.concat(lints)
          messages.forEach((message, indx) => {
            const formatted = formatter(message, useColors)
            if (message.isWarningSeverity()) {
              emit.warn(formatted)
            } else {
              emit.error(formatted)
            }
          })
        }
        callback({
          message: 'Errors found',
        })
      } else {
        callback(null, source, sourceMap)
      }
    }
  }
  delete compiler._plugins['fork-ts-checker-emit']
  plugin('fork-ts-checker-receive', checkerReceive)
}

export const raw = true
