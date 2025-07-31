import { sql } from '@vercel/postgres';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DEFAULT_PASSWORD } from './constants.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { password: submittedPassword } = req.body;

        const settingsResult = await sql`SELECT value FROM settings WHERE key = 'main';`;
        
        let correctPassword = DEFAULT_PASSWORD;
        if(settingsResult.rows.length > 0) {
            correctPassword = (settingsResult.rows[0].value as any).password || DEFAULT_PASSWORD;
        }

        if (submittedPassword === correctPassword) {
            // Update lastLogin time
            const now = new Date().toISOString();
            await sql`
              UPDATE settings 
              SET value = value || ${JSON.stringify({ lastLogin: now })}::jsonb
              WHERE key = 'main';
            `;
            return res.status(200).json({ success: true });
        } else {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }
    } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
    }
}
