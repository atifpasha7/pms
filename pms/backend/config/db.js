// config/db.js
// Oracle 23ai Free — connection pool initialisation + reusable query helpers.
// All application code should use execute() or executeTransaction() — never
// acquire raw connections directly.

'use strict';

const oracledb = require('oracledb');

// ─── Thin mode — no Oracle Client libraries required ─────────────────────────
// Must be set before any other oracledb call.
oracledb.initOracleClient = undefined; // explicit no-op (thin mode default in v6)

// ─── Global defaults ──────────────────────────────────────────────────────────
oracledb.outFormat      = oracledb.OUT_FORMAT_OBJECT; // rows as {COL: val} objects
oracledb.autoCommit     = false;                      // we manage commits explicitly
oracledb.fetchAsString  = [oracledb.CLOB];            // auto-convert CLOB → string
oracledb.prefetchRows   = 100;                        // tuning: fetch 100 rows/round-trip
oracledb.fetchArraySize = 100;

// Pool reference — populated by initPool()
let _pool = null;

// =============================================================================
// initPool()
// Called once during server startup. Creates the Oracle connection pool.
// Throws on failure so the server does not start with a broken DB connection.
// =============================================================================
async function initPool() {
  try {
    _pool = await oracledb.createPool({
      user:             process.env.DB_USER,
      password:         process.env.DB_PASSWORD,
      connectString:    process.env.DB_CONNECT_STRING,

      // ── Pool sizing ──────────────────────────────────────────────────────
      poolMin:          2,    // always-open connections (no cold-start latency)
      poolMax:          10,   // max concurrent connections
      poolIncrement:    1,    // grow one at a time
      poolTimeout:      60,   // idle connection eviction after 60s
      queueTimeout:     6000, // throw after 6s waiting for a free connection
      poolPingInterval: 60,   // heartbeat to detect stale connections

      // ── Extras ───────────────────────────────────────────────────────────
      stmtCacheSize:    30,   // server-side statement cache size per connection
    });

    console.log('✓  Oracle 23ai connection pool created');
    console.log(`   Connect: ${process.env.DB_CONNECT_STRING}  |  User: ${process.env.DB_USER}`);
    console.log(`   Pool: min=${_pool.poolMin}  max=${_pool.poolMax}`);
    return _pool;
  } catch (err) {
    console.error('✗  Failed to create Oracle connection pool:', err.message);
    throw err;
  }
}

// =============================================================================
// closePool()
// Graceful shutdown — drains the pool before process exits.
// =============================================================================
async function closePool() {
  if (_pool) {
    try {
      await _pool.close(10); // drain timeout = 10 s
      console.log('✓  Oracle connection pool closed');
    } catch (err) {
      console.error('✗  Error closing Oracle pool:', err.message);
    }
  }
}

// =============================================================================
// execute(sql, binds, opts)
// Executes a single SQL statement using a pooled connection.
//
// Parameters:
//   sql   — parameterized SQL string (use :name bind syntax)
//   binds — object of bind variables  { name: value }
//   opts  — oracledb execute options override
//
// Returns the raw oracledb result object:
//   { rows, rowsAffected, outBinds, lastRowid, ... }
//
// For SELECT: result.rows → array of row objects
// For DML:    result.rowsAffected, result.outBinds (RETURNING clause)
// =============================================================================
async function execute(sql, binds = {}, opts = {}) {
  if (!_pool) throw new Error('Database pool not initialised. Call initPool() first.');

  const defaultOpts = {
    outFormat:  oracledb.OUT_FORMAT_OBJECT,
    autoCommit: false,
  };

  const connection = await _pool.getConnection();

  try {
    const result = await connection.execute(sql, binds, { ...defaultOpts, ...opts });
    if (opts.autoCommit !== false) {
      await connection.commit();
    }
    return result;
  } catch (err) {
    // Re-throw with enriched context for the error handler
    err.sql    = sql.slice(0, 200); // first 200 chars for debugging
    err.binds  = sanitizeBindsForLog(binds);
    throw err;
  } finally {
    await connection.close(); // always return connection to pool
  }
}

// =============================================================================
// executeTransaction(queries)
// Executes multiple SQL statements in a single ACID transaction.
// Rolls back automatically on any error.
//
// queries: Array of { sql, binds, opts } objects.
// Returns: Array of result objects corresponding to each query.
// =============================================================================
async function executeTransaction(queries) {
  if (!_pool) throw new Error('Database pool not initialised.');
  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error('executeTransaction requires a non-empty array of query objects.');
  }

  const connection = await _pool.getConnection();
  const results    = [];

  try {
    for (const q of queries) {
      const result = await connection.execute(
        q.sql,
        q.binds || {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT, autoCommit: false, ...(q.opts || {}) }
      );
      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (err) {
    await connection.rollback();
    err.transactionFailed = true;
    err.sql = queries.map(q => q.sql.slice(0, 100)).join(' | ');
    throw err;
  } finally {
    await connection.close();
  }
}

// =============================================================================
// executeMany(sql, bindsArray, opts)
// Bulk DML using oracledb executeMany — significantly faster than looping execute().
// =============================================================================
async function executeMany(sql, bindsArray, opts = {}) {
  if (!_pool) throw new Error('Database pool not initialised.');

  const connection = await _pool.getConnection();

  try {
    const result = await connection.executeMany(sql, bindsArray, {
      autoCommit: true,
      ...opts,
    });
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// =============================================================================
// getPool()
// Returns the raw pool reference for advanced use cases.
// =============================================================================
function getPool() {
  if (!_pool) throw new Error('Database pool not initialised.');
  return _pool;
}

// =============================================================================
// healthCheck()
// Runs a trivial query to verify the DB is reachable.
// Used by GET /api/health endpoint.
// =============================================================================
async function healthCheck() {
  const result = await execute(
    'SELECT SYSDATE AS db_time, SYS_CONTEXT(\'USERENV\',\'DB_NAME\') AS db_name FROM DUAL',
    {},
    { autoCommit: true }
  );
  return result.rows[0];
}

// =============================================================================
// Helpers (internal)
// =============================================================================

/**
 * Strips sensitive bind values (passwords) before logging.
 * Keeps keys visible for debugging; replaces values with ***
 */
function sanitizeBindsForLog(binds) {
  const safe = {};
  const SENSITIVE = ['password', 'passwordHash', 'password_hash', 'newPassword'];
  for (const [k, v] of Object.entries(binds)) {
    safe[k] = SENSITIVE.includes(k) ? '***' : v;
  }
  return safe;
}

module.exports = {
  initPool,
  closePool,
  execute,
  executeTransaction,
  executeMany,
  getPool,
  healthCheck,
};
