import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Single source of truth for the app's cryptographic secret.
 *
 * This value is used both as the JWT signing key (auth) and as the key material
 * for encrypting stored service credentials (utils/crypto.ts). Historically it
 * fell back to a hard-coded literal that shipped in the public repo, which meant
 * anyone could forge an admin token or decrypt a stolen config.json.
 *
 * Resolution order (fail-closed, zero-config for homelab installs):
 *   1. process.env.SECRET, if set to a real (non-default) value.
 *   2. A random per-install secret persisted at config/.secret.
 *   3. Freshly generated + persisted on first run.
 *
 * The persisted file lives in the same config dir as users.json/config.json,
 * which is volume-mounted in typical deployments, so the secret is stable across
 * restarts (using the identical __dirname-relative pattern the rest of the
 * backend uses for config paths).
 */

// The public placeholder that used to be the default. Treated as "unset" so an
// install that copied the docker-compose/README placeholder is not left using a
// world-known secret.
const LEGACY_DEFAULT_SECRET = '@jZCgtn^qg8So*^^6A2M';

const SECRET_FILE = path.join(__dirname, '../config/.secret');

function resolveSecret(): string {
    const fromEnv = process.env.SECRET;

    if (fromEnv && fromEnv.trim()) {
        if (fromEnv === LEGACY_DEFAULT_SECRET) {
            console.warn(
                '[secret] SECRET is set to the old public default value. Ignoring it and using a ' +
                'generated per-install secret instead. Unset SECRET (or set a real random value) to silence this.'
            );
        } else {
            return fromEnv;
        }
    }

    // Reuse a previously generated secret if one exists.
    try {
        const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
        if (existing) {
            return existing;
        }
    } catch {
        // File doesn't exist yet — fall through to generate one.
    }

    const generated = crypto.randomBytes(32).toString('hex');
    try {
        fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
        fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
        console.warn(
            '[secret] No SECRET provided — generated a random per-install secret at config/.secret. ' +
            'If you are upgrading an install that used the old default secret, stored service ' +
            'credentials (API keys/passwords) will need to be re-entered.'
        );
    } catch (err) {
        console.error(
            '[secret] Could not persist a generated secret; using an ephemeral secret for this ' +
            'process only. Logins and stored credentials will not survive a restart until this is fixed.',
            err
        );
    }
    return generated;
}

export const SECRET = resolveSecret();
