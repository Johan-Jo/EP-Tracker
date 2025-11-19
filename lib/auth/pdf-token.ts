// lib/auth/pdf-token.ts
import jwt from 'jsonwebtoken';

const PDF_EXPORT_SECRET = process.env.PDF_EXPORT_SECRET;

if (!PDF_EXPORT_SECRET) {
	throw new Error('PDF_EXPORT_SECRET is not set');
}

export type PdfRole = 'admin' | 'foreman' | 'finance';

export interface PdfTokenPayload {
	sub: string; // user id
	org_id: string;
	role: PdfRole;
}

export function createPdfToken(input: PdfTokenPayload): string {
	return jwt.sign(input, PDF_EXPORT_SECRET, {
		expiresIn: '5m', // short-lived token for PDF export
	});
}

export function verifyPdfToken(token: string): PdfTokenPayload | null {
	try {
		return jwt.verify(token, PDF_EXPORT_SECRET) as PdfTokenPayload;
	} catch {
		return null;
	}
}




