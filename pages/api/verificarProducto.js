import { sql, connectToDatabase } from '../../dbconfig';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { numeroPedido, codigoProducto } = req.query;

    if (!numeroPedido || !codigoProducto) {
        return res.status(400).json({ message: 'Faltan parámetros' });
    }

    try {
        const pool = await connectToDatabase();

        const result = await pool
            .request()
            .input('numeroPedido', sql.VarChar, numeroPedido)
            .input('codigoProducto', sql.VarChar, codigoProducto)
            .query(`
                SELECT COUNT(*) as existe
                FROM Pedidos p
                INNER JOIN admProductos a ON p.Producto = a.CIDPRODUCTO
                WHERE p.NumeroPedido = @numeroPedido AND a.CCODIGOPRODUCTO = @codigoProducto
            `);

        res.status(200).json({ existe: result.recordset[0].existe > 0 });
    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
}
