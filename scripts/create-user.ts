/**
 * CLI-only user creation. There is no public signup route by design —
 * this app is single-operator / invite-only, and this script is the
 * only way to create an account.
 *
 * Usage: pnpm user:create
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/password";

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "O usuário deve ter ao menos 3 caracteres.")
    .max(50)
    .regex(
      /^[a-z0-9_.-]+$/i,
      "Use apenas letras, números, ponto, hífen ou underscore.",
    ),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  console.log("== Criar usuário (fin) ==");
  console.log(
    "Aviso: a senha digitada ficará visível no terminal (ferramenta local, operador único).\n",
  );

  try {
    const username = await rl.question("Usuário: ");
    const email = await rl.question("E-mail: ");
    const password = await rl.question("Senha (mín. 8 caracteres): ");
    const confirm = await rl.question("Confirme a senha: ");

    if (password !== confirm) {
      console.error("\nErro: as senhas não coincidem.");
      process.exitCode = 1;
      return;
    }

    const parsed = createUserSchema.safeParse({ username, email, password });
    if (!parsed.success) {
      console.error("\nErro de validação:");
      for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.message}`);
      }
      process.exitCode = 1;
      return;
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(
        or(
          eq(users.username, parsed.data.username),
          eq(users.email, parsed.data.email),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      console.error("\nErro: já existe um usuário com esse usuário/e-mail.");
      process.exitCode = 1;
      return;
    }

    const passwordHash = hashPassword(parsed.data.password);

    const [created] = await db
      .insert(users)
      .values({
        username: parsed.data.username,
        email: parsed.data.email,
        passwordHash,
      })
      .returning({ id: users.id, username: users.username });

    console.log(`\nUsuário criado com sucesso: ${created.username} (${created.id})`);
  } finally {
    rl.close();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
