"""Regenerate the committed Windows icons from the Promptbook mark using Pillow."""

from pathlib import Path

from PIL import Image, ImageFilter


def generate():
    """Keep transparent backgrounds and supply native frames for common Windows DPI scales."""
    directory = Path(__file__).resolve().parent
    with Image.open(directory.parents[2] / "design/logo-blue-transparent-1024.png") as logo:
        source = logo.getchannel("A")
    icons = {"promptbook-blue": [], "promptbook-white": [], "promptbook": []}
    sizes = [(size, size) for size in (16, 20, 24, 32, 40, 48, 64, 128, 256)]
    for size in sizes:
        scale = 4
        mask = source.resize((size[0] * scale, size[1] * scale), Image.Resampling.LANCZOS)
        blue = Image.new("RGBA", mask.size, "#17386C")
        blue.putalpha(mask)
        white = Image.new("RGBA", mask.size, "white")
        white.putalpha(mask)
        # An inactive pinned shortcut has one icon for every theme. Outline just the mark.
        border = round(max(0.65, size[0] * 0.025) * scale)
        outline = Image.new("RGBA", mask.size, "white")
        outline.putalpha(mask.filter(ImageFilter.MaxFilter(2 * border + 1)))
        outlined = Image.alpha_composite(outline, blue)
        for name, image in (("promptbook-blue", blue), ("promptbook-white", white), ("promptbook", outlined)):
            icons[name].append(image.resize(size, Image.Resampling.LANCZOS))

    for name, frames in icons.items():
        frames[-1].save(directory / f"{name}.ico", sizes=sizes, append_images=frames[:-1])


if __name__ == "__main__":
    generate()
