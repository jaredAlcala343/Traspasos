require('dotenv').config();
const sql = require('mssql');

const config = {
    user: process.env.DB_USER,  
    password: process.env.DB_PASSWORD,  
    server: process.env.DB_SERVER,  
    port: parseInt(process.env.DB_PORT),  
    database: process.env.DB_DATABASE,  
    options: {
        encrypt: false,  // Cambia a true si usas una conexión cifrada
        trustServerCertificate: true,  // Cambia según tus necesidades de seguridad
        connectTimeout: 3000,  // El tiempo máximo para conectar
    }
};

async function connectToDatabase() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to SQL Server');
        return pool;
    } catch (err) {
        console.error('Database Connection Failed! Bad Config: ', err);
        throw err;
    }
}

let poolPromise;

async function getPool() {
    if (!poolPromise) {
        try {
            poolPromise = await sql.connect(config);
            console.log('✅ Conectado a SQL Server');
        } catch (err) {
            console.error('❌ Error al conectar a SQL Server:', err);
            throw err;
        }
    }
    return poolPromise;
}


module.exports = { sql, connectToDatabase, getPool };
