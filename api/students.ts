import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const client = await db.connect();

    try {
        if (req.method === 'POST') {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'Name is required' });

            // Generate new ID
            const lastIdResult = await client.sql`SELECT id FROM students ORDER BY id DESC LIMIT 1;`;
            const lastId = lastIdResult.rows[0]?.id || 'S00';
            const newIdNumber = parseInt(lastId.substring(1), 10) + 1;
            const newId = `S${String(newIdNumber).padStart(2, '0')}`;
            
            const result = await client.sql`
                INSERT INTO students (id, name, created_at) 
                VALUES (${newId}, ${name}, NOW()) 
                RETURNING *;`;
            
            return res.status(201).json(result.rows[0]);
        }
        
        if (req.method === 'PUT') {
             const { id, newName } = req.body;
             if (!id || !newName) return res.status(400).json({ error: 'ID and new name are required' });

             await client.sql`UPDATE students SET name = ${newName} WHERE id = ${id};`;
             return res.status(200).json({ success: true });
        }

        if (req.method === 'DELETE') {
            const { id } = req.body;
            if (!id) return res.status(400).json({ error: 'ID is required' });

            await client.sql`DELETE FROM students WHERE id = ${id};`;
            // Also remove from attendance records
            await client.sql`
                UPDATE attendance_records
                SET present_student_ids = array_remove(present_student_ids, ${id});
            `;
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method Not Allowed' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
}
