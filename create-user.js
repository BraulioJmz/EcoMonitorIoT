const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || "Admin";

if (!email || !password) {
  console.log("Uso correcto: node create-user.js <email> <password> [Nombre]");
  console.log("Ejemplo: node create-user.js admin@empresa.com miPassword123 Juan");
  process.exit(1);
}

console.log(`Creando usuario ${email}...`);

fetch("http://localhost:3000/api/auth/sign-up/email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, name })
})
.then(async (res) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("❌ Error al crear usuario:", data?.error?.message || data?.error || res.statusText);
  } else {
    console.log("✅ Usuario creado exitosamente:", data?.user?.email || email);
  }
})
.catch(err => {
  console.error("❌ Error de conexión. Asegúrate de que el servidor (npm run dev) esté corriendo en otra pestaña.");
});
