import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { date, presentStudentIds } = req.body;
        if (!date || !Array.isArray(presentStudentIds)) {
            return res.status(400).json({ error: 'Date and presentStudentIds array are required' });
        }

        const result = await sql`
            INSERT INTO attendance_records (date, present_student_ids)
            VALUES (${date}, ${presentStudentIds as any})
            ON CONFLICT (date) DO UPDATE
            SET present_student_ids = EXCLUDED.present_student_ids
            RETURNING *;
        `;
        
        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
    }
}
