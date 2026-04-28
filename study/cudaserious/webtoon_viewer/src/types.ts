export interface ManifestPage {
  globalIndex: number;
  pageIndex: number;
  label: string;
  src: string;
  width: number;
  height: number;
  sourceHash: string;
}

export interface ManifestVolume {
  id: string;
  title: string;
  sourceFile: string;
  pageCount: number;
  sourceHash: string;
  pages: ManifestPage[];
}

export interface Manifest {
  generatedAt: string;
  sourceRoot: string;
  totalPages: number;
  capture: {
    format: "webp";
    quality: number;
    deviceScaleFactor: number;
    theme: "light";
    tint: "default";
    density: "normal";
    cols: "3";
  };
  volumes: ManifestVolume[];
}

