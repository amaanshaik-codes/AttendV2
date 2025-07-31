import { db } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const client = await db.connect();
    try {
        const { password, theme } = req.body;

        // 1. Fetch current settings
        const settingsResult = await client.sql`SELECT value FROM settings WHERE key = 'main';`;
        if (settingsResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Settings not found. Please run setup first.' });
        }
        const currentSettings = settingsResult.rows[0].value as any;

        // 2. Merge new settings
        const newSettings = { ...currentSettings };
        if (password && typeof password === 'string' && password.length >= 6) {
            newSettings.password = password;
        }
        if (theme && (theme === 'light' || theme === 'dark')) {
            newSettings.theme = theme;
        }

        // 3. Write back the entire updated settings object
        await client.sql`
            UPDATE settings 
            SET value = ${JSON.stringify(newSettings)}
            WHERE key = 'main';
        `;
        
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        client.release();
    }
}