const sql = require('mssql');

const config = (() => {
  const base = {
    server: process.env.DB_SERVER || 'mac-sql-server.database.windows.net',
    database: process.env.DB_NAME || 'MAC-TASk-MANAGER',
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  };

  // If a DB_PASSWORD is provided, use SQL authentication
  if (process.env.DB_PASSWORD) {
    return { ...base, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  }

  // Otherwise, use Azure AD service principal authentication
  return {
    ...base,
    authentication: {
      type: 'azure-active-directory-service-principal-secret',
      options: {
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        tenantId: process.env.AZURE_TENANT_ID,
      },
    },
  };
})();

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

module.exports = { getPool, sql };
