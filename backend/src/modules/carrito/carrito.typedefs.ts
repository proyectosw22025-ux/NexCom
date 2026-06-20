export const carritoTypeDefs = /* GraphQL */ `
  type ItemCarrito {
    id:             ID!
    producto:       Producto!
    cantidad:       Int!
    precioSnapshot: String!
    subtotal:       String!
  }

  type Carrito {
    id:         ID!
    items:      [ItemCarrito!]!
    total:      String!
    totalItems: Int!
  }

  type ProductoGuardado {
    id:        ID!
    nombre:    String!
    precio:    String!
    stock:     Int!
    activo:    Boolean!
    imagenUrl: String
  }

  extend type Query {
    miCarrito:    Carrito
    misGuardados: [ProductoGuardado!]!
  }

  extend type Mutation {
    agregarAlCarrito(productoId: ID!, cantidad: Int!):     Carrito!
    actualizarCantidad(productoId: ID!, cantidad: Int!):   Carrito!
    eliminarDelCarrito(productoId: ID!):                   Carrito!
    vaciarCarrito:                                         Boolean!
    guardarParaDespues(productoId: ID!):                   Carrito!
    moverAlCarrito(productoId: ID!):                       Carrito!
    quitarGuardado(productoId: ID!):                       Boolean!
  }
`;
