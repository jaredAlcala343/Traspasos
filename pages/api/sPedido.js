import { sql, connectToDatabase } from '../../dbconfig';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Método no permitido' });
    }

    const { numeroPedido } = req.query;

    if (!numeroPedido) {
        return res.status(400).json({ message: 'Número de pedido requerido' });
    }

    try {
        const pool = await connectToDatabase();

        // 1. Obtener todos los productos del pedido actual
        const pedidoResult = await pool
            .request()
            .input('numeroPedido', sql.VarChar, numeroPedido)
            .query(`
                SELECT p.*, ap.CNOMBREPRODUCTO, ap.CCODIGOPRODUCTO 
                FROM Pedidos p
                LEFT JOIN admProductos ap ON p.Producto = ap.CIDPRODUCTO
                WHERE p.NumeroPedido = @numeroPedido
                ORDER BY p.Producto
            `);

        // 2. Obtener datos base del primer registro (si existe)
        let datosBasePedido = null;
        if (pedidoResult.recordset.length > 0) {
            const primerRegistro = pedidoResult.recordset[0];
            datosBasePedido = {
                origen: primerRegistro.Origen,
                destino: primerRegistro.Destino,
                fechaCreacion: primerRegistro.FechaCreacion || primerRegistro.Fecha_Creacion,
                estatus: primerRegistro.Estatus || 'Activo'
            };
        }

        // 3. Obtener todos los movimientos relacionados con este pedido
        const movimientosResult = await pool
            .request()
            .input('numeroPedido', sql.VarChar, numeroPedido)
            .query(`
                SELECT 
                    m.CIDPRODUCTO,
                    SUM(m.CUNIDADES) AS TotalUnidades,
                    ap.CNOMBREPRODUCTO,
                    ap.CCODIGOPRODUCTO
                FROM admMovimientos m
                INNER JOIN admDocumentos d ON m.CIDDOCUMENTO = d.CIDDOCUMENTO
                INNER JOIN admProductos ap ON m.CIDPRODUCTO = ap.CIDPRODUCTO
                WHERE d.CFOLIO = @numeroPedido
                GROUP BY m.CIDPRODUCTO, ap.CNOMBREPRODUCTO, ap.CCODIGOPRODUCTO
                ORDER BY m.CIDPRODUCTO
            `);

        if (movimientosResult.recordset.length === 0) {
            return res.status(404).json({ message: 'No hay movimientos relacionados con este pedido' });
        }

        // 4. Procesar cada movimiento
        const operaciones = [];
        let cambiosRealizados = 0;

        for (const movimiento of movimientosResult.recordset) {
            const productoPedido = pedidoResult.recordset.find(p => p.Producto == movimiento.CIDPRODUCTO);

            if (!productoPedido) {
                // Crear nueva línea solo si tenemos datos base
                if (datosBasePedido) {
                    try {
                        const insertResult = await pool.request()
                            .input('numeroPedido', sql.VarChar, numeroPedido)
                            .input('productoId', sql.Int, movimiento.CIDPRODUCTO)
                            .input('unidades', sql.Int, movimiento.TotalUnidades)
                            .input('origen', sql.Int, datosBasePedido.origen)
                            .input('destino', sql.Int, datosBasePedido.destino)
                            .input('estatus', sql.VarChar, datosBasePedido.estatus)
                            .query(`
                                INSERT INTO Pedidos (
                                    NumeroPedido, 
                                    Producto, 
                                    Unidades,
                                    Origen,
                                    Destino,
                                    Fecha_Creacion,
                                    Estatus
                                ) VALUES (
                                    @numeroPedido,
                                    @productoId,
                                    @unidades,
                                    @origen,
                                    @destino,
                                    GETDATE(),
                                    @estatus
                                )
                            `);

                        if (insertResult.rowsAffected[0] > 0) {
                            cambiosRealizados++;
                            operaciones.push({
                                tipo: 'CREACION',
                                producto: {
                                    id: movimiento.CIDPRODUCTO,
                                    nombre: movimiento.CNOMBREPRODUCTO,
                                    unidades: movimiento.TotalUnidades
                                }
                            });
                        }
                    } catch (insertError) {
                        console.error(`Error al crear producto ${movimiento.CIDPRODUCTO}:`, insertError);
                        // Intentar con nombre alternativo de columna Fecha_Creacion
                        try {
                            const insertResult = await pool.request()
                                .input('numeroPedido', sql.VarChar, numeroPedido)
                                .input('productoId', sql.Int, movimiento.CIDPRODUCTO)
                                .input('unidades', sql.Int, movimiento.TotalUnidades)
                                .input('origen', sql.Int, datosBasePedido.origen)
                                .input('destino', sql.Int, datosBasePedido.destino)
                                .input('estatus', sql.VarChar, datosBasePedido.estatus)
                                .query(`
                                    INSERT INTO Pedidos (
                                        NumeroPedido, 
                                        Producto, 
                                        Unidades,
                                        Origen,
                                        Destino,
                                        Fecha_Creacion,
                                        Estatus
                                    ) VALUES (
                                        @numeroPedido,
                                        @productoId,
                                        @unidades,
                                        @origen,
                                        @destino,
                                        GETDATE(),
                                        @estatus
                                    )
                                `);

                            if (insertResult.rowsAffected[0] > 0) {
                                cambiosRealizados++;
                                operaciones.push({
                                    tipo: 'CREACION',
                                    producto: {
                                        id: movimiento.CIDPRODUCTO,
                                        nombre: movimiento.CNOMBREPRODUCTO,
                                        unidades: movimiento.TotalUnidades
                                    }
                                });
                            }
                        } catch (secondInsertError) {
                            console.error(`Error alternativo al crear producto ${movimiento.CIDPRODUCTO}:`, secondInsertError);
                            operaciones.push({
                                tipo: 'ERROR_CREACION',
                                producto: {
                                    id: movimiento.CIDPRODUCTO,
                                    error: secondInsertError.message
                                }
                            });
                        }
                    }
                } else {
                    operaciones.push({
                        tipo: 'ERROR_DATOS_BASE',
                        mensaje: 'No hay datos base para crear nueva línea'
                    });
                }
            } else if (
                productoPedido.Unidades != movimiento.TotalUnidades ||
                (productoPedido.CNOMBREPRODUCTO || '') != (movimiento.CNOMBREPRODUCTO || '')
            ) {
                // Actualizar línea existente
                try {
                    // Primero intentar con FechaModificacion
                    let updateResult;
                    try {
                        updateResult = await pool.request()
                            .input('numeroPedido', sql.VarChar, numeroPedido)
                            .input('productoId', sql.Int, movimiento.CIDPRODUCTO)
                            .input('unidades', sql.Int, movimiento.TotalUnidades)
                            .input('productoOriginal', sql.Int, productoPedido.Producto)
                            .query(`
                                UPDATE Pedidos
                                SET 
                                    Producto = @productoId,
                                    Unidades = @unidades,
                                    Fecha_creacion = GETDATE()
                                WHERE 
                                    NumeroPedido = @numeroPedido AND
                                    Producto = @productoOriginal
                            `);
                    } catch (firstUpdateError) {
                        console.error(`Primer intento de actualización falló, intentando con Fecha_Creacion`, firstUpdateError);
                        // Intentar con Fecha_Creacion si FechaModificacion falla
                        updateResult = await pool.request()
                            .input('numeroPedido', sql.VarChar, numeroPedido)
                            .input('productoId', sql.Int, movimiento.CIDPRODUCTO)
                            .input('unidades', sql.Int, movimiento.TotalUnidades)
                            .input('productoOriginal', sql.Int, productoPedido.Producto)
                            .query(`
                                UPDATE Pedidos
                                SET 
                                    Producto = @productoId,
                                    Unidades = @unidades,
                                    Fecha_Creacion = GETDATE()
                                WHERE 
                                    NumeroPedido = @numeroPedido AND
                                    Producto = @productoOriginal
                            `);
                    }

                    if (updateResult.rowsAffected[0] > 0) {
                        cambiosRealizados++;
                        operaciones.push({
                            tipo: 'ACTUALIZACION',
                            productoAnterior: {
                                id: productoPedido.Producto,
                                nombre: productoPedido.CNOMBREPRODUCTO,
                                unidades: productoPedido.Unidades
                            },
                            productoNuevo: {
                                id: movimiento.CIDPRODUCTO,
                                nombre: movimiento.CNOMBREPRODUCTO,
                                unidades: movimiento.TotalUnidades
                            }
                        });
                    }
                } catch (updateError) {
                    console.error(`Error al actualizar producto ${movimiento.CIDPRODUCTO}:`, updateError);
                    operaciones.push({
                        tipo: 'ERROR_ACTUALIZACION',
                        producto: {
                            id: movimiento.CIDPRODUCTO,
                            error: updateError.message
                        }
                    });
                }
            }
        }

        // 5. Obtener datos finales actualizados
        const [pedidoFinal, productosRelacionados] = await Promise.all([
            pool.request()
                .input('numeroPedido', sql.VarChar, numeroPedido)
                .query(`
                    SELECT p.*, ap.CNOMBREPRODUCTO, ap.CCODIGOPRODUCTO
                    FROM Pedidos p
                    LEFT JOIN admProductos ap ON p.Producto = ap.CIDPRODUCTO
                    WHERE p.NumeroPedido = @numeroPedido
                    ORDER BY p.Producto
                `),
            pool.request()
                .input('numeroPedido', sql.VarChar, numeroPedido)
                .query(`
                    SELECT 
                        m.CIDPRODUCTO,
                        SUM(m.CUNIDADES) AS CUNIDADES,
                        a.CNOMBREPRODUCTO,
                        a.CCODIGOPRODUCTO
                    FROM admMovimientos m
                    INNER JOIN admDocumentos d ON m.CIDDOCUMENTO = d.CIDDOCUMENTO
                    INNER JOIN admProductos a ON m.CIDPRODUCTO = a.CIDPRODUCTO
                    WHERE d.CFOLIO = @numeroPedido
                    GROUP BY m.CIDPRODUCTO, a.CNOMBREPRODUCTO, a.CCODIGOPRODUCTO
                    ORDER BY m.CIDPRODUCTO
                `)
        ]);

        res.status(200).json({
            pedido: pedidoFinal.recordset,
            productosRelacionados: productosRelacionados.recordset,
            operacionesRealizadas: operaciones,
            totalCambios: cambiosRealizados,
            mensaje: cambiosRealizados > 0
                ? `Pedido actualizado correctamente (${cambiosRealizados} cambios)`
                : 'El pedido ya estaba actualizado'
        });

    } catch (error) {
        console.error('Error en el proceso:', error);
        res.status(500).json({ 
            message: 'Error en el servidor',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}