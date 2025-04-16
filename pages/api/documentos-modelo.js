import { connectToDatabase } from '../../dbconfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {

    const pool = await connectToDatabase();
    const query = `
      SELECT CIDDOCUMENTODE, CDESCRIPCION 
      FROM admDocumentosModelo 
      WHERE CIDDOCUMENTODE = 34 ;
    `;

    const result = await pool.request().query(query);

    const movimientos = result.recordset;

    res.status(200).json(movimientos);
  } catch (error) {
    console.error('Error al obtener tipos de movimientos:', error);
    res
      .status(500)
      .json({ message: 'Error al obtener tipos de movimientos', error });
  }
}
