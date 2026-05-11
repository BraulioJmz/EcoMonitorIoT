import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { validateLogin } from "@/lib/validations";
import { createToken, recordLoginAttempt } from "@/lib/auth";

// Rate limiting mejorado en memoria (fallback)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validar entrada con Zod
    const validation = validateLogin(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Rate limiting básico en memoria
    const now = Date.now();
    const attempts = loginAttempts.get(email);
    
    if (attempts) {
      const timeDiff = now - attempts.lastAttempt;
      const oneHour = 60 * 60 * 1000;
      
      if (timeDiff < oneHour && attempts.count >= 5) {
        await recordLoginAttempt(email, false);
        return NextResponse.json(
          { error: "Demasiados intentos. Intente en 1 hora." },
          { status: 429 }
        );
      }
      
      if (timeDiff >= oneHour) {
        loginAttempts.delete(email);
      }
    }

    // Buscar usuario
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Incrementar intentos fallidos
      const currentAttempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
      loginAttempts.set(email, { count: currentAttempts.count + 1, lastAttempt: now });
      await recordLoginAttempt(email, false);
      
      // No revelar si el usuario existe o no (seguridad)
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const currentAttempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
      loginAttempts.set(email, { count: currentAttempts.count + 1, lastAttempt: now });
      await recordLoginAttempt(email, false);
      
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Login exitoso
    loginAttempts.delete(email);
    await recordLoginAttempt(email, true);

    // Crear token usando la utilidad
    const token = createToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role ?? "user",
    });

    // Crear respuesta con cookie HttpOnly
    const response = NextResponse.json({
      message: "Inicio de sesión exitoso",
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });

    // Configurar cookie HttpOnly segura
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Cambiado de "strict" a "lax" para permitir redirecciones
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}