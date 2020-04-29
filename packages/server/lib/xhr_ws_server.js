"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = __importDefault(require("lodash"));
var bluebird_1 = __importDefault(require("bluebird"));
var debug_1 = __importDefault(require("debug"));
var debug = debug_1.default('cypress:server:xhr_ws_server');
function trunc(str) {
    return lodash_1.default.truncate(str, {
        length: 100,
        omission: '... [truncated to 100 chars]',
    });
}
function create() {
    var incomingXhrResponses = {};
    function onIncomingXhr(id, data) {
        debug('onIncomingXhr %o', { id: id, res: trunc(data) });
        var deferred = incomingXhrResponses[id];
        if (deferred && typeof deferred !== 'string') {
            // request came before response, resolve with it
            return deferred.resolve(data);
        }
        // response came before request, cache the data
        incomingXhrResponses[id] = data;
    }
    function getDeferredResponse(id) {
        debug('getDeferredResponse %o', { id: id });
        // if we already have it, send it
        var res = incomingXhrResponses[id];
        if (res) {
            if (typeof res === 'object') {
                debug('returning existing deferred promise for %o', { id: id, res: res });
                return res.promise;
            }
            debug('already have deferred response %o', { id: id, res: trunc(res) });
            delete incomingXhrResponses[id];
            return res;
        }
        var deferred = {};
        deferred.promise = new bluebird_1.default(function (resolve, reject) {
            debug('do not have response, waiting %o', { id: id });
            deferred.resolve = resolve;
            deferred.reject = reject;
        })
            .tap(function (res) {
            debug('deferred response found %o', { id: id, res: trunc(res) });
        });
        incomingXhrResponses[id] = deferred;
        return deferred.promise;
    }
    function reset() {
        debug('resetting incomingXhrs %o', { incomingXhrResponses: incomingXhrResponses });
        lodash_1.default.forEach(incomingXhrResponses, function (res) {
            if (typeof res !== 'string') {
                var err = new Error('This stubbed XHR was pending on a stub response object from the driver, but the test ended before that happened.');
                err.testEndedBeforeResponseReceived = true;
                res.reject(err);
            }
        });
        incomingXhrResponses = {};
    }
    return {
        onIncomingXhr: onIncomingXhr,
        getDeferredResponse: getDeferredResponse,
        reset: reset,
    };
}
exports.create = create;
