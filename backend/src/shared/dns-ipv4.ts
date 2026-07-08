import dns from "node:dns";

// Fuerza IPv4 primero en TODA resolución DNS del proceso.
//
// Motivo: en contenedores como los de Railway, algunos hosts públicos se
// resuelven a una dirección IPv6 sin ruta de salida funcional. El intento de
// conexión IPv6 falla al instante (ENETUNREACH), rompiendo llamadas a APIs
// externas — de forma 100% reproducible — como `api.stripe.com`, mientras que
// clientes con resolución propia (Prisma/Neon) no se ven afectados.
//
// `ipv4first` reordena los resultados de `dns.lookup` (usado por https/ioredis)
// para preferir registros A (IPv4) sobre AAAA (IPv6), evitando la ruta rota.
// Este módulo se importa PRIMERO en el arranque (los imports se elevan y se
// ejecutan antes de que cualquier otro módulo abra un socket).
dns.setDefaultResultOrder("ipv4first");
console.log(`[boot] DNS result order = ${dns.getDefaultResultOrder()}`);
