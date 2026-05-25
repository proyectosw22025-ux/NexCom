export const productosTypeDefs = /* GraphQL */ `
  type ImagenProducto {
    id:    ID!
    url:   String!
    orden: Int!
  }

  type Producto {
    id:           ID!
    nombre:       String!
    descripcion:  String
    precio:       String!       # Decimal serializado como string
    stock:        Int!
    activo:       Boolean!
    destacado:    Boolean!
    totalVendido: Int!
    creadoEn:     String!
    categoria:    Categoria!
    vendedor:     PerfilVendedorPublico!
    imagenes:     [ImagenProducto!]!
    etiquetas:    [Etiqueta!]!
  }

  type PaginatedProductos {
    items:       [Producto!]!
    total:       Int!
    pagina:      Int!
    totalPaginas: Int!
  }

  input ProductoInput {
    nombre:      String!
    descripcion: String
    precio:      String!
    stock:       Int!
    categoriaId: ID!
    etiquetas:   [String!]
    imagenesUrl: [String!]
  }

  input ProductoUpdateInput {
    nombre:      String
    descripcion: String
    precio:      String
    stock:       Int
    categoriaId: ID
    etiquetas:   [String!]
  }

  extend type Query {
    productos(pagina: Int, limite: Int, categoriaId: ID, soloActivos: Boolean): PaginatedProductos!
    producto(id: ID!):    Producto
    misProductos:         [Producto!]!
  }

  extend type Mutation {
    crearProducto(input: ProductoInput!):                   Producto!
    actualizarProducto(id: ID!, input: ProductoUpdateInput!): Producto!
    eliminarProducto(id: ID!):                              Boolean!
    toggleDestacado(id: ID!):                               Producto!
    agregarImagenes(productoId: ID!, urls: [String!]!):     Producto!
    eliminarImagen(imagenId: ID!):                          Boolean!
  }
`;
