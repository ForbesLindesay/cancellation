var Promise = require('promise');
var tokenSource = require('../');
var assert = require('better-assert');

function delay(timeout, cancellationToken) {
  cancellationToken = cancellationToken || tokenSource.empty;
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, timeout);
    cancellationToken.onCancelled(reject);
  });
}
function delay2(timeout, cancellationToken) {
  cancellationToken = cancellationToken || tokenSource.empty;
  return new Promise(function (resolve, reject) {
    setTimeout(resolve, timeout);
    setTimeout(function () {
      if (cancellationToken.isCancelled())
        reject(new Error('Operation Cancelled'));
    }, timeout / 4);
  });
}
function delay3(timeout, cancellationToken) {
  cancellationToken = cancellationToken || tokenSource.empty;
  return delay(timeout/4)
    .then(function () {
      cancellationToken.throwIfCancelled();
      return delay(timeout/4);
    })
    .then(function () {
      cancellationToken.throwIfCancelled();
      return delay(timeout/4);
    })
    .then(function () {
      cancellationToken.throwIfCancelled();
      return delay(timeout/4);
    });
}

function cascade(cancellationToken) {
  return delay(500, cancellationToken)
    .then(function () {
      return delay(500, cancellationToken);
    })
    .then(function () {
      return delay(500, cancellationToken);
    });
}

describe('Default token source', function () {
  it('doesn\'t get cancelled', function () {
    return delay(10);
  });
});

describe('Cancelling with a token', function () {
  it('rejects the promise in the next turn of the event loop', function () {
    var source = tokenSource();
    var waitedTillNextTurn = false;
    var timeout;
    source.cancel('Test Cancel');
    waitedTillNextTurn = true;
    timeout = setTimeout(function () {
      throw new Error('Didn\'t cancel fast enough');
    }, 100);

    return delay(20000, source.token)
      .then(function () {
        throw new Error('Should\'ve been cancelled');
      }, function (reason) {
        assert(waitedTillNextTurn);
        assert(reason instanceof Error);
        assert(reason.message === 'Test Cancel');
        assert(reason.code === 'OperationCancelled');
        clearTimeout(timeout);
      });
  });

  it('does not call an unregistered cancellation listener', function (callback) {
    var source = tokenSource();
    var timeout = setTimeout(callback, 100)
    var listener = function () {
      callback(new Error('Should not have been called'))
    }
    var unregister = source.token.onCancelled(listener)
    unregister()
    source.cancel()
  })

  it('does not call a cancellation listener unregistered between ' +
      'cancellation and async listener calls', function (callback) {
    var source = tokenSource();
    var timeout = setTimeout(callback, 100)
    var listener = function () {
      callback(new Error('Should not have been called'))
    }
    var unregister = source.token.onCancelled(listener)
    source.cancel()
    unregister()
  })

  it('does not call a cancellation listener registered and unregistered between ' +
      'cancellation and async listener calls', function (callback) {
    var source = tokenSource();
    var timeout = setTimeout(callback, 100)
    var listener = function () {
      callback(new Error('Should not have been called'))
    }
    source.cancel()
    var unregister = source.token.onCancelled(listener)
    unregister()
  })
});

describe('Polling for cancellation', function () {
  describe('using `.isCancelled()`', function () {
    it('works', function () {
      var source = tokenSource();
      var timeout;
      source.cancel('Test Cancel');
      timeout = setTimeout(function () {
        throw new Error('Didn\'t cancel fast enough');
      }, 30);
      return delay2(40, source.token)
        .then(function () {
          throw new Error('Should\'ve been cancelled');
        }, function (reason) {
          clearTimeout(timeout);
        });
    });
  });
  describe('using `.throwIfCancelled()`', function () {
    it('works', function () {
      var source = tokenSource();
      var timeout;
      source.cancel('Test Cancel');
      timeout = setTimeout(function () {
        throw new Error('Didn\'t cancel fast enough');
      }, 30);
      return delay3(40, source.token)
        .then(function () {
          throw new Error('Should\'ve been cancelled');
        }, function (reason) {
          clearTimeout(timeout);
        });
    });
  });
});

describe('Cascading cancellation', function () {
  it('works', function () {
    var source = tokenSource();
    var waitedTillNextTurn = false;
    var timeout;
    source.cancel('Test Cancel');
    waitedTillNextTurn = true;
    timeout = setTimeout(function () {
      throw new Error('Didn\'t cancel fast enough');
    }, 20);
    return cascade(source.token)
      .then(function () {
        throw new Error('Should\'ve been cancelled');
      }, function (reason) {
        assert(waitedTillNextTurn);
        assert(reason instanceof Error);
        assert(reason.message === 'Test Cancel');
        assert(reason.code === 'OperationCancelled');
        clearTimeout(timeout);
      });
  });
});
