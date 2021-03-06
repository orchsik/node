'use strict';

// This test makes sure that `writeFile()` always writes from the current
// position of the file, instead of truncating the file, when used with file
// descriptors.

const common = require('../common');
const assert = require('assert');
const fs = require('fs');
const join = require('path').join;

const tmpdir = require('../common/tmpdir');
tmpdir.refresh();

{
  /* writeFileSync() test. */
  const filename = join(tmpdir.path, 'test.txt');

  /* Open the file descriptor. */
  const fd = fs.openSync(filename, 'w');

  /* Write only five characters, so that the position moves to five. */
  assert.deepStrictEqual(fs.writeSync(fd, 'Hello'), 5);
  assert.deepStrictEqual(fs.readFileSync(filename).toString(), 'Hello');

  /* Write some more with writeFileSync(). */
  fs.writeFileSync(fd, 'World');

  /* New content should be written at position five, instead of zero. */
  assert.deepStrictEqual(fs.readFileSync(filename).toString(), 'HelloWorld');

  /* Close the file descriptor. */
  fs.closeSync(fd);
}

{
  /* writeFile() test. */
  const file = join(tmpdir.path, 'test1.txt');

  /* Open the file descriptor. */
  fs.open(file, 'w', common.mustSucceed((fd) => {
    /* Write only five characters, so that the position moves to five. */
    fs.write(fd, 'Hello', common.mustSucceed((bytes) => {
      assert.strictEqual(bytes, 5);
      assert.deepStrictEqual(fs.readFileSync(file).toString(), 'Hello');

      /* Write some more with writeFile(). */
      fs.writeFile(fd, 'World', common.mustSucceed(() => {
        /* New content should be written at position five, instead of zero. */
        assert.deepStrictEqual(fs.readFileSync(file).toString(), 'HelloWorld');

        /* Close the file descriptor. */
        fs.closeSync(fd);
      }));
    }));
  }));
}


// Test read-only file descriptor
{
  // TODO(pd4d10): https://github.com/nodejs/node/issues/38607
  const expectedError = common.isWindows ? /EPERM/ : /EBADF/;

  const file = join(tmpdir.path, 'test.txt');

  fs.open(file, 'r', common.mustSucceed((fd) => {
    fs.writeFile(fd, 'World', common.expectsError(expectedError));
  }));
}

// Test with an AbortSignal
{
  const controller = new AbortController();
  const signal = controller.signal;
  const file = join(tmpdir.path, 'test.txt');

  fs.open(file, 'w', common.mustSucceed((fd) => {
    fs.writeFile(fd, 'World', { signal }, common.expectsError({
      name: 'AbortError'
    }));
  }));

  controller.abort();
}
