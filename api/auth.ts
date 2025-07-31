import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_PASSWORD } from '../constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const client = await db.connect();
        const { password: submittedPassword } = req.body;

        const settingsResult = await client.sql`SELECT value FROM settings WHERE key = 'main';`;
        let correctPassword = DEFAULT_PASSWORD;
        if(settingsResult.rows.length > 0) {
            correctPassword = (settingsResult.rows[0].value as any).password || DEFAULT_PASSWORD;
        }

        if (submittedPassword === correctPassword) {
            // Update lastLogin time
            const now = new Date().toISOString();
            await client.sql`
              UPDATE settings 
              SET value = value || ${JSON.stringify({ lastLogin: now })}::jsonb
              WHERE key = 'main';
            `;
            client.release();
            return res.status(200).json({ success: true });
        } else {
            client.release();
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
