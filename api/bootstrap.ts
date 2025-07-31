import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DEFAULT_PASSWORD } from './constants.js';

const initialStudents = [
    { id: 'S01', name: 'Amaan Shaik' },
    { id: 'S02', name: 'Veronika Ahongshangbam' },
    { id: 'S03', name: 'Diana Prince' },
    { id: 'S04', name: 'Arjun Reddy' },
    { id: 'S05', name: 'Danish R' },
    { id: 'S06', name: 'Salman Khan' },
    { id: 'S07', name: 'Riya Singh' },
];

async function createTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(10) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS attendance_records (
      date DATE PRIMARY KEY,
      present_student_ids TEXT[] NOT NULL
    );
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(50) PRIMARY KEY,
      value JSONB NOT NULL
    );
  `;
}

async function seedData() {
    // Seed students
    for (const student of initialStudents) {
        await sql`
            INSERT INTO students (id, name) 
            VALUES (${student.id}, ${student.name})
            ON CONFLICT (id) DO NOTHING;
        `;
    }

    // Seed default settings
    await sql`
        INSERT INTO settings (key, value)
        VALUES ('main', ${JSON.stringify({ password: DEFAULT_PASSWORD, theme: 'light' })})
        ON CONFLICT (key) DO NOTHING;
    `;
}


export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method === 'GET' && req.query.action === 'setup') {
            await createTables();
            await seedData();
            return res.status(200).json({ message: 'Database setup complete!' });
        }

        if (req.method === 'GET') {
            const studentsPromise = sql`SELECT * FROM students ORDER BY id;`;
            const attendancePromise = sql`SELECT * FROM attendance_records;`;
            const settingsPromise = sql`SELECT value FROM settings WHERE key = 'main';`;

            const [studentsResult, attendanceResult, settingsResult] = await Promise.all([studentsPromise, attendancePromise, settingsPromise]);

            const { rows: students } = studentsResult;
            const { rows: attendanceRecords } = attendanceResult;
            
            let settings = { theme: 'light' }; // Default safe settings
            if(settingsResult.rows.length > 0) {
                // Return only non-sensitive settings
                const { password, ...safeSettings } = settingsResult.rows[0].value as any;
                settings = safeSettings;
            }

            return res.status(200).json({ students, attendanceRecords, settings });
        }

        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
    }
}
