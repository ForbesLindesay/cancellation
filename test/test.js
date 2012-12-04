var promise = require('promises-a');
var tokenSource = require('../');
var assert = require('better-assert');

function delay(timeout, cancellationToken) {
  cancellationToken = cancellationToken || tokenSource.empty;
  var def = promise();
  setTimeout(function () {
    def.fulfill();
  }, timeout);
  cancellationToken
    .onCancelled(function (reason) {
      def.reject(reason);
    });
  return def.promise;
}
function delay2(timeout, cancellationToken) {
  cancellationToken = cancellationToken || tokenSource.empty;
  var def = promise();
  setTimeout(function () {
    def.fulfill();
  }, timeout);
  setTimeout(function () {
    if (cancellationToken.isCancelled()) 
      def.reject(new Error('Operation Cancelled'));
  }, timeout / 4);
  return def.promise;
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
  it('doesn\'t get cancelled', function (done) {
    delay(10)
      .done(done, function (reason) {
        if (reason) done(reason);
        else done(new Error('Should not have been cancelled.'));
      });
  });
});

describe('Cancelling with a token', function () {
  it('rejects the promise in the next turn of the event loop', function (done) {
    var source = tokenSource();
    var waitedTillNextTurn = false;
    var timeout;
    delay(20000, source.token)
      .done(function () {
        done(new Error('Should\'ve been cancelled'));
      }, function (reason) {
        assert(waitedTillNextTurn);
        assert(reason instanceof Error);
        assert(reason.message === 'Test Cancel');
        assert(reason.code === 'OperationCancelled');
        clearTimeout(timeout);
        done();
      });
    source.cancel('Test Cancel');
    waitedTillNextTurn = true;
    timeout = setTimeout(function () {
      done(new Error('Didn\'t cancel fast enough'));
    }, 10);
  });
});

describe('Polling for cancellation', function () {
  describe('using `.isCancelled()`', function () {
    it('works', function (done) {
      var source = tokenSource();
      var timeout;
      delay2(40, source.token)
        .done(function () {
          done(new Error('Should\'ve been cancelled'));
        }, function (reason) {
          clearTimeout(timeout);
          done();
        });
      source.cancel('Test Cancel');
      timeout = setTimeout(function () {
        done(new Error('Didn\'t cancel fast enough'));
      }, 30);
    });
  });
  describe('using `.throwIfCancelled()`', function () {
    it('works', function (done) {
      var source = tokenSource();
      var timeout;
      delay3(40, source.token)
        .done(function () {
          done(new Error('Should\'ve been cancelled'));
        }, function (reason) {
          clearTimeout(timeout);
          done();
        });
      source.cancel('Test Cancel');
      timeout = setTimeout(function () {
        done(new Error('Didn\'t cancel fast enough'));
      }, 30);
    });
  });
});

describe('Cascading cancellation', function () {
  it('works', function (done) {
    var source = tokenSource();
    var waitedTillNextTurn = false;
    var timeout;
    cascade(source.token)
      .done(function () {
        done(new Error('Should\'ve been cancelled'));
      }, function (reason) {
        assert(waitedTillNextTurn);
        assert(reason instanceof Error);
        assert(reason.message === 'Test Cancel');
        assert(reason.code === 'OperationCancelled');
        clearTimeout(timeout);
        done();
      });
    source.cancel('Test Cancel');
    waitedTillNextTurn = true;
    timeout = setTimeout(function () {
      done(new Error('Didn\'t cancel fast enough'));
    }, 10);
  });
});