import { neon } from '@neondatabase/serverless';

// Vercel의 새 Neon 통합은 DATABASE_URL (pooled) 을 주입합니다.
// fullResults: true 로 설정하면 결과가 { rows, rowCount, ... } 형태로 와서
// 기존 코드의 `const { rows } = await sql\`...\`` 패턴과 호환됩니다.
export const sql = neon(process.env.DATABASE_URL, { fullResults: true });
