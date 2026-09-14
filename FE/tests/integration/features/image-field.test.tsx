import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ImageField } from "@/components/admin-fields/image-field";

describe("ImageField", () => {
  beforeEach(() => {
    // jsdom does not load images or fire onload
    vi.stubGlobal(
      "Image",
      class {
        width = 800;
        height = 600;
        onload: ((ev: Event) => void) | null = null;
        set src(_val: string) {
          setTimeout(() => {
            this.onload?.(new Event("load"));
          }, 0);
        }
      },
    );
  });

  it("renders the empty upload trigger and label when value is empty", () => {
    const handleChange = vi.fn();
    render(<ImageField label="Cover Photo" value="" onChange={handleChange} />);

    expect(screen.getByText("Cover Photo")).toBeInTheDocument();
    expect(screen.getByText(/Upload an image/i)).toBeInTheDocument();
  });

  it("renders image preview and clear button when value is provided", () => {
    const handleChange = vi.fn();
    const testUrl = "https://example.com/photo.jpg";
    render(<ImageField label="Cover Photo" value={testUrl} onChange={handleChange} />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", testUrl);

    const removeBtn = screen.getByTitle("Remove image");
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);
    expect(handleChange).toHaveBeenCalledWith("");
  });

  it("shows error when a non-image file is selected", async () => {
    const handleChange = vi.fn();
    const { container } = render(<ImageField label="Photo" value="" onChange={handleChange} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const textFile = new File(["dummy text"], "doc.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [textFile] } });

    await waitFor(() => {
      expect(screen.getByText("File must be an image.")).toBeInTheDocument();
    });
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("processes an image file and calls onChange with a data URL", async () => {
    const handleChange = vi.fn();
    const { container } = render(<ImageField label="Photo" value="" onChange={handleChange} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const imgFile = new File(["fake-image-bytes"], "photo.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [imgFile] } });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    });
    const calledWith = handleChange.mock.calls[0][0];
    expect(typeof calledWith).toBe("string");
    expect(calledWith.length).toBeGreaterThan(0);
  });

  it("allows typing/pasting a direct URL into the text input", () => {
    const handleChange = vi.fn();
    render(<ImageField label="Photo" value="" onChange={handleChange} />);

    const urlInput = screen.getByPlaceholderText("https://…");
    fireEvent.change(urlInput, { target: { value: "https://example.com/test.jpg" } });
    expect(handleChange).toHaveBeenCalledWith("https://example.com/test.jpg");
  });
});
