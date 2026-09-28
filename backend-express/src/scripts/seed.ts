/**
 * Seed de desarrollo.
 *
 * Crea un usuario de prueba con su racha inicializada, para poder probar la
 * app sin pasar por el flujo de registro completo.
 *
 * Uso:
 *   pnpm seed
 *
 * ⚠️ Es idempotente por correo: si `demo@bookteka.com` ya existe, no crea un
 * duplicado ni toca sus datos.
 */
import "dotenv/config";
import { dbPrisma } from "@/config/prisma.js";
import { hashPassword } from "@/modules/auth/application/common/crypto.utils.js";
import { logger } from "@/config/logger.js";
import { signRefreshToken } from "@/modules/auth/application/common/token.utils.js";

const SEED_USER = {
  name: "Usuario Demo",
  email: "demo@bookteka.com",
  password: "DemoPassword123",
};

async function main() {
  const email = SEED_USER.email.toLowerCase();

  const existing = await dbPrisma.user.findFirst({ where: { email } });
  if (existing) {
    logger.info({ email }, "Seed: el usuario ya existe, no se crea nada");
    return;
  }

  const password = await hashPassword(SEED_USER.password);

  const user = await dbPrisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: SEED_USER.name,
        email,
        role: "user",
        email_verified: true,
      },
    });
    await tx.account.create({
      data: {
        account_id: created.id,
        provider_id: "credentials",
        user_id: created.id,
        password,
      },
    });
    await tx.user_streak.create({ data: { userId: created.id } });
    return created;
  });

  // Una sesión activa para poder usar la app sin loguearse dos veces.
  await dbPrisma.session.create({
    data: {
      user_id: user.id,
      token: signRefreshToken(user.id),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip_address: null,
      user_agent: "seed",
    },
  });

  logger.info(
    {
      id: user.id,
      email: user.email,
      password: SEED_USER.password,
    },
    "Seed: usuario creado. Login: POST /api/v1/auth/login",
  );
}

main()
  .catch((err) => {
    logger.error({ err }, "Seed falló");
    process.exit(1);
  })
  .finally(() => dbPrisma.$disconnect());