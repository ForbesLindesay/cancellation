module.exports = tokenSource;
module.exports.empty = tokenSource().token;

function tokenSource() {
  var data = {
    reason: null,
    isCancelled: false,
    listeners: []
  };
  function cancel(reason) {
    data.isCancelled = true;
    reason = reason || 'Operation Cancelled';
    if (typeof reason == 'string') reason = new Error(reason);
    reason.code = 'OperationCancelled';
    data.reason = reason;
    setTimeout(function () {
      for (var i = 0; i < data.listeners.length; i++) {
        if (typeof data.listeners[i] === 'function') {
          data.listeners[i](reason);
        }
      }
    }, 0);
  }
  return {
    cancel: cancel,
    token: token(data)
  };
}

function token(data) {
  var exports = {};
  exports.isCancelled = isCancelled;
  function isCancelled() {
    return data.isCancelled;
  }
  exports.throwIfCancelled = throwIfCancelled;
  function throwIfCancelled() {
    if (isCancelled()) {
      throw data.reason;
    }
  }
  exports.onCancelled = onCancelled;
  function onCancelled(cb) {
    if (isCancelled()) {
      var listener = function () {
        cb(data.reason);
      }
      var timeout = setTimeout(listener, 0);
      return function () {
        clearTimeout(timeout)
      }
    } else {
      data.listeners.push(cb);
      return function () {
        var index = data.listeners.indexOf(cb)
        if (index > -1) {
          data.listeners.splice(index, 1)
        }
      }
    }
  }
  return exports;
}
