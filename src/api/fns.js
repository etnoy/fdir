const { sep } = require("path");
const fs = require("fs");

/* GET ARRAY */
module.exports.getArray = function(state) {
  return state.paths;
};
module.exports.getArrayGroup = function() {
  return [""].slice(0, 0);
};

/** PUSH FILE */
module.exports.pushFileFilterAndCount = function(filters) {
  return function(filename, _files, _dir, state) {
    if (filters.every((filter) => filter(filename, false)))
      state.counts.files++;
  };
};

module.exports.pushFileFilter = function(filters) {
  return function(filename, files) {
    if (filters.every((filter) => filter(filename, false)))
      files.push(filename);
  };
};

module.exports.pushFileCount = function(_filename, _files, _dir, state) {
  state.counts.files++;
};
module.exports.pushFile = function(filename, files) {
  files.push(filename);
};

/** PUSH DIR */
module.exports.pushDir = function(dirPath, paths) {
  paths.push(dirPath);
};

module.exports.pushDirFilter = function(filters) {
  return function(dirPath, paths) {
    if (filters.every((filter) => filter(dirPath, true))) {
      paths.push(dirPath);
    }
  };
};

/** JOIN PATH */
module.exports.joinPathWithBasePath = function(filename, dir) {
  return `${dir}${sep}${filename}`;
};
module.exports.joinPath = function(filename) {
  return filename;
};

/** WALK DIR */
module.exports.walkDirExclude = function(exclude) {
  return function(walk, state, path, dir, currentDepth, walkSingleDir) {
    if (!exclude(dir, path)) {
      module.exports.walkDir(
        walk,
        state,
        path,
        dir,
        currentDepth,
        walkSingleDir
      );
    }
  };
};

module.exports.walkDir = function(
  walk,
  state,
  path,
  _dir,
  currentDepth,
  walkSingleDir
) {
  state.counts.dirs++;
  walk(state, path, currentDepth, walkSingleDir);
};

/** GROUP FILES */
module.exports.groupFiles = function(dir, files, state) {
  state.counts.files += files.length;
  state.paths.push({ dir, files });
};
module.exports.empty = function() {};

/** CALLBACK INVOKER */
module.exports.callbackInvokerOnlyCountsSync = function(state) {
  return state.counts;
};
module.exports.callbackInvokerDefaultSync = function(state) {
  return state.paths;
};

module.exports.callbackInvokerOnlyCountsAsync = callbackInvokerBuilder(
  "counts"
);
module.exports.callbackInvokerDefaultAsync = callbackInvokerBuilder("paths");

function report(err, callback, output, suppressErrors) {
  if (err && !suppressErrors) callback(err, null);
  else callback(null, output);
}

function callbackInvokerBuilder(output) {
  return function(err, state) {
    report(err, state.callback, state[output], state.options.suppressErrors);
  };
}

/** SYMLINK RESOLVER */

module.exports.resolveSymlinksAsync = function(path, state, callback) {
  state.queue.queue();

  fs.realpath(path, (error, resolvedPath) => {
    if (error) {
      state.queue.dequeue(error, state);
      return;
    }

    fs.lstat(resolvedPath, (error, stat) => {
      if (error) {
        state.queue.dequeue(error, state);
        return;
      }

      callback(stat, resolvedPath);

      state.queue.dequeue(null, state);
    });
  });
};

module.exports.resolveSymlinksSync = function(path, _state, callback) {
  const resolvedPath = fs.realpathSync(path);
  const stat = fs.lstatSync(resolvedPath);
  callback(stat, resolvedPath);
};
