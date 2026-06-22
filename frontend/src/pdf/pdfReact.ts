/**
 * Único punto de entrada a react-pdf.
 * Importar Document/Page desde aquí — nunca desde "react-pdf" directo,
 * porque react-pdf pone workerSrc = "pdf.worker.mjs" al cargar.
 */
import { Document, Page, pdfjs } from "react-pdf";
import "./pdfTextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export { Document, Page, pdfjs };
