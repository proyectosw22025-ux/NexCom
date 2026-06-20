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

  enum OrdenProducto {
    RECIENTES
    PRECIO_ASC
    PRECIO_DESC
    MEJOR_VALORADOS
    MAS_VENDIDOS
  }

  extend type Query {
    productos(
      pagina:      Int
      limite:      Int
      categoriaId: ID
      vendedorId:  ID
      soloActivos: Boolean
      orden:       OrdenProducto
      precioMin:   Float
      precioMax:   Float
      ciudad:      String
    ): PaginatedProductos!
    producto(id: ID!):    Producto
    misProductos:         [Producto!]!
    productosRecomendados(productoId: ID!, limite: Int): [Producto!]!
  }

  extend type Mutation {
    crearProducto(input: ProductoInput!):                   Producto!
    actualizarProducto(id: ID!, input: ProductoUpdateInput!): Producto!
    eliminarProducto(id: ID!):                              Boolean!
    toggleDestacado(id: ID!):                               Producto!
    destacarMiProducto(id: ID!):                            Producto!
    agregarImagenes(productoId: ID!, urls: [String!]!):     Producto!
    eliminarImagen(imagenId: ID!):                          Boolean!
  }
`;
