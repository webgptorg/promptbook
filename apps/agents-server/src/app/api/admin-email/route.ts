import { getMetadata } from '../../../database/getMetadata';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const adminEmail = await getMetadata('ADMIN_EMAIL');
        return NextResponse.json({ adminEmail });
    } catch (error) {
        console.error('Failed to get admin email:', error);
        return NextResponse.json({ adminEmail: 'support@ptbk.io' }, { status: 500 });
    }
}
