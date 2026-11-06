import React from "react";
import { boxRegions, isJigsawSize, SIZES } from "../shared/engine";

interface SizePickerProps {
  value: number;
  onChange: (size: number) => void;
  disabled?: boolean;
}

// A tiny board drawing: thick lines between boxes, or a jigsaw hint.
const Preview: React.FC<{ size: number }> = ({ size }) => {
  if (isJigsawSize(size)) {
    return <span className="size-preview jigsaw" aria-hidden />;
  }
  const regions = boxRegions(size);
  return (
    <span
      className="size-preview"
      aria-hidden
      style={{ "--n": size } as React.CSSProperties}
    >
      {regions.map((g, cell) => (
        <span
          key={cell}
          className={[
            cell % size < size - 1 && regions[cell + 1] !== g ? "r" : "",
            cell + size < regions.length && regions[cell + size] !== g ? "b" : "",
          ].join(" ")}
        />
      ))}
    </span>
  );
};

const SizePicker: React.FC<SizePickerProps> = ({ value, onChange, disabled }) => (
  <div className="size-picker" role="radiogroup" aria-label="Board size">
    {SIZES.map((size) => (
      <button
        key={size}
        role="radio"
        aria-checked={value === size}
        className={`size-option${value === size ? " selected" : ""}`}
        disabled={disabled && value !== size}
        onClick={() => !disabled && onChange(size)}
      >
        <Preview size={size} />
        <span className="size-name">
          {size}×{size}
        </span>
        <span className="size-desc">
          {isJigsawSize(size) ? "Jigsaw" : size === 9 ? "Classic" : "Boxes"}
        </span>
      </button>
    ))}
  </div>
);

export default SizePicker;
