"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var loader_utils_1 = require("loader-utils");
var validateOptions = require("schema-utils");
function locatePluginList(loader) {
    if (Array.isArray(loader.options.plugins)) {
        return loader.options.plugins;
    }
    else if (typeof loader.options.plugins === 'function') {
        return loader.options.plugins();
    }
    else if (!loader.options.plugins &&
        loader._compiler &&
        loader._compiler.options &&
        loader._compiler.options.plugins) {
        return loader._compiler.options.plugins;
    }
}
function isTsForkChecker(plugin) {
    return plugin.constructor.name === 'ForkTsCheckerWebpackPlugin';
}
var webpackFormatMessage = function (message) { return ({
    rawMessage: message.getSeverity().toUpperCase() + " " + message.getFormattedCode() + ": " + message.getContent(),
    message: "(" + message.getLine() + "," + message.getCharacter() + "): " + message.getContent(),
    file: message.getFile(),
    location: {
        line: message.getLine(),
        character: message.getCharacter(),
    },
}); };
var inlineLineFormatMessage = function (message) { return ({
    rawMessage: message.getSeverity().toUpperCase() + " " + message.getFormattedCode() + ": " + message.getContent(),
    message: "[" + message.getType() + "(" + message.getCode() + ")]: " + message.getContent(),
    file: message.getFile() + ":" + message.getLine() + ":" + message.getCharacter(),
    location: {
        line: message.getLine(),
        character: message.getCharacter(),
    },
}); };
var schema = {
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
};
var tsChecker = null;
var pluginList = null;
var formatter = null;
var received = false;
function NoEmitForkTsChecker(source, sourceMap) {
    var callback = this.async();
    var options = __assign({ 
        /** @type {boolean|string} */
        useEmitFormatter: false, emitInWatchMode: false }, (loader_utils_1.getOptions(this) || {}));
    validateOptions(schema, options, 'NoEmitForkTsChecker-loader');
    var compiler = this._compiler;
    var compilation = this._compilation;
    var plugin = compiler.plugin.bind(compiler);
    var webpackOptions = compiler.options || {};
    pluginList = pluginList || locatePluginList(this);
    tsChecker = tsChecker || pluginList.filter(isTsForkChecker)[0];
    assert(!!tsChecker, "ForkTsCheckerWebpackPlugin was not found in the plugins list");
    formatter = formatter || [
        [typeof options.useEmitFormatter === 'string', (options.useEmitFormatter === 'default'
                ? inlineLineFormatMessage
                : webpackFormatMessage)],
        [options.useEmitFormatter, tsChecker.formatter],
        [true, webpackFormatMessage],
    ].find(function (condition) { return condition[0]; })[1];
    var isWatchingMode = !!webpackOptions.watch;
    var useColors = tsChecker.useColors;
    var emit = {
        warn: function (message) { return compilation.warnings.push(message); },
        error: function (message) { return compilation.errors.push(message); },
    };
    if (!received) {
        received = true;
        plugin('fork-ts-checker-receive', function (diagnostics, lints) {
            var hasErrors = false;
            var hasErrorDiagnostics = false;
            var hasErrorLints = false;
            if ((isWatchingMode && options.emitInWatchMode) ||
                !isWatchingMode) {
                var messages = diagnostics.concat(lints);
                messages.forEach(function (message) {
                    var formatted = null;
                    if ((formatter === webpackFormatMessage) ||
                        (formatter === inlineLineFormatMessage)) {
                        formatted = formatter(message, useColors);
                    }
                    else {
                        formatted = formatter(message, useColors)
                            .replace('WARNING in ', '')
                            .replace('ERROR in ', '');
                    }
                    if (message.isWarningSeverity()) {
                        emit.warn(formatted);
                    }
                    else {
                        hasErrors = true;
                        hasErrorDiagnostics = (hasErrorDiagnostics || message.getType() !== 'lint');
                        hasErrorLints = (hasErrorLints || message.getType() === 'lint');
                        emit.error(formatted);
                    }
                });
            }
            if (hasErrors) {
                emit.error([
                    hasErrorDiagnostics ? 'diagnostics' : '',
                    hasErrorLints ? 'lints' : '',
                ].filter(function (whiteSpace) { return whiteSpace !== ''; }).join(' and '));
            }
            callback(null, source, sourceMap);
            delete compiler._plugins['fork-ts-checker-receive'];
        });
        plugin('fork-ts-checker-done', function () {
            received = false;
            delete compiler._plugins['fork-ts-checker-receive'];
            delete compiler._plugins['fork-ts-checker-done'];
        });
    }
    else {
        callback(null, source, sourceMap);
    }
    return undefined;
    var checkerReceiveCalled = false;
    var checkerReceive = function (diagnostics, lints) {
        if (!checkerReceiveCalled) {
            checkerReceiveCalled = true;
            var hasErrorDiagnostics = (diagnostics.find(function (message) { return message.isErrorSeverity(); }));
            var hasErrorLints = ((lints || []).find(function (message) { return message.isErrorSeverity(); }));
            if (hasErrorDiagnostics || hasErrorLints) {
                if ((isWatchingMode && options.emitInWatchMode) ||
                    !isWatchingMode) {
                    var messages = diagnostics.concat(lints);
                    messages.forEach(function (message, indx) {
                        var formatted = formatter(message, useColors);
                        if (message.isWarningSeverity()) {
                            emit.warn(formatted);
                        }
                        else {
                            emit.error(formatted);
                        }
                    });
                }
                callback({
                    message: 'Errors found',
                });
            }
            else {
                callback(null, source, sourceMap);
            }
        }
    };
    delete compiler._plugins['fork-ts-checker-emit'];
    plugin('fork-ts-checker-receive', checkerReceive);
}
exports.default = NoEmitForkTsChecker;
exports.raw = true;
