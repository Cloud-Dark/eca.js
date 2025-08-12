
// src/adapters/index.js
const MemoryAdapter = require('./memory');
const FileAdapter = require('./file');
const JsonAdapter = require('./json');
const RedisAdapter = require('./redis');
const PostgreSQLAdapter = require('./postgresql');

module.exports = {
  MemoryAdapter,
  FileAdapter,
  JsonAdapter,
  RedisAdapter,
  PostgreSQLAdapter,
};
