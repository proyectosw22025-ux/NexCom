import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("muestra la etiqueta por defecto según la variante", () => {
    render(<Badge variant="pagado" />);
    expect(screen.getByText("Pagado")).toBeInTheDocument();
  });

  it("permite sobreescribir la etiqueta con la prop label", () => {
    render(<Badge variant="pagado" label="Pago confirmado" />);
    expect(screen.getByText("Pago confirmado")).toBeInTheDocument();
    expect(screen.queryByText("Pagado")).not.toBeInTheDocument();
  });

  it("aplica los estilos correspondientes a la variante", () => {
    render(<Badge variant="cancelado" />);
    const badge = screen.getByText("Cancelado");
    expect(badge.className).toContain("bg-red-50");
    expect(badge.className).toContain("text-red-600");
  });

  it("renderiza el punto indicador cuando dot=true", () => {
    const { container } = render(<Badge variant="activo" dot />);
    expect(container.querySelector("span > span")).toBeInTheDocument();
  });

  it("usa clases más pequeñas cuando size='sm'", () => {
    render(<Badge variant="admin" size="sm" />);
    const badge = screen.getByText("Admin");
    expect(badge.className).toContain("text-[10px]");
  });
});
