import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Home, Package } from "lucide-react";
import { MobileNavDrawer } from "./MobileNavDrawer";

// next/link y usePathname no existen en jsdom → se mockean.
vi.mock("next/navigation", () => ({ usePathname: () => "/vendedor" }));
vi.mock("next/link", () => ({
  // Reenvía todas las props (incluida className) para poder verificar el estado activo.
  default: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) =>
    <a {...props}>{children}</a>,
}));

const nav = [
  { href: "/vendedor",           label: "Panel",        icon: Home },
  { href: "/vendedor/productos", label: "Mis Productos", icon: Package },
];

const base = {
  nav, rootHref: "/vendedor", brandLabel: "Panel Vendedor", brandIcon: Home,
} as const;

describe("MobileNavDrawer", () => {
  it("no renderiza nada cuando está cerrado", () => {
    const { container } = render(
      <MobileNavDrawer open={false} onClose={() => {}} onLogout={() => {}} {...base} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra todos los ítems de navegación cuando está abierto", () => {
    render(<MobileNavDrawer open onClose={() => {}} onLogout={() => {}} {...base} />);
    expect(screen.getByText("Panel")).toBeInTheDocument();
    expect(screen.getByText("Mis Productos")).toBeInTheDocument();
  });

  it("cierra al hacer clic en el fondo (backdrop)", () => {
    const onClose = vi.fn();
    render(<MobileNavDrawer open onClose={onClose} onLogout={() => {}} {...base} />);
    fireEvent.click(screen.getByTestId("drawer-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cierra al tocar un enlace de navegación", () => {
    const onClose = vi.fn();
    render(<MobileNavDrawer open onClose={onClose} onLogout={() => {}} {...base} />);
    fireEvent.click(screen.getByText("Mis Productos"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("al cerrar sesión llama onLogout y cierra el drawer", () => {
    const onClose = vi.fn();
    const onLogout = vi.fn();
    render(<MobileNavDrawer open onClose={onClose} onLogout={onLogout} {...base} />);
    fireEvent.click(screen.getByText("Cerrar sesión"));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("marca activo el ítem de la ruta actual", () => {
    render(<MobileNavDrawer open onClose={() => {}} onLogout={() => {}} {...base} />);
    const activo = screen.getByText("Panel").closest("a")!;
    expect(activo.className).toContain("shadow-sm"); // estilo del ítem activo
  });
});
