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

  extend type Query {
    miCarrito: Carrito
  }

  extend type Mutation {
    agregarAlCarrito(productoId: ID!, cantidad: Int!):     Carrito!
    actualizarCantidad(productoId: ID!, cantidad: Int!):   Carrito!
    eliminarDelCarrito(productoId: ID!):                   Carrito!
    vaciarCarrito:                                         Boolean!
  }
`;
