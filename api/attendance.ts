import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const client = await db.connect();
    try {
        const { date, presentStudentIds } = req.body;
        if (!date || !Array.isArray(presentStudentIds)) {
            return res.status(400).json({ error: 'Date and presentStudentIds array are required' });
        }

        // The `@vercel/postgres` sql tag requires array to be formatted as a string literal for TEXT[] columns.
        const presentStudentIdsPgArray = `{${presentStudentIds.join(',')}}`;

        const result = await client.sql`
            INSERT INTO attendance_records (date, present_student_ids)
            VALUES (${date}, ${presentStudentIdsPgArray})
            ON CONFLICT (date) DO UPDATE
            SET present_student_ids = EXCLUDED.present_student_ids
            RETURNING *;
        `;
        
        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
}
